// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// app/api/rider/credits/route.ts
// GET: Saldo, resumen turno, historial reciente del rider
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth: obtener usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener rider del usuario
    const { data: rider, error: riderError } = await supabase
      .from('riders')
      .select('id, pay_type, commission_percentage, shift_started_at, shift_ended_at')
      .eq('user_id', user.id)
      .single();

    if (riderError || !rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    // -------------------------------------------------------
    // Rider de sueldo fijo: NO usa créditos
    // -------------------------------------------------------
    if (rider.pay_type === 'fixed_salary') {
      return NextResponse.json({
        balance_cents: null,
        total_deposited_cents: null,
        total_spent_cents: null,
        status: 'not_applicable',
        can_receive_cash_orders: true,
        recent_transactions: [],
        shift_summary: null,
      });
    }

    // -------------------------------------------------------
    // Rider comisión: datos reales de créditos
    // -------------------------------------------------------
    const { data: credits, error: creditsError } = await supabase
      .from('rider_credits')
      .select('balance_cents, total_deposited_cents, total_spent_cents')
      .eq('rider_id', rider.id)
      .single();

    if (creditsError || !credits) {
      // Si no existe el registro, retornar zeros
      return NextResponse.json({
        balance_cents: 0,
        total_deposited_cents: 0,
        total_spent_cents: 0,
        status: 'critical',
        can_receive_cash_orders: false,
        recent_transactions: [],
        shift_summary: null,
      });
    }

    // Determinar status según thresholds
    const balanceCents = credits.balance_cents;
    let status: string;
    let canReceiveCash: boolean;

    if (balanceCents >= 15000) {
      status = 'healthy';
      canReceiveCash = true;
    } else if (balanceCents >= 10000) {
      status = 'warning';
      canReceiveCash = true;
    } else {
      status = 'critical';
      canReceiveCash = false;
    }

    // Últimas 10 transacciones
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('id, transaction_type, amount_cents, balance_after_cents, notes, created_at, order_id')
      .eq('entity_type', 'rider')
      .eq('entity_id', rider.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Resumen de turno activo (si tiene turno abierto)
    let shiftSummary = null;

    if (rider.shift_started_at && !rider.shift_ended_at) {
      // Pedidos del turno actual
      const { data: shiftOrders } = await supabase
        .from('orders')
        .select('id, subtotal_cents, delivery_fee_cents, total_cents, actual_payment_method, payment_method, status')
        .eq('rider_id', rider.id)
        .eq('status', 'delivered')
        .gte('delivered_at', rider.shift_started_at)
        .order('delivered_at', { ascending: false });

      if (shiftOrders && shiftOrders.length > 0) {
        let cashCollected = 0;
        let creditsSpent = 0;

        for (const so of shiftOrders) {
          const method = so.actual_payment_method || so.payment_method;
          if (method === 'cash') {
            cashCollected += so.total_cents;
          }
        }

        // Transacciones de créditos del turno
        const { data: shiftTx } = await supabase
          .from('credit_transactions')
          .select('amount_cents, transaction_type')
          .eq('entity_type', 'rider')
          .eq('entity_id', rider.id)
          .in('transaction_type', ['order_food_debit', 'order_commission_debit'])
          .gte('created_at', rider.shift_started_at);

        if (shiftTx) {
          creditsSpent = shiftTx.reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);
        }

        // Earnings: lo que el rider se queda (delivery fee portion)
        const { data: riderDeliveryOrders } = await supabase
          .from('orders')
          .select('rider_delivery_commission_cents')
          .eq('rider_id', rider.id)
          .eq('status', 'delivered')
          .gte('delivered_at', rider.shift_started_at);

        const earnings = riderDeliveryOrders
          ? riderDeliveryOrders.reduce((sum, o) => sum + (o.rider_delivery_commission_cents || 0), 0)
          : 0;

        shiftSummary = {
          deliveries: shiftOrders.length,
          cash_collected_cents: cashCollected,
          credits_spent_cents: creditsSpent,
          earnings_cents: earnings,
        };
      }
    }

    return NextResponse.json({
      balance_cents: balanceCents,
      total_deposited_cents: credits.total_deposited_cents,
      total_spent_cents: credits.total_spent_cents,
      status,
      can_receive_cash_orders: canReceiveCash,
      recent_transactions: transactions || [],
      shift_summary: shiftSummary,
    });
  } catch (err) {
    console.error('[API] GET /api/rider/credits error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
