// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// app/api/agent/recharge-codes/route.ts
// POST: Generar código de recarga
// GET: Listar códigos generados (paginado, filtros)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parsePagination } from '@/lib/credits/helpers';

// -------------------------------------------------------
// POST: Generar código de recarga
// -------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth: verificar agente
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !['owner', 'city_admin', 'agent'].includes(userData.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Parse body
    const body = await req.json();
    const { amount_cents, intended_rider_id, notes } = body;

    // Validaciones
    if (!amount_cents || typeof amount_cents !== 'number' || amount_cents <= 0) {
      return NextResponse.json({ error: 'Monto debe ser positivo' }, { status: 400 });
    }

    if (amount_cents > 100000) {
      return NextResponse.json({ error: 'Monto máximo: S/1,000.00' }, { status: 400 });
    }

    // Si se especifica rider, verificar que exista y sea comisión
    if (intended_rider_id) {
      const { data: targetRider, error: riderErr } = await supabase
        .from('riders')
        .select('id, pay_type')
        .eq('id', intended_rider_id)
        .single();

      if (riderErr || !targetRider) {
        return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
      }

      if (targetRider.pay_type !== 'commission') {
        return NextResponse.json(
          { error: 'Solo riders de comisión usan créditos' },
          { status: 400 }
        );
      }
    }

    // Generar código único (función en DB)
    const { data: codeResult, error: codeErr } = await supabase
      .rpc('generate_recharge_code');

    if (codeErr || !codeResult) {
      return NextResponse.json({ error: 'Error generando código' }, { status: 500 });
    }

    const generatedCode = codeResult as string;

    // Insertar código
    const { data: newCode, error: insertErr } = await supabase
      .from('recharge_codes')
      .insert({
        code: generatedCode,
        amount_cents,
        generated_by: user.id,
        intended_rider_id: intended_rider_id || null,
        notes: notes || null,
        status: 'pending',
      })
      .select('id, code, amount_cents, intended_rider_id, notes, status, created_at')
      .single();

    if (insertErr) {
      return NextResponse.json({ error: `Error creando código: ${insertErr.message}` }, { status: 500 });
    }

    return NextResponse.json(newCode, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/agent/recharge-codes error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// -------------------------------------------------------
// GET: Listar códigos generados
// -------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth: verificar agente
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !['owner', 'city_admin', 'agent'].includes(userData.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Params
    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = parsePagination(searchParams);
    const statusFilter = searchParams.get('status');
    const riderIdFilter = searchParams.get('rider_id');

    // Query
    let query = supabase
      .from('recharge_codes')
      .select('id, code, amount_cents, status, intended_rider_id, redeemed_by, redeemed_at, notes, created_at, generated_by', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Agente solo ve los suyos, admin/owner ven todos
    if (userData.role === 'agent') {
      query = query.eq('generated_by', user.id);
    }

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (riderIdFilter) {
      query = query.or(`intended_rider_id.eq.${riderIdFilter},redeemed_by.eq.${riderIdFilter}`);
    }

    const { data: codes, error: queryError, count } = await query;

    if (queryError) {
      return NextResponse.json({ error: 'Error al consultar códigos' }, { status: 500 });
    }

    // Aplanar: obtener nombres de generated_by y riders
    const flatCodes = [];
    if (codes && codes.length > 0) {
      // Obtener IDs únicos
      const userIds = [...new Set(codes.map(c => c.generated_by).filter(Boolean))];
      const riderIds = [...new Set([
        ...codes.map(c => c.intended_rider_id).filter(Boolean),
        ...codes.map(c => c.redeemed_by).filter(Boolean),
      ])];

      // Fetch nombres usuarios
      const userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);
        if (users) users.forEach(u => { userMap[u.id] = u.name; });
      }

      // Fetch nombres riders (via users join)
      const riderMap: Record<string, string> = {};
      if (riderIds.length > 0) {
        const { data: riders } = await supabase
          .from('riders')
          .select('id, user_id')
          .in('id', riderIds);

        if (riders) {
          const riderUserIds = riders.map(r => r.user_id);
          const { data: riderUsers } = await supabase
            .from('users')
            .select('id, name')
            .in('id', riderUserIds);

          if (riderUsers) {
            for (const r of riders) {
              const u = riderUsers.find(ru => ru.id === r.user_id);
              if (u) riderMap[r.id] = u.name;
            }
          }
        }
      }

      for (const code of codes) {
        flatCodes.push({
          ...code,
          generated_by_name: userMap[code.generated_by] || null,
          intended_rider_name: code.intended_rider_id ? (riderMap[code.intended_rider_id] || null) : null,
          redeemed_by_name: code.redeemed_by ? (riderMap[code.redeemed_by] || null) : null,
        });
      }
    }

    return NextResponse.json({
      data: flatCodes,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[API] GET /api/agent/recharge-codes error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
