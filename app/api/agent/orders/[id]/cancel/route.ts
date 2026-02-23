// ============================================================
// POST /api/agent/orders/[id]/cancel — Cancelar pedido
// Chat: AGENTE-3
// Libera rider si estaba asignado
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { checkAgentPermission } from '@/lib/agent-permissions';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

const CANCELLABLE_STATUSES = [
  'awaiting_confirmation',
  'pending_confirmation',
  'confirmed',
  'preparing',
  'ready',
  'assigned_rider',
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !AGENT_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Check permission
    const canCancel = await checkAgentPermission(user.id, userData.role, 'can_cancel_orders');
    if (!canCancel) {
      return NextResponse.json({ error: 'No tienes permiso para cancelar pedidos' }, { status: 403 });
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Motivo de cancelación requerido' }, { status: 400 });
    }

    const sc = createServiceRoleClient();

    // Get order
    const { data: order } = await sc
      .from('orders')
      .select('id, status, rider_id, code')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return NextResponse.json({
        error: `No se puede cancelar un pedido en estado "${order.status}"`,
      }, { status: 400 });
    }

    // Cancel order
    const { data: updated, error: updateError } = await sc
      .from('orders')
      .update({
        status: 'cancelled',
        rejection_notes: `[Agente] ${reason.trim()}`,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('[agent/orders/cancel POST]', updateError);
      return NextResponse.json({ error: 'Error al cancelar' }, { status: 500 });
    }

    // Free rider if assigned
    if (order.rider_id) {
      await sc
        .from('riders')
        .update({ is_available: true, current_order_id: null })
        .eq('id', order.rider_id);
    }

    // Log in status history
    await sc.from('order_status_history').insert({
      order_id: orderId,
      from_status: order.status,
      to_status: 'cancelled',
      changed_by_user_id: user.id,
      notes: `Cancelado por agente: ${reason.trim()}`,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[agent/orders/cancel POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
