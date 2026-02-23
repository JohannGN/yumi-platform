import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { logAuditAction } from '@/lib/utils/audit';

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
  const category_id = searchParams.get('category_id');
  const is_active = searchParams.get('is_active');
  const search = searchParams.get('search');

  let query = supabase
    .from('restaurants')
    .select(`
      id, city_id, owner_id, category_id, name, slug, description, logo_url, banner_url,
      lat, lng, address, phone, whatsapp, sells_alcohol, is_active, is_open, accepts_orders,
      commission_percentage, theme_color, estimated_prep_minutes, min_order_cents, display_order,
      total_orders, avg_rating, total_ratings, created_at,
      categories:category_id ( name, emoji ),
      cities:city_id ( name ),
      users:owner_id ( name, email )
    `)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  // city_admin auto-filtrar
  if (profile.role === 'city_admin') {
    query = query.eq('city_id', profile.city_id);
  } else if (city_id) {
    query = query.eq('city_id', city_id);
  }

  if (category_id) query = query.eq('category_id', category_id);
  if (is_active !== null && is_active !== '') {
    query = query.eq('is_active', is_active === 'true');
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const restaurants = (data ?? []).map((r) => {
    const cats = r.categories as { name: string; emoji: string } | null;
    const city = r.cities as { name: string } | null;
    const owner = r.users as { name: string; email: string } | null;
    return {
      ...r,
      category_name: cats?.name ?? null,
      category_emoji: cats?.emoji ?? null,
      city_name: city?.name ?? null,
      owner_name: owner?.name ?? null,
      owner_email: owner?.email ?? null,
      categories: undefined,
      cities: undefined,
      users: undefined,
    };
  });

  return NextResponse.json({ restaurants });
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
  const {
    email, password, name, slug, city_id, category_id,
    address, lat, lng, phone, whatsapp, description,
    commission_percentage, theme_color,
  } = body;

  if (!email || !password || !name || !slug || !city_id || !category_id || !address || lat === undefined || lng === undefined) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }

  // city_admin solo puede crear en su ciudad
  const targetCityId: string = profile.role === 'city_admin' ? profile.city_id : city_id;

  // Verificar slug único por ciudad
  const { data: existingSlug } = await supabase
    .from('restaurants')
    .select('id')
    .eq('city_id', targetCityId)
    .eq('slug', slug)
    .maybeSingle();

  if (existingSlug) {
    return NextResponse.json({ error: 'El slug ya existe en esta ciudad' }, { status: 409 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let authUserId: string | null = null;

  try {
    // 1. Crear usuario en auth
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) throw new Error(authError.message);
    authUserId = authData.user.id;

    // 2. Insertar en public.users
    const { error: userError } = await adminSupabase
      .from('users')
      .insert({ id: authUserId, role: 'restaurant', city_id: targetCityId, name, email });
    if (userError) throw new Error(userError.message);

    // 3. Insertar restaurante
    const { data: restaurant, error: restError } = await adminSupabase
      .from('restaurants')
      .insert({
        owner_id: authUserId,
        city_id: targetCityId,
        category_id,
        name,
        slug,
        address,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        phone: phone || null,
        whatsapp: whatsapp || null,
        description: description || null,
        commission_percentage: commission_percentage ? parseFloat(commission_percentage) : 0,
        theme_color: theme_color || 'orange',
      })
      .select()
      .single();
    if (restError) throw new Error(restError.message);

    // Audit log
    await logAuditAction(adminSupabase, {
      userId: user.id,
      action: 'create',
      entityType: 'restaurant',
      entityId: restaurant.id,
      details: { name, slug, city_id: targetCityId, email },
    });

    return NextResponse.json({ restaurant }, { status: 201 });
  } catch (error: unknown) {
    // Rollback: eliminar auth user si existe
    if (authUserId) {
      await adminSupabase.auth.admin.deleteUser(authUserId);
    }
    const message = error instanceof Error ? error.message : 'Error al crear restaurante';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
