import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'rider') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { data: rider } = await supabase
      .from('riders')
      .select('id, avg_rating, total_ratings, show_earnings, pay_type, commission_percentage')
      .eq('user_id', user.id)
      .single();

    if (!rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    // Get timezone-adjusted dates for Lima
    const now = new Date();
    const limaOffset = -5 * 60; // UTC-5
    const limaTime = new Date(now.getTime() + (now.getTimezoneOffset() + limaOffset) * 60000);

    // Start of today (Lima)
    const todayStart = new Date(limaTime);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartUTC = new Date(todayStart.getTime() - (now.getTimezoneOffset() + limaOffset) * 60000);

    // Start of week (Monday)
    const weekStart = new Date(limaTime);
    const day = weekStart.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0
    weekStart.setDate(weekStart.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartUTC = new Date(weekStart.getTime() - (now.getTimezoneOffset() + limaOffset) * 60000);

    // Start of month
    const monthStart = new Date(limaTime);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartUTC = new Date(monthStart.getTime() - (now.getTimezoneOffset() + limaOffset) * 60000);

    // Count deliveries today
    const { count: deliveriesToday } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('rider_id', rider.id)
      .eq('status', 'delivered')
      .gte('delivered_at', todayStartUTC.toISOString());

    // Count deliveries this week
    const { count: deliveriesWeek } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('rider_id', rider.id)
      .eq('status', 'delivered')
      .gte('delivered_at', weekStartUTC.toISOString());

    // Count deliveries this month
    const { count: deliveriesMonth } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('rider_id', rider.id)
      .eq('status', 'delivered')
      .gte('delivered_at', monthStartUTC.toISOString());

    const result: Record<string, unknown> = {
      deliveries_today: deliveriesToday ?? 0,
      deliveries_week: deliveriesWeek ?? 0,
      deliveries_month: deliveriesMonth ?? 0,
      avg_rating: parseFloat(String(rider.avg_rating)) || 0,
      total_ratings: rider.total_ratings,
    };

    // Earnings only if show_earnings is true
    if (rider.show_earnings && rider.pay_type === 'commission' && rider.commission_percentage) {
      const commRate = parseFloat(String(rider.commission_percentage)) / 100;

      // Earnings today
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_cents, rider_bonus_cents')
        .eq('rider_id', rider.id)
        .eq('status', 'delivered')
        .gte('delivered_at', todayStartUTC.toISOString());

      const earningsToday = (todayOrders ?? []).reduce(
        (sum, o) => sum + Math.round(o.total_cents * commRate) + (o.rider_bonus_cents || 0),
        0
      );

      // Earnings week
      const { data: weekOrders } = await supabase
        .from('orders')
        .select('total_cents, rider_bonus_cents')
        .eq('rider_id', rider.id)
        .eq('status', 'delivered')
        .gte('delivered_at', weekStartUTC.toISOString());

      const earningsWeek = (weekOrders ?? []).reduce(
        (sum, o) => sum + Math.round(o.total_cents * commRate) + (o.rider_bonus_cents || 0),
        0
      );

      // Earnings month
      const { data: monthOrders } = await supabase
        .from('orders')
        .select('total_cents, rider_bonus_cents')
        .eq('rider_id', rider.id)
        .eq('status', 'delivered')
        .gte('delivered_at', monthStartUTC.toISOString());

      const earningsMonth = (monthOrders ?? []).reduce(
        (sum, o) => sum + Math.round(o.total_cents * commRate) + (o.rider_bonus_cents || 0),
        0
      );

      result.earnings_today_cents = earningsToday;
      result.earnings_week_cents = earningsWeek;
      result.earnings_month_cents = earningsMonth;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/rider/stats error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
