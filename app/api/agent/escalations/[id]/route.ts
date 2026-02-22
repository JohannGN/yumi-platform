import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id, is_active')
      .eq('id', user.id)
      .single();

    if (!userData || !userData.is_active || !AGENT_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch escalation
    const { data: escalation, error: escError } = await serviceClient
      .from('support_escalations')
      .select('*')
      .eq('id', id)
      .single();

    if (escError || !escalation) {
      return NextResponse.json({ error: 'Escalación no encontrada' }, { status: 404 });
    }

    // Validate city access if there's a related order
    if (escalation.related_order_id) {
      const { data: order } = await serviceClient
        .from('orders')
        .select('city_id')
        .eq('id', escalation.related_order_id)
        .single();

      if (order) {
        if (userData.role === 'city_admin' && userData.city_id !== order.city_id) {
          return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
        }
        if (userData.role === 'agent') {
          const { data: ac } = await supabase
            .from('agent_cities')
            .select('id')
            .eq('user_id', user.id)
            .eq('city_id', order.city_id)
            .limit(1);

          if (!ac || ac.length === 0) {
            return NextResponse.json({ error: 'Sin acceso a esta ciudad' }, { status: 403 });
          }
        }
      }
    }

    // Parse update body
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.status && ['pending', 'in_progress', 'resolved'].includes(body.status)) {
      updates.status = body.status;
      if (body.status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
    }

    if (body.resolution_notes !== undefined) {
      updates.resolution_notes = body.resolution_notes;
    }

    if (body.assigned_to_user_id !== undefined) {
      updates.assigned_to_user_id = body.assigned_to_user_id;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('support_escalations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
