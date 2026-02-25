// ============================================================
// GET /api/admin/financial/pyl/trend — Datos tendencia P&L
// Auth: owner, city_admin
// Params: ?from=YYYY-MM-DD&to=YYYY-MM-DD&city_id=uuid&group_by=day|week|month
// Chat: EGRESOS-3
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { PylTrendPoint } from '@/types/pyl';

function getDefaultGroupBy(from: string, to: string): 'day' | 'week' | 'month' {
  const diffMs = new Date(to).getTime() - new Date(from).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) return 'day';
  if (diffDays <= 90) return 'week';
  return 'month';
}

function getDateKey(dateStr: string, groupBy: string): string {
  const d = new Date(dateStr);
  if (groupBy === 'day') {
    return d.toISOString().split('T')[0];
  }
  if (groupBy === 'week') {
    // ISO week: get monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
  }
  // month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role, city_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'city_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0];
  const groupBy = (searchParams.get('group_by') || getDefaultGroupBy(from, to)) as 'day' | 'week' | 'month';
  const cityIdParam = searchParams.get('city_id');

  const cityId = profile.role === 'city_admin' ? profile.city_id : cityIdParam;

  const fromDate = `${from}T00:00:00`;
  const toDate = `${to}T23:59:59`;

  try {
    // Fetch delivered orders
    let ordersQuery = supabase
      .from('orders')
      .select('created_at, delivery_fee_cents, restaurant_commission_cents, rounding_surplus_cents')
      .eq('status', 'delivered')
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    if (cityId) ordersQuery = ordersQuery.eq('city_id', cityId);

    const { data: orders, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;

    // Fetch expenses
    let expensesQuery = supabase
      .from('expenses')
      .select('date, amount_cents')
      .gte('date', from)
      .lte('date', to);

    if (cityId) expensesQuery = expensesQuery.eq('city_id', cityId);

    const { data: expenses, error: expensesError } = await expensesQuery;
    if (expensesError) throw expensesError;

    // Aggregate into buckets
    const buckets = new Map<string, { income: number; expenses: number; orders: number }>();

    // Initialize date buckets
    const startDate = new Date(from);
    const endDate = new Date(to);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = getDateKey(d.toISOString(), groupBy);
      if (!buckets.has(key)) {
        buckets.set(key, { income: 0, expenses: 0, orders: 0 });
      }
    }

    // Aggregate orders (income)
    for (const order of orders || []) {
      const key = getDateKey(order.created_at, groupBy);
      const bucket = buckets.get(key) || { income: 0, expenses: 0, orders: 0 };
      bucket.income += (order.delivery_fee_cents || 0)
        + (order.restaurant_commission_cents || 0)
        + (order.rounding_surplus_cents || 0);
      bucket.orders += 1;
      buckets.set(key, bucket);
    }

    // Aggregate expenses
    for (const exp of expenses || []) {
      const key = getDateKey(exp.date, groupBy);
      const bucket = buckets.get(key) || { income: 0, expenses: 0, orders: 0 };
      bucket.expenses += exp.amount_cents || 0;
      buckets.set(key, bucket);
    }

    // Convert to sorted array
    const trend: PylTrendPoint[] = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date,
        income_cents: val.income,
        expenses_cents: val.expenses,
        margin_cents: val.income - val.expenses,
        orders_count: val.orders,
      }));

    return NextResponse.json(trend);
  } catch (error) {
    console.error('P&L trend error:', error);
    return NextResponse.json({ error: 'Error al calcular tendencia' }, { status: 500 });
  }
}
