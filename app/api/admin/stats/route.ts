import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AdminStats, StatsPeriod } from '@/types/admin-panel';

function getPeriodStart(period: StatsPeriod): string {
  const now = new Date();
  const lima = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));

  if (period === 'today') {
    lima.setHours(0, 0, 0, 0);
    return lima.toISOString();
  }
  if (period === 'week') {
    lima.setDate(lima.getDate() - 7);
    lima.setHours(0, 0, 0, 0);
    return lima.toISOString();
  }
  // month
  lima.setDate(lima.getDate() - 30);
  lima.setHours(0, 0, 0, 0);
  return lima.toISOString();
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!userData || !['owner', 'city_admin', 'agent'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'today') as StatsPeriod;
    const cityIdParam = searchParams.get('city_id');

    // ADMIN-FIN-2: Support explicit from/to date params
    const fromParam = searchParams.get('from'); // "2026-02-23"
    const toParam = searchParams.get('to');     // "2026-02-23"

    // city_admin always sees only their city
    const effectiveCityId = userData.role === 'city_admin' ? userData.city_id : (cityIdParam || null);

    // Determine date range: explicit from/to takes precedence over period
    let periodStart: string;
    let periodEnd: string | null = null;

    if (fromParam) {
      periodStart = `${fromParam}T00:00:00`;
      if (toParam) {
        periodEnd = `${toParam}T23:59:59`;
      }
    } else {
      periodStart = getPeriodStart(period);
    }

    // Build order query
    let ordersQuery = supabase
      .from('orders')
      .select('id, status, total_cents, delivery_fee_cents, subtotal_cents, restaurant_confirmed_at, ready_at, delivered_at')
      .gte('created_at', periodStart)
      .neq('status', 'cart');

    if (periodEnd) ordersQuery = ordersQuery.lte('created_at', periodEnd);
    if (effectiveCityId) ordersQuery = ordersQuery.eq('city_id', effectiveCityId);

    const { data: orders } = await ordersQuery;
    const orderList = orders || [];

    const ACTIVE_STATUSES = ['awaiting_confirmation','pending_confirmation','confirmed','preparing','ready','assigned_rider','picked_up','in_transit'];
    const activeOrders = orderList.filter(o => ACTIVE_STATUSES.includes(o.status));
    const deliveredOrders = orderList.filter(o => o.status === 'delivered');
    const cancelledOrders = orderList.filter(o => o.status === 'cancelled');
    const rejectedOrders = orderList.filter(o => o.status === 'rejected');

    const totalRevenue = deliveredOrders.reduce((s, o) => s + (o.total_cents || 0), 0);
    const totalDeliveryFees = deliveredOrders.reduce((s, o) => s + (o.delivery_fee_cents || 0), 0);
    const totalSubtotal = deliveredOrders.reduce((s, o) => s + (o.subtotal_cents || 0), 0);
    const avgOrder = deliveredOrders.length > 0 ? Math.round(totalRevenue / deliveredOrders.length) : 0;

    // Performance: only delivered with full timestamps
    const deliveryTimes = deliveredOrders
      .filter(o => o.restaurant_confirmed_at && o.delivered_at)
      .map(o => {
        const start = new Date(o.restaurant_confirmed_at!).getTime();
        const end = new Date(o.delivered_at!).getTime();
        return (end - start) / 60000;
      });

    const prepTimes = orderList
      .filter(o => o.restaurant_confirmed_at && o.ready_at)
      .map(o => {
        const start = new Date(o.restaurant_confirmed_at!).getTime();
        const end = new Date(o.ready_at!).getTime();
        return (end - start) / 60000;
      });

    const avgDeliveryMin = deliveryTimes.length > 0
      ? Math.round(deliveryTimes.reduce((s, t) => s + t, 0) / deliveryTimes.length)
      : 0;
    const avgPrepMin = prepTimes.length > 0
      ? Math.round(prepTimes.reduce((s, t) => s + t, 0) / prepTimes.length)
      : 0;

    // Restaurants
    let restQuery = supabase.from('restaurants').select('id, is_active, is_open');
    if (effectiveCityId) restQuery = restQuery.eq('city_id', effectiveCityId);
    const { data: restaurants } = await restQuery;
    const restList = restaurants || [];

    // Riders
    let ridersQuery = supabase.from('riders').select('id, is_online, is_available');
    if (effectiveCityId) ridersQuery = ridersQuery.eq('city_id', effectiveCityId);
    const { data: riders } = await ridersQuery;
    const riderList = riders || [];

    const stats: AdminStats = {
      orders: {
        total: orderList.length,
        active: activeOrders.length,
        delivered: deliveredOrders.length,
        cancelled: cancelledOrders.length,
        rejected: rejectedOrders.length,
      },
      revenue: {
        total_cents: totalRevenue,
        delivery_fees_cents: totalDeliveryFees,
        subtotal_cents: totalSubtotal,
        avg_order_cents: avgOrder,
      },
      restaurants: {
        total: restList.filter(r => r.is_active).length,
        active: restList.filter(r => r.is_active).length,
        open_now: restList.filter(r => r.is_open).length,
      },
      riders: {
        total: riderList.length,
        online: riderList.filter(r => r.is_online).length,
        available: riderList.filter(r => r.is_available).length,
        busy: riderList.filter(r => r.is_online && !r.is_available).length,
      },
      performance: {
        avg_delivery_minutes: avgDeliveryMin,
        avg_prep_minutes: avgPrepMin,
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[admin/stats]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
