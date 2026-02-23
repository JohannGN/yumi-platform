// ============================================================
// GET/PUT /api/admin/agents/[id]/permissions — Permisos de agente
// Chat: AGENTE-3
// Solo owner/city_admin pueden editar
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['owner', 'city_admin'];

const DEFAULT_PERMISSIONS = {
  can_cancel_orders: true,
  can_toggle_restaurants: true,
  can_manage_menu_global: true,
  can_disable_menu_items: true,
  can_view_riders: true,
  can_create_orders: true,
  can_manage_escalations: true,
  can_view_finance_daily: true,
  can_view_finance_weekly: true,
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !ADMIN_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const sc = createServiceRoleClient();
    const { data } = await sc
      .from('agent_permissions')
      .select('permissions, updated_at')
      .eq('user_id', agentId)
      .single();

    return NextResponse.json({
      permissions: data ? { ...DEFAULT_PERMISSIONS, ...data.permissions } : { ...DEFAULT_PERMISSIONS },
      updated_at: data?.updated_at ?? null,
    });
  } catch (err) {
    console.error('[admin/agents/permissions GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !ADMIN_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { permissions } = body;

    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json({ error: 'permissions requerido' }, { status: 400 });
    }

    const sc = createServiceRoleClient();

    // Check if record exists
    const { data: existing } = await sc
      .from('agent_permissions')
      .select('id, permissions')
      .eq('user_id', agentId)
      .single();

    const merged = { ...DEFAULT_PERMISSIONS, ...(existing?.permissions ?? {}), ...permissions };

    if (existing) {
      // Update
      const { error } = await sc
        .from('agent_permissions')
        .update({
          permissions: merged,
          updated_by: user.id,
        })
        .eq('user_id', agentId);

      if (error) {
        console.error('[admin/agents/permissions PUT]', error);
        return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
      }
    } else {
      // Create
      const { error } = await sc
        .from('agent_permissions')
        .insert({
          user_id: agentId,
          permissions: merged,
          updated_by: user.id,
        });

      if (error) {
        console.error('[admin/agents/permissions PUT insert]', error);
        return NextResponse.json({ error: 'Error al crear' }, { status: 500 });
      }
    }

    return NextResponse.json({ permissions: merged });
  } catch (err) {
    console.error('[admin/agents/permissions PUT]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
