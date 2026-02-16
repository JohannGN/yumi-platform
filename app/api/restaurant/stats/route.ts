// ============================================================
// GET /api/restaurant/stats
// Dashboard KPIs for the authenticated restaurant
// Chat 5 — Fragment 2/7
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    // 1. Auth
    const supabase = await createAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Get restaurant
    const serviceClient = createServiceClient();
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('id, avg_rating, total_ratings')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Sin restaurante' }, { status: 404 });
    }

    // 3. Today's date boundaries (Lima timezone)
    const now = new Date();
    const limaOffset = -5 * 60; // UTC-5
    const limaDate = new Date(now.getTime() + (limaOffset - now.getTimezoneOffset()) * 60000);
    const todayStart = new Date(limaDate);
    todayStart.setHours(0, 0, 0, 0);
    // Convert back to UTC for query
    const todayStartUTC = new Date(todayStart.getTime() - limaOffset * 60000);

    // 4. Orders today (excluding cart and cancelled)
    const { count: ordersToday } = await serviceClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', todayStartUTC.toISOString())
      .not('status', 'in', '("cart","cancelled")');

    // 5. Revenue today (only delivered orders)
    const { data: deliveredOrders } = await serviceClient
      .from('orders')
      .select('total_cents')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'delivered')
      .gte('created_at', todayStartUTC.toISOString());

    const revenueToday = deliveredOrders?.reduce(
      (sum, o) => sum + (o.total_cents || 0),
      0
    ) || 0;

    // 6. Pending orders count
    const { count: pendingOrders } = await serviceClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'pending_confirmation');

    // 7. Active orders (confirmed + preparing + ready)
    const { count: activeOrders } = await serviceClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .in('status', ['confirmed', 'preparing', 'ready']);

    // 8. Recent orders (last 5)
    const { data: recentOrders } = await serviceClient
      .from('orders')
      .select('id, code, customer_name, status, total_cents, payment_method, created_at')
      .eq('restaurant_id', restaurant.id)
      .not('status', 'eq', 'cart')
      .order('created_at', { ascending: false })
      .limit(5);

    // 9. Out of stock items
    const { data: outOfStockItems } = await serviceClient
      .from('menu_items')
      .select('id, name, base_price_cents')
      .eq('restaurant_id', restaurant.id)
      .eq('is_available', false)
      .order('name')
      .limit(10);

    return NextResponse.json({
      ordersToday: ordersToday || 0,
      revenueToday,
      pendingOrders: pendingOrders || 0,
      activeOrders: activeOrders || 0,
      avgRating: restaurant.avg_rating || 0,
      totalRatings: restaurant.total_ratings || 0,
      recentOrders: recentOrders || [],
      outOfStockItems: outOfStockItems || [],
    });
  } catch (err) {
    console.error('[/api/restaurant/stats] Error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
