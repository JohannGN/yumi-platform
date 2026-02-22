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

  // Restaurante completo
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select(`
      *, categories:category_id (name, emoji), cities:city_id (name, slug),
      users:owner_id (id, name, email, phone, is_active, created_at)
    `)
    .eq('id', id)
    .single();

  if (error || !restaurant) {
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
  }

  // city_admin solo puede ver su ciudad
  if (profile.role === 'city_admin' && restaurant.city_id !== profile.city_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Conteo menú
  const [{ count: menuCatsCount }, { count: menuItemsCount }] = await Promise.all([
    supabase.from('menu_categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', id),
    supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', id),
  ]);

  // Stats de pedidos
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: ordersToday },
    { count: ordersWeek },
    { count: ordersMonth },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .eq('restaurant_id', id).eq('status', 'delivered').gte('created_at', startOfDay),
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .eq('restaurant_id', id).eq('status', 'delivered').gte('created_at', startOfWeek),
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .eq('restaurant_id', id).eq('status', 'delivered').gte('created_at', startOfMonth),
    supabase.from('orders')
      .select('id, code, status, total_cents, created_at, customer_name')
      .eq('restaurant_id', id)
      .neq('status', 'cart')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const cats = restaurant.categories as { name: string; emoji: string } | null;
  const city = restaurant.cities as { name: string; slug: string } | null;
  const owner = restaurant.users as { id: string; name: string; email: string; phone: string; is_active: boolean; created_at: string } | null;

  return NextResponse.json({
    restaurant: {
      ...restaurant,
      category_name: cats?.name,
      category_emoji: cats?.emoji,
      city_name: city?.name,
      city_slug: city?.slug,
      owner_name: owner?.name,
      owner_email: owner?.email,
      owner_phone: owner?.phone,
      owner_is_active: owner?.is_active,
      categories: undefined,
      cities: undefined,
      users: undefined,
    },
    stats: {
      menu_categories_count: menuCatsCount ?? 0,
      menu_items_count: menuItemsCount ?? 0,
      orders_today: ordersToday ?? 0,
      orders_week: ordersWeek ?? 0,
      orders_month: ordersMonth ?? 0,
    },
    recent_orders: recentOrders ?? [],
  });
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

  // city_admin solo puede editar su ciudad
  if (profile.role === 'city_admin') {
    const { data: rest } = await supabase
      .from('restaurants')
      .select('city_id')
      .eq('id', id)
      .single();
    if (!rest || rest.city_id !== profile.city_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = await request.json();
  const {
    name, slug, description, category_id, address, lat, lng,
    phone, whatsapp, sells_alcohol, is_active, is_open, commission_percentage,
    commission_mode, // FIX-6: 'global' | 'per_item'
    theme_color, estimated_prep_minutes, min_order_cents, display_order,
  } = body;

  // Validar slug único si cambió
  if (slug) {
    const { data: rest } = await supabase
      .from('restaurants')
      .select('city_id')
      .eq('id', id)
      .single();
    if (rest) {
      const { data: existingSlug } = await supabase
        .from('restaurants')
        .select('id')
        .eq('city_id', rest.city_id)
        .eq('slug', slug)
        .neq('id', id)
        .maybeSingle();
      if (existingSlug) {
        return NextResponse.json({ error: 'El slug ya existe en esta ciudad' }, { status: 409 });
      }
    }
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (description !== undefined) updates.description = description;
  if (category_id !== undefined) updates.category_id = category_id;
  if (address !== undefined) updates.address = address;
  if (lat !== undefined) updates.lat = parseFloat(lat);
  if (lng !== undefined) updates.lng = parseFloat(lng);
  if (phone !== undefined) updates.phone = phone || null;
  if (whatsapp !== undefined) updates.whatsapp = whatsapp || null;
  if (sells_alcohol !== undefined) updates.sells_alcohol = sells_alcohol;
  if (is_active !== undefined) updates.is_active = is_active;
  if (is_open !== undefined) updates.is_open = is_open;
  if (commission_percentage !== undefined) updates.commission_percentage = parseFloat(commission_percentage);
  if (theme_color !== undefined) updates.theme_color = theme_color;
  if (estimated_prep_minutes !== undefined) updates.estimated_prep_minutes = parseInt(estimated_prep_minutes);
  if (min_order_cents !== undefined) updates.min_order_cents = parseInt(min_order_cents);
  if (display_order !== undefined) updates.display_order = parseInt(display_order);

  // FIX-6: commission_mode — only owner/city_admin can edit (#110)
  if (commission_mode !== undefined) {
    if (!['global', 'per_item'].includes(commission_mode)) {
      return NextResponse.json({ error: 'commission_mode inválido' }, { status: 400 });
    }
    updates.commission_mode = commission_mode;
  }

  const { data: updated, error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ restaurant: updated });
}
