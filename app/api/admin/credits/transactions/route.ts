// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// app/api/admin/credits/transactions/route.ts
// GET: Log maestro de transacciones de créditos (paginado, filtros)
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
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
    const txType = searchParams.get('type');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Query
    let query = supabase
      .from('credit_transactions')
      .select('id, entity_type, entity_id, order_id, recharge_code_id, transaction_type, amount_cents, balance_before_cents, balance_after_cents, notes, created_by, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);
    if (txType && txType !== 'all') query = query.eq('transaction_type', txType);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data: transactions, error: queryErr, count } = await query;

    if (queryErr) {
      return NextResponse.json({ error: 'Error al consultar transacciones' }, { status: 500 });
    }

    // Aplanar: obtener nombres de entidades
    const flatTransactions = [];
    if (transactions && transactions.length > 0) {
      // Obtener rider IDs y restaurant IDs
      const riderIds = [...new Set(
        transactions.filter(t => t.entity_type === 'rider').map(t => t.entity_id)
      )];
      const restIds = [...new Set(
        transactions.filter(t => t.entity_type === 'restaurant').map(t => t.entity_id)
      )];
      const userIds = [...new Set(
        transactions.map(t => t.created_by).filter(Boolean)
      )] as string[];

      // Maps
      const riderNameMap: Record<string, string> = {};
      const restNameMap: Record<string, string> = {};
      const userNameMap: Record<string, string> = {};

      // Riders → users
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
              if (u) riderNameMap[r.id] = u.name;
            }
          }
        }
      }

      // Restaurants
      if (restIds.length > 0) {
        const { data: restaurants } = await supabase
          .from('restaurants')
          .select('id, name')
          .in('id', restIds);

        if (restaurants) restaurants.forEach(r => { restNameMap[r.id] = r.name; });
      }

      // Created by users
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);

        if (users) users.forEach(u => { userNameMap[u.id] = u.name; });
      }

      for (const tx of transactions) {
        const entityName = tx.entity_type === 'rider'
          ? riderNameMap[tx.entity_id]
          : restNameMap[tx.entity_id];

        flatTransactions.push({
          ...tx,
          entity_name: entityName || null,
          created_by_name: tx.created_by ? (userNameMap[tx.created_by] || null) : null,
        });
      }
    }

    return NextResponse.json({
      data: flatTransactions,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[API] GET /api/admin/credits/transactions error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
