// ============================================================
// POST /api/orders/confirm — Confirmar pedido vía token
// Idempotente: si ya está confirmado, retorna success
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token requerido' },
        { status: 400 },
      );
    }

    // Buscar orden por token
    const { data: order, error: findError } = await supabaseAdmin
      .from('orders')
      .select('id, code, status, confirmation_expires_at')
      .eq('confirmation_token', token)
      .single();

    if (findError || !order) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 },
      );
    }

    // Idempotente: si ya avanzó, retornar success
    const confirmedStatuses = [
      'pending_confirmation', 'confirmed', 'preparing', 'ready',
      'assigned_rider', 'picked_up', 'in_transit', 'delivered',
    ];

    if (confirmedStatuses.includes(order.status)) {
      return NextResponse.json({
        success: true,
        order_code: order.code,
        redirect_url: `/pedido/${order.code}`,
        already_confirmed: true,
      });
    }

    // Verificar cancelado/rechazado
    if (order.status === 'cancelled' || order.status === 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Este pedido fue cancelado' },
        { status: 400 },
      );
    }

    // Verificar estado correcto
    if (order.status !== 'awaiting_confirmation') {
      return NextResponse.json(
        { success: false, error: 'Estado de pedido inválido para confirmación' },
        { status: 400 },
      );
    }

    // Verificar expiración
    if (order.confirmation_expires_at) {
      const expiresAt = new Date(order.confirmation_expires_at).getTime();
      if (Date.now() > expiresAt) {
        return NextResponse.json(
          { success: false, error: 'expired', order_code: order.code },
          { status: 410 },
        );
      }
    }

    // Actualizar estado
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'pending_confirmation' })
      .eq('id', order.id);

    if (updateError) {
      console.error('Error confirming order:', updateError);
      return NextResponse.json(
        { success: false, error: 'Error confirmando el pedido' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      order_code: order.code,
      redirect_url: `/pedido/${order.code}`,
    });
  } catch (error) {
    console.error('Confirm order error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
