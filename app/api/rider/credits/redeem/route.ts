// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// app/api/rider/credits/redeem/route.ts
// POST: Canjear código de recarga de créditos
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener rider
    const { data: rider, error: riderError } = await supabase
      .from('riders')
      .select('id, pay_type')
      .eq('user_id', user.id)
      .single();

    if (riderError || !rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    // Solo riders comisión pueden canjear códigos
    if (rider.pay_type !== 'commission') {
      return NextResponse.json(
        { error: 'Riders de sueldo fijo no usan créditos' },
        { status: 400 }
      );
    }

    // Parse body
    const body = await req.json();
    const rawCode = body.code;

    if (!rawCode || typeof rawCode !== 'string') {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
    }

    // Normalizar: uppercase, trim, quitar espacios internos
    const normalizedCode = rawCode.toUpperCase().trim().replace(/\s/g, '');

    if (normalizedCode.length !== 8) {
      return NextResponse.json({ error: 'Código inválido (debe ser de 8 caracteres)' }, { status: 400 });
    }

    // -------------------------------------------------------
    // Buscar código pendiente
    // -------------------------------------------------------
    const { data: rechargeCode, error: codeError } = await supabase
      .from('recharge_codes')
      .select('id, code, amount_cents, status, intended_rider_id')
      .eq('code', normalizedCode)
      .single();

    if (codeError || !rechargeCode) {
      return NextResponse.json({ error: 'Código no encontrado' }, { status: 400 });
    }

    if (rechargeCode.status === 'redeemed') {
      return NextResponse.json({ error: 'Este código ya fue canjeado' }, { status: 400 });
    }

    if (rechargeCode.status === 'voided') {
      return NextResponse.json({ error: 'Este código fue anulado' }, { status: 400 });
    }

    // Verificar si el código es para un rider específico
    if (rechargeCode.intended_rider_id && rechargeCode.intended_rider_id !== rider.id) {
      return NextResponse.json(
        { error: 'Este código está asignado a otro rider' },
        { status: 403 }
      );
    }

    // -------------------------------------------------------
    // Transacción atómica: canjear código
    // -------------------------------------------------------

    // 1. Leer saldo actual
    const { data: currentCredits, error: creditsError } = await supabase
      .from('rider_credits')
      .select('balance_cents, total_deposited_cents')
      .eq('rider_id', rider.id)
      .single();

    if (creditsError || !currentCredits) {
      return NextResponse.json({ error: 'Registro de créditos no encontrado' }, { status: 404 });
    }

    const currentBalance = currentCredits.balance_cents;
    const newBalance = currentBalance + rechargeCode.amount_cents;

    // 2. Marcar código como canjeado
    const { error: redeemError } = await supabase
      .from('recharge_codes')
      .update({
        status: 'redeemed',
        redeemed_by: rider.id,
        redeemed_at: new Date().toISOString(),
      })
      .eq('id', rechargeCode.id)
      .eq('status', 'pending'); // Doble check: solo si sigue pending

    if (redeemError) {
      return NextResponse.json(
        { error: 'Error al canjear código. Intente nuevamente.' },
        { status: 500 }
      );
    }

    // 3. Actualizar saldo rider
    const { error: updateError } = await supabase
      .from('rider_credits')
      .update({
        balance_cents: newBalance,
        total_deposited_cents: currentCredits.total_deposited_cents + rechargeCode.amount_cents,
      })
      .eq('rider_id', rider.id);

    if (updateError) {
      // Rollback: volver a poner el código como pending
      await supabase
        .from('recharge_codes')
        .update({ status: 'pending', redeemed_by: null, redeemed_at: null })
        .eq('id', rechargeCode.id);

      return NextResponse.json({ error: 'Error al actualizar saldo' }, { status: 500 });
    }

    // 4. Insertar transacción
    await supabase.from('credit_transactions').insert({
      entity_type: 'rider',
      entity_id: rider.id,
      recharge_code_id: rechargeCode.id,
      transaction_type: 'recharge',
      amount_cents: rechargeCode.amount_cents,
      balance_before_cents: currentBalance,
      balance_after_cents: newBalance,
      notes: `Recarga con código ${normalizedCode}`,
    });

    return NextResponse.json({
      success: true,
      amount_cents: rechargeCode.amount_cents,
      new_balance_cents: newBalance,
      code: normalizedCode,
    });
  } catch (err) {
    console.error('[API] POST /api/rider/credits/redeem error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
