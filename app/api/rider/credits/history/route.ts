// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// app/api/rider/credits/history/route.ts
// GET: Historial de transacciones del rider (paginado)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parsePagination } from '@/lib/credits/helpers';

export async function GET(req: NextRequest) {
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

    // Si es fixed_salary, retornar vacío
    if (rider.pay_type === 'fixed_salary') {
      return NextResponse.json({ data: [], total: 0, page: 1, limit: 20 });
    }

    // Params
    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = parsePagination(searchParams);
    const typeFilter = searchParams.get('type');

    // Query base
    let query = supabase
      .from('credit_transactions')
      .select('id, transaction_type, amount_cents, balance_before_cents, balance_after_cents, notes, order_id, recharge_code_id, created_at', { count: 'exact' })
      .eq('entity_type', 'rider')
      .eq('entity_id', rider.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtro por tipo
    if (typeFilter && typeFilter !== 'all') {
      query = query.eq('transaction_type', typeFilter);
    }

    const { data: transactions, error: txError, count } = await query;

    if (txError) {
      return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
    }

    return NextResponse.json({
      data: transactions || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[API] GET /api/rider/credits/history error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
