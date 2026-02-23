// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// app/api/admin/recharge-codes/route.ts
// GET: Auditoría de todos los códigos de recarga
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parsePagination } from '@/lib/credits/helpers';

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
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!userData || !['owner', 'city_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Params
    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = parsePagination(searchParams);
    const statusFilter = searchParams.get('status');
    const agentId = searchParams.get('agent_id');
    const riderIdFilter = searchParams.get('rider_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Query
    let query = supabase
      .from('recharge_codes')
      .select('id, code, amount_cents, status, intended_rider_id, redeemed_by, redeemed_at, generated_by, notes, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (agentId) query = query.eq('generated_by', agentId);
    if (riderIdFilter) {
      query = query.or(`intended_rider_id.eq.${riderIdFilter},redeemed_by.eq.${riderIdFilter}`);
    }
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data: codes, error: queryErr, count } = await query;

    if (queryErr) {
      return NextResponse.json({ error: 'Error al consultar códigos' }, { status: 500 });
    }

    // Aplanar nombres
    const flatCodes = [];
    if (codes && codes.length > 0) {
      const userIds = [...new Set(codes.map(c => c.generated_by).filter(Boolean))];
      const riderIds = [...new Set([
        ...codes.map(c => c.intended_rider_id).filter(Boolean),
        ...codes.map(c => c.redeemed_by).filter(Boolean),
      ])];

      const userMap: Record<string, string> = {};
      const riderMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);
        if (users) users.forEach(u => { userMap[u.id] = u.name; });
      }

      if (riderIds.length > 0) {
        const { data: riders } = await supabase
          .from('riders')
          .select('id, user_id')
          .in('id', riderIds);

        if (riders && riders.length > 0) {
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
    console.error('[API] GET /api/admin/recharge-codes error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
