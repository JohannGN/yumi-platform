// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// app/api/restaurant/credits/route.ts
// GET: Saldo + historial liquidaciones del restaurante
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener restaurante del owner
    const { data: restaurant, error: restErr } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('owner_id', user.id)
      .single();

    if (restErr || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    // Obtener créditos
    const { data: credits } = await supabase
      .from('restaurant_credits')
      .select('balance_cents, total_earned_cents, total_liquidated_cents')
      .eq('restaurant_id', restaurant.id)
      .single();

    // Últimas 10 transacciones
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('id, transaction_type, amount_cents, balance_after_cents, notes, order_id, created_at')
      .eq('entity_type', 'restaurant')
      .eq('entity_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Última liquidación
    const { data: lastLiquidation } = await supabase
      .from('restaurant_liquidations')
      .select('id, date, amount_cents, payment_method, proof_url, created_at')
      .eq('restaurant_id', restaurant.id)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      balance_cents: credits?.balance_cents ?? 0,
      total_earned_cents: credits?.total_earned_cents ?? 0,
      total_liquidated_cents: credits?.total_liquidated_cents ?? 0,
      recent_transactions: transactions || [],
      last_liquidation: lastLiquidation || null,
    });
  } catch (err) {
    console.error('[API] GET /api/restaurant/credits error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
