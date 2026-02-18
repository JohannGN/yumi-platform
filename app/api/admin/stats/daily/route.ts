import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DailyStats } from '@/types/admin-panel';

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
    const days = parseInt(searchParams.get('days') || '7');
    const cityIdParam = searchParams.get('city_id');
    const effectiveCityId = userData.role === 'city_admin' ? userData.city_id : (cityIdParam || null);

    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - days);
    afterDate.setHours(0, 0, 0, 0);

    let query = supabase
      .from('orders')
      .select('status, total_cents, created_at')
      .gte('created_at', afterDate.toISOString())
      .in('status', ['delivered', 'cancelled']);

    if (effectiveCityId) query = query.eq('city_id', effectiveCityId);
    const { data: orders } = await query;

    // Group by date (Lima timezone)
    const grouped: Record<string, { delivered: number; cancelled: number; revenue_cents: number }> = {};

    // Initialize all days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // YYYY-MM-DD
      grouped[dateStr] = { delivered: 0, cancelled: 0, revenue_cents: 0 };
    }

    for (const order of orders || []) {
      const dateStr = new Date(order.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      if (!grouped[dateStr]) continue;

      if (order.status === 'delivered') {
        grouped[dateStr].delivered++;
        grouped[dateStr].revenue_cents += order.total_cents || 0;
      } else if (order.status === 'cancelled') {
        grouped[dateStr].cancelled++;
      }
    }

    const result: DailyStats[] = Object.entries(grouped).map(([date, vals]) => ({
      date,
      ...vals,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[admin/stats/daily]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
