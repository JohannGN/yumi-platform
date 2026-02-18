import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const city_id = searchParams.get('city_id');

  // city_admin: forzar su ciudad
  const targetCityId = profile.role === 'city_admin' ? profile.city_id : city_id;

  if (!targetCityId) {
    return NextResponse.json({ error: 'city_id requerido' }, { status: 400 });
  }

  // NO incluir geometría en lista (pesado)
  const { data: zones, error } = await supabase
    .from('delivery_zones')
    .select('id, city_id, name, base_fee_cents, per_km_fee_cents, min_fee_cents, max_fee_cents, color, is_active, created_at')
    .eq('city_id', targetCityId)
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zones: zones ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role, city_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'city_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { city_id, name, geojson, base_fee_cents, per_km_fee_cents, min_fee_cents, max_fee_cents, color } = body;

  if (!city_id || !name || !geojson) {
    return NextResponse.json({ error: 'city_id, name y geojson son obligatorios' }, { status: 400 });
  }

  // city_admin solo puede crear en su ciudad
  if (profile.role === 'city_admin' && city_id !== profile.city_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Usar la función SQL existente
  const { data, error } = await supabase.rpc('create_delivery_zone_from_geojson', {
    p_city_id: city_id,
    p_name: name,
    p_geojson: geojson,
    p_base_fee_cents: base_fee_cents ?? 300,
    p_per_km_fee_cents: per_km_fee_cents ?? 100,
    p_min_fee_cents: min_fee_cents ?? 300,
    p_max_fee_cents: max_fee_cents ?? 1000,
    p_color: color ?? '#3B82F6',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Obtener la zona creada
  const { data: zone } = await supabase
    .from('delivery_zones')
    .select('id, city_id, name, base_fee_cents, per_km_fee_cents, min_fee_cents, max_fee_cents, color, is_active, created_at')
    .eq('id', data)
    .single();

  return NextResponse.json({ zone }, { status: 201 });
}
