// ============================================================
// GET /api/admin/stats/growth — Métricas de crecimiento de clientes
// Auth: owner + city_admin + agent
// Params: ?period=day|week|month&city_id=uuid
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';
    let cityId = searchParams.get('city_id');
    if (profile.role === 'city_admin') cityId = profile.city_id;

    // Calculate date ranges
    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;
    let trendDays: number;

    switch (period) {
      case 'day':
        currentStart = startOfDay(now);
        previousEnd = new Date(currentStart.getTime() - 1);
        previousStart = startOfDay(previousEnd);
        trendDays = 7;
        break;
      case 'month':
        currentStart = startOfMonth(now);
        previousEnd = new Date(currentStart.getTime() - 1);
        previousStart = startOfMonth(previousEnd);
        trendDays = 30;
        break;
      case 'week':
      default:
        currentStart = startOfWeek(now);
        previousEnd = new Date(currentStart.getTime() - 1);
        previousStart = startOfWeek(previousEnd);
        trendDays = 14;
        break;
    }

    // Build base query filter
    const cityFilter = cityId ? `city_id.eq.${cityId}` : null;

    // Current period: unique customers
    let currentQuery = supabase
      .from('orders')
      .select('customer_phone, created_at')
      .gte('created_at', currentStart.toISOString())
      .in('status', ['delivered', 'in_transit', 'picked_up', 'assigned_rider', 'ready', 'preparing', 'confirmed', 'pending_confirmation']);

    if (cityId) currentQuery = currentQuery.eq('city_id', cityId);
    const { data: currentOrders } = await currentQuery;

    // Previous period: unique customers
    let prevQuery = supabase
      .from('orders')
      .select('customer_phone, created_at')
      .gte('created_at', previousStart.toISOString())
      .lte('created_at', previousEnd.toISOString())
      .in('status', ['delivered', 'in_transit', 'picked_up', 'assigned_rider', 'ready', 'preparing', 'confirmed', 'pending_confirmation']);

    if (cityId) prevQuery = prevQuery.eq('city_id', cityId);
    const { data: prevOrders } = await prevQuery;

    // All-time customers (for new vs returning calculation)
    let allTimeQuery = supabase
      .from('orders')
      .select('customer_phone')
      .lt('created_at', currentStart.toISOString())
      .eq('status', 'delivered');

    if (cityId) allTimeQuery = allTimeQuery.eq('city_id', cityId);
    const { data: allTimeOrders } = await allTimeQuery;

    const allTimePhones = new Set((allTimeOrders ?? []).map((o) => o.customer_phone));

    // Process current period
    const currentPhones = new Set((currentOrders ?? []).map((o) => o.customer_phone));
    const currentNew = [...currentPhones].filter((p) => !allTimePhones.has(p)).length;
    const currentReturning = currentPhones.size - currentNew;

    // Process previous period
    const prevPhones = new Set((prevOrders ?? []).map((o) => o.customer_phone));
    // For previous period "new vs returning", we need customers before previousStart
    let beforePrevQuery = supabase
      .from('orders')
      .select('customer_phone')
      .lt('created_at', previousStart.toISOString())
      .eq('status', 'delivered');

    if (cityId) beforePrevQuery = beforePrevQuery.eq('city_id', cityId);
    const { data: beforePrevOrders } = await beforePrevQuery;

    const beforePrevPhones = new Set((beforePrevOrders ?? []).map((o) => o.customer_phone));
    const prevNew = [...prevPhones].filter((p) => !beforePrevPhones.has(p)).length;
    const prevReturning = prevPhones.size - prevNew;

    // Growth percentage
    const growthPct = prevPhones.size > 0
      ? Math.round(((currentPhones.size - prevPhones.size) / prevPhones.size) * 100)
      : currentPhones.size > 0 ? 100 : 0;

    // Trend: daily unique customers for last N days
    const trendStart = new Date(now.getTime() - trendDays * 24 * 60 * 60 * 1000);
    let trendQuery = supabase
      .from('orders')
      .select('customer_phone, created_at')
      .gte('created_at', trendStart.toISOString())
      .in('status', ['delivered', 'in_transit', 'picked_up', 'assigned_rider', 'ready', 'preparing', 'confirmed', 'pending_confirmation']);

    if (cityId) trendQuery = trendQuery.eq('city_id', cityId);
    const { data: trendOrders } = await trendQuery;

    // Group by date
    const dailyMap = new Map<string, Set<string>>();
    for (let d = 0; d < trendDays; d++) {
      const date = new Date(trendStart.getTime() + d * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      dailyMap.set(key, new Set());
    }

    for (const o of trendOrders ?? []) {
      const key = o.created_at.split('T')[0];
      const set = dailyMap.get(key);
      if (set) set.add(o.customer_phone);
    }

    const trend = [...dailyMap.entries()].map(([date, phones]) => ({
      date,
      customers: phones.size,
    }));

    return NextResponse.json({
      current_period: {
        unique_customers: currentPhones.size,
        total_orders: (currentOrders ?? []).length,
        new_customers: currentNew,
        returning_customers: currentReturning,
      },
      previous_period: {
        unique_customers: prevPhones.size,
        total_orders: (prevOrders ?? []).length,
        new_customers: prevNew,
        returning_customers: prevReturning,
      },
      growth_percentage: growthPct,
      trend,
    });
  } catch (err) {
    console.error('[admin/stats/growth GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = start
  r.setDate(r.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
