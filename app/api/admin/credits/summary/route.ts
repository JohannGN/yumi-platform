// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// app/api/admin/credits/summary/route.ts
// GET: Dashboard resumen de créditos (riders + restaurantes)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth: owner o city_admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, city_id')
      .eq('id', user.id)
      .single();

    if (!userData || !['owner', 'city_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // -------------------------------------------------------
    // Totales riders
    // -------------------------------------------------------
    const { data: riderCredits } = await supabase
      .from('rider_credits')
      .select('balance_cents, rider_id');

    const totalRiderCreditsCents = riderCredits
      ? riderCredits.reduce((sum, rc) => sum + rc.balance_cents, 0)
      : 0;

    // Riders bajo mínimo y en warning
    const ridersBelowMinimum = riderCredits
      ? riderCredits.filter(rc => rc.balance_cents < 10000).length
      : 0;

    const ridersInWarning = riderCredits
      ? riderCredits.filter(rc => rc.balance_cents >= 10000 && rc.balance_cents < 15000).length
      : 0;

    // -------------------------------------------------------
    // Totales restaurantes
    // -------------------------------------------------------
    const { data: restCredits } = await supabase
      .from('restaurant_credits')
      .select('balance_cents');

    const totalRestaurantCreditsCents = restCredits
      ? restCredits.reduce((sum, rc) => sum + rc.balance_cents, 0)
      : 0;

    // -------------------------------------------------------
    // Códigos pendientes
    // -------------------------------------------------------
    const { count: pendingCodes } = await supabase
      .from('recharge_codes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    // -------------------------------------------------------
    // Hoy: recargas y liquidaciones
    // -------------------------------------------------------
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    // Recargas de hoy
    const { data: todayRecharges } = await supabase
      .from('credit_transactions')
      .select('amount_cents')
      .eq('entity_type', 'rider')
      .eq('transaction_type', 'recharge')
      .gte('created_at', todayISO);

    const todayRechargesCents = todayRecharges
      ? todayRecharges.reduce((sum, tx) => sum + tx.amount_cents, 0)
      : 0;

    // Liquidaciones de hoy
    const { data: todayLiquidations } = await supabase
      .from('restaurant_liquidations')
      .select('amount_cents')
      .eq('date', todayStart.toISOString().split('T')[0]);

    const todayLiquidationsCents = todayLiquidations
      ? todayLiquidations.reduce((sum, l) => sum + l.amount_cents, 0)
      : 0;

    return NextResponse.json({
      total_rider_credits_cents: totalRiderCreditsCents,
      total_restaurant_credits_cents: totalRestaurantCreditsCents,
      pending_recharge_codes: pendingCodes || 0,
      today_recharges_cents: todayRechargesCents,
      today_liquidations_cents: todayLiquidationsCents,
      riders_below_minimum: ridersBelowMinimum,
      riders_in_warning: ridersInWarning,
    });
  } catch (err) {
    console.error('[API] GET /api/admin/credits/summary error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
