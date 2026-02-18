import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Incluir geometría como GeoJSON usando SQL raw
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('id, city_id, name, base_fee_cents, per_km_fee_cents, min_fee_cents, max_fee_cents, color, is_active, created_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Zona no encontrada' }, { status: 404 });
  }

  // Obtener GeoJSON de la geometría
  const { data: geoData } = await supabase.rpc('get_zone_geojson', { p_zone_id: id }).single();

  // Fallback: intentar con query directa si el rpc no existe
  let geojson: string | null = null;
  if (geoData) {
    geojson = geoData as string;
  } else {
    // Query directa con ST_AsGeoJSON
    const { data: rawGeo } = await supabase
      .from('delivery_zones')
      .select('polygon')
      .eq('id', id)
      .single();
    // La columna polygon como texto puede no funcionar directamente
    // Se necesita una función SQL: SELECT ST_AsGeoJSON(polygon) FROM delivery_zones WHERE id = id
    // Por ahora retornamos null y el cliente puede manejar el caso sin geometría
    geojson = null;
  }

  return NextResponse.json({ zone: { ...data, geojson } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // city_admin solo puede editar zonas de su ciudad
  if (profile.role === 'city_admin') {
    const { data: zone } = await supabase
      .from('delivery_zones')
      .select('city_id')
      .eq('id', id)
      .single();
    if (!zone || zone.city_id !== profile.city_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = await request.json();
  const { name, base_fee_cents, per_km_fee_cents, min_fee_cents, max_fee_cents, color, is_active } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (base_fee_cents !== undefined) updates.base_fee_cents = parseInt(base_fee_cents);
  if (per_km_fee_cents !== undefined) updates.per_km_fee_cents = parseInt(per_km_fee_cents);
  if (min_fee_cents !== undefined) updates.min_fee_cents = parseInt(min_fee_cents);
  if (max_fee_cents !== undefined) updates.max_fee_cents = parseInt(max_fee_cents);
  if (color !== undefined) updates.color = color;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data: zone, error } = await supabase
    .from('delivery_zones')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zone });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Verificar si tiene pedidos vinculados
  const { count: ordersCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('delivery_zone_id', id);

  if (ordersCount && ordersCount > 0) {
    // Soft delete: marcar inactiva
    const { error } = await supabase
      .from('delivery_zones')
      .update({ is_active: false })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, soft_deleted: true });
  }

  // Hard delete si no tiene pedidos
  const { error } = await supabase
    .from('delivery_zones')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, soft_deleted: false });
}
