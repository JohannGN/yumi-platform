// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// app/api/agent/riders/[id]/credits/route.ts
// GET: Saldo + historial + resumen turno de un rider específico
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: riderId } = await params;
    const supabase = await createServerSupabaseClient();

    // Auth: verificar agente/admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!userData || !['owner', 'city_admin', 'agent'].includes(userData.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener rider con datos de usuario
    const { data: rider, error: riderErr } = await supabase
      .from('riders')
      .select('id, user_id, pay_type, commission_percentage, shift_started_at, shift_ended_at')
      .eq('id', riderId)
      .single();

    if (riderErr || !rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    // Nombre del rider
    const { data: riderUser } = await supabase
      .from('users')
      .select('name, phone')
      .eq('id', rider.user_id)
      .single();

    // Si es fixed_salary
    if (rider.pay_type === 'fixed_salary') {
      return NextResponse.json({
        rider_id: riderId,
        rider_name: riderUser?.name || null,
        rider_phone: riderUser?.phone || null,
        pay_type: 'fixed_salary',
        balance_cents: null,
        status: 'not_applicable',
        recent_transactions: [],
        shift_summary: null,
      });
    }

    // Obtener créditos
    const { data: credits } = await supabase
      .from('rider_credits')
      .select('balance_cents, total_deposited_cents, total_spent_cents')
      .eq('rider_id', riderId)
      .single();

    const balanceCents = credits?.balance_cents ?? 0;
    let status: string;
    if (balanceCents >= 15000) status = 'healthy';
    else if (balanceCents >= 10000) status = 'warning';
    else status = 'critical';

    // Últimas 20 transacciones
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('id, transaction_type, amount_cents, balance_before_cents, balance_after_cents, notes, order_id, recharge_code_id, created_at')
      .eq('entity_type', 'rider')
      .eq('entity_id', riderId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Resumen turno activo
    let shiftSummary = null;

    if (rider.shift_started_at && !rider.shift_ended_at) {
      const { data: shiftOrders } = await supabase
        .from('orders')
        .select('id, total_cents, delivery_fee_cents, actual_payment_method, payment_method, rider_delivery_commission_cents')
        .eq('rider_id', riderId)
        .eq('status', 'delivered')
        .gte('delivered_at', rider.shift_started_at);

      if (shiftOrders && shiftOrders.length > 0) {
        let cashCollected = 0;
        let digitalCollected = 0;
        let earnings = 0;

        for (const o of shiftOrders) {
          const method = o.actual_payment_method || o.payment_method;
          if (method === 'cash') {
            cashCollected += o.total_cents;
          } else {
            digitalCollected += o.total_cents;
          }
          earnings += o.rider_delivery_commission_cents || 0;
        }

        // Créditos gastados este turno
        const { data: shiftTx } = await supabase
          .from('credit_transactions')
          .select('amount_cents')
          .eq('entity_type', 'rider')
          .eq('entity_id', riderId)
          .in('transaction_type', ['order_food_debit', 'order_commission_debit'])
          .gte('created_at', rider.shift_started_at);

        const creditsSpent = shiftTx
          ? shiftTx.reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0)
          : 0;

        shiftSummary = {
          deliveries: shiftOrders.length,
          cash_collected_cents: cashCollected,
          digital_collected_cents: digitalCollected,
          credits_spent_cents: creditsSpent,
          earnings_cents: earnings,
          shift_started_at: rider.shift_started_at,
        };
      }
    }

    return NextResponse.json({
      rider_id: riderId,
      rider_name: riderUser?.name || null,
      rider_phone: riderUser?.phone || null,
      pay_type: rider.pay_type,
      commission_percentage: rider.commission_percentage,
      balance_cents: balanceCents,
      total_deposited_cents: credits?.total_deposited_cents ?? 0,
      total_spent_cents: credits?.total_spent_cents ?? 0,
      status,
      can_receive_cash_orders: balanceCents >= 10000,
      recent_transactions: transactions || [],
      shift_summary: shiftSummary,
    });
  } catch (err) {
    console.error('[API] GET /api/agent/riders/[id]/credits error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
