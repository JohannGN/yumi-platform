// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// app/api/admin/credits/adjustment/route.ts
// POST: Ajuste manual de créditos (solo owner)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getRiderCreditBalance, getRestaurantCreditBalance } from '@/lib/credits/helpers';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth: SOLO owner
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    // REGLA #11: Solo owner puede hacer ajustes manuales
    if (!userData || userData.role !== 'owner') {
      return NextResponse.json({ error: 'Solo el owner puede hacer ajustes manuales' }, { status: 403 });
    }

    // Parse body
    const body = await req.json();
    const { entity_type, entity_id, amount_cents, notes } = body;

    // Validaciones
    if (!entity_type || !['rider', 'restaurant'].includes(entity_type)) {
      return NextResponse.json({ error: 'entity_type debe ser "rider" o "restaurant"' }, { status: 400 });
    }

    if (!entity_id) {
      return NextResponse.json({ error: 'entity_id requerido' }, { status: 400 });
    }

    if (!amount_cents || typeof amount_cents !== 'number' || amount_cents === 0) {
      return NextResponse.json({ error: 'amount_cents debe ser distinto de 0' }, { status: 400 });
    }

    if (!notes || notes.trim().length < 5) {
      return NextResponse.json({ error: 'Nota requerida (mínimo 5 caracteres)' }, { status: 400 });
    }

    // -------------------------------------------------------
    // Ajuste para RIDER
    // -------------------------------------------------------
    if (entity_type === 'rider') {
      // Verificar que existe y es comisión
      const { data: rider } = await supabase
        .from('riders')
        .select('id, pay_type')
        .eq('id', entity_id)
        .single();

      if (!rider) {
        return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
      }

      if (rider.pay_type !== 'commission') {
        return NextResponse.json({ error: 'Solo riders de comisión usan créditos' }, { status: 400 });
      }

      const currentCredits = await getRiderCreditBalance(supabase, entity_id);
      if (!currentCredits) {
        return NextResponse.json({ error: 'Registro de créditos no encontrado' }, { status: 404 });
      }

      // Si se quita más de lo disponible → error
      if (amount_cents < 0 && currentCredits.balance_cents < Math.abs(amount_cents)) {
        return NextResponse.json(
          { error: `Saldo insuficiente. Disponible: ${(currentCredits.balance_cents / 100).toFixed(2)}` },
          { status: 400 }
        );
      }

      const newBalance = currentCredits.balance_cents + amount_cents;

      // Actualizar
      const updatePayload: Record<string, number> = { balance_cents: newBalance };
      if (amount_cents > 0) {
        updatePayload.total_deposited_cents = currentCredits.total_deposited_cents + amount_cents;
      } else {
        updatePayload.total_spent_cents = currentCredits.total_spent_cents + Math.abs(amount_cents);
      }

      const { error: updateErr } = await supabase
        .from('rider_credits')
        .update(updatePayload)
        .eq('rider_id', entity_id);

      if (updateErr) {
        return NextResponse.json({ error: 'Error actualizando saldo' }, { status: 500 });
      }

      // Transacción
      await supabase.from('credit_transactions').insert({
        entity_type: 'rider',
        entity_id,
        transaction_type: 'adjustment',
        amount_cents,
        balance_before_cents: currentCredits.balance_cents,
        balance_after_cents: newBalance,
        notes: notes.trim(),
        created_by: user.id,
      });

      return NextResponse.json({
        success: true,
        entity_type: 'rider',
        entity_id,
        amount_cents,
        new_balance_cents: newBalance,
      });
    }

    // -------------------------------------------------------
    // Ajuste para RESTAURANTE
    // -------------------------------------------------------
    if (entity_type === 'restaurant') {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('id', entity_id)
        .single();

      if (!restaurant) {
        return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
      }

      const currentCredits = await getRestaurantCreditBalance(supabase, entity_id);
      if (!currentCredits) {
        return NextResponse.json({ error: 'Registro de créditos no encontrado' }, { status: 404 });
      }

      if (amount_cents < 0 && currentCredits.balance_cents < Math.abs(amount_cents)) {
        return NextResponse.json(
          { error: `Saldo insuficiente. Disponible: ${(currentCredits.balance_cents / 100).toFixed(2)}` },
          { status: 400 }
        );
      }

      const newBalance = currentCredits.balance_cents + amount_cents;

      const updatePayload: Record<string, number> = { balance_cents: newBalance };
      if (amount_cents > 0) {
        updatePayload.total_earned_cents = currentCredits.total_earned_cents + amount_cents;
      } else {
        updatePayload.total_liquidated_cents = currentCredits.total_liquidated_cents + Math.abs(amount_cents);
      }

      const { error: updateErr } = await supabase
        .from('restaurant_credits')
        .update(updatePayload)
        .eq('restaurant_id', entity_id);

      if (updateErr) {
        return NextResponse.json({ error: 'Error actualizando saldo' }, { status: 500 });
      }

      // Transacción
      await supabase.from('credit_transactions').insert({
        entity_type: 'restaurant',
        entity_id,
        transaction_type: 'adjustment',
        amount_cents,
        balance_before_cents: currentCredits.balance_cents,
        balance_after_cents: newBalance,
        notes: notes.trim(),
        created_by: user.id,
      });

      return NextResponse.json({
        success: true,
        entity_type: 'restaurant',
        entity_id,
        amount_cents,
        new_balance_cents: newBalance,
      });
    }

    return NextResponse.json({ error: 'entity_type inválido' }, { status: 400 });
  } catch (err) {
    console.error('[API] POST /api/admin/credits/adjustment error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
