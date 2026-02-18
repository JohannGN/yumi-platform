import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role, city_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let query = supabase
    .from('cities')
    .select('id, name, slug, country, timezone, is_active, settings, created_at')
    .order('name', { ascending: true });

  // city_admin solo ve su ciudad
  if (profile.role === 'city_admin') {
    query = query.eq('id', profile.city_id);
  }

  const { data: cities, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enriquecer con conteos
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const enriched = await Promise.all((cities ?? []).map(async (city) => {
    const [
      { count: restaurant_count },
      { count: rider_count },
      { count: order_count_total },
      { count: order_count_month },
      { count: zone_count },
    ] = await Promise.all([
      supabase.from('restaurants').select('id', { count: 'exact', head: true })
        .eq('city_id', city.id).eq('is_active', true),
      supabase.from('riders').select('id', { count: 'exact', head: true })
        .eq('city_id', city.id),
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('city_id', city.id).eq('status', 'delivered'),
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('city_id', city.id).eq('status', 'delivered').gte('created_at', startOfMonth),
      supabase.from('delivery_zones').select('id', { count: 'exact', head: true })
        .eq('city_id', city.id).eq('is_active', true),
    ]);

    return {
      ...city,
      restaurant_count: restaurant_count ?? 0,
      rider_count: rider_count ?? 0,
      order_count_total: order_count_total ?? 0,
      order_count_month: order_count_month ?? 0,
      zone_count: zone_count ?? 0,
    };
  }));

  return NextResponse.json({ cities: enriched });
}
