// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// app/api/agent/liquidations/route.ts
// POST: Liquidar restaurante (pagar créditos acumulados)
// GET: Historial de liquidaciones
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parsePagination, getRestaurantCreditBalance } from '@/lib/credits/helpers';

const VALID_PAYMENT_METHODS = ['yape', 'plin', 'transfer', 'cash'];

// -------------------------------------------------------
// POST: Liquidar restaurante
// -------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth
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

    // Parse body
    const body = await req.json();
    const { restaurant_id, amount_cents, payment_method, proof_url, notes } = body;

    // Validaciones
    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id requerido' }, { status: 400 });
    }

    if (!amount_cents || typeof amount_cents !== 'number' || amount_cents <= 0) {
      return NextResponse.json({ error: 'Monto debe ser positivo' }, { status: 400 });
    }

    if (!payment_method || !VALID_PAYMENT_METHODS.includes(payment_method)) {
      return NextResponse.json(
        { error: `Método de pago inválido. Válidos: ${VALID_PAYMENT_METHODS.join(', ')}` },
        { status: 400 }
      );
    }

    // REGLA #12: proof_url obligatoria para montos > S/50
    if (amount_cents > 5000 && !proof_url) {
      return NextResponse.json(
        { error: 'Foto de comprobante obligatoria para liquidaciones > S/50.00' },
        { status: 400 }
      );
    }

    // Verificar que el restaurante existe
    const { data: restaurant, error: restErr } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurant_id)
      .single();

    if (restErr || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    // Verificar saldo suficiente
    const restCredits = await getRestaurantCreditBalance(supabase, restaurant_id);
    if (!restCredits) {
      return NextResponse.json({ error: 'Sin registro de créditos para este restaurante' }, { status: 404 });
    }

    if (restCredits.balance_cents < amount_cents) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Disponible: ${(restCredits.balance_cents / 100).toFixed(2)}` },
        { status: 400 }
      );
    }

    // REGLA #10: Verificar que NO existe liquidación para hoy
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { data: existing } = await supabase
      .from('restaurant_liquidations')
      .select('id')
      .eq('restaurant_id', restaurant_id)
      .eq('date', today)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una liquidación para este restaurante hoy. Máximo 1 por día.' },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // Transacción: liquidar
    // -------------------------------------------------------

    const creditsBefore = restCredits.balance_cents;
    const newBalance = creditsBefore - amount_cents;

    // 1. Insertar liquidación
    const { data: liquidation, error: liqErr } = await supabase
      .from('restaurant_liquidations')
      .insert({
        restaurant_id,
        date: today,
        amount_cents,
        credits_before: creditsBefore,
        payment_method,
        proof_url: proof_url || null,
        liquidated_by: user.id,
        notes: notes || null,
      })
      .select('id, date, amount_cents, payment_method, created_at')
      .single();

    if (liqErr) {
      return NextResponse.json({ error: `Error creando liquidación: ${liqErr.message}` }, { status: 500 });
    }

    // 2. Actualizar saldo restaurante
    const { error: updateErr } = await supabase
      .from('restaurant_credits')
      .update({
        balance_cents: newBalance,
        total_liquidated_cents: restCredits.total_liquidated_cents + amount_cents,
      })
      .eq('restaurant_id', restaurant_id);

    if (updateErr) {
      // Intentar rollback de la liquidación
      await supabase.from('restaurant_liquidations').delete().eq('id', liquidation.id);
      return NextResponse.json({ error: 'Error actualizando saldo' }, { status: 500 });
    }

    // 3. Insertar transacción
    await supabase.from('credit_transactions').insert({
      entity_type: 'restaurant',
      entity_id: restaurant_id,
      transaction_type: 'liquidation',
      amount_cents: -amount_cents,
      balance_before_cents: creditsBefore,
      balance_after_cents: newBalance,
      notes: `Liquidación ${today} - ${payment_method}${notes ? ': ' + notes : ''}`,
      created_by: user.id,
    });

    return NextResponse.json({
      ...liquidation,
      new_balance_cents: newBalance,
      restaurant_name: restaurant.name,
    }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/agent/liquidations error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// -------------------------------------------------------
// GET: Historial de liquidaciones
// -------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth
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

    // Params
    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = parsePagination(searchParams);
    const restaurantId = searchParams.get('restaurant_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Query
    let query = supabase
      .from('restaurant_liquidations')
      .select('id, restaurant_id, date, amount_cents, credits_before, payment_method, proof_url, liquidated_by, notes, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (restaurantId) query = query.eq('restaurant_id', restaurantId);
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data: liquidations, error: queryErr, count } = await query;

    if (queryErr) {
      return NextResponse.json({ error: 'Error al consultar liquidaciones' }, { status: 500 });
    }

    // Aplanar: obtener nombres
    const flatLiquidations = [];
    if (liquidations && liquidations.length > 0) {
      const restIds = [...new Set(liquidations.map(l => l.restaurant_id))];
      const userIds = [...new Set(liquidations.map(l => l.liquidated_by))];

      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, name')
        .in('id', restIds);

      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);

      const restMap: Record<string, string> = {};
      const userMap: Record<string, string> = {};

      if (restaurants) restaurants.forEach(r => { restMap[r.id] = r.name; });
      if (users) users.forEach(u => { userMap[u.id] = u.name; });

      for (const liq of liquidations) {
        flatLiquidations.push({
          ...liq,
          restaurant_name: restMap[liq.restaurant_id] || null,
          liquidated_by_name: userMap[liq.liquidated_by] || null,
        });
      }
    }

    return NextResponse.json({
      data: flatLiquidations,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[API] GET /api/agent/liquidations error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
