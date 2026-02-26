import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

/**
 * Check if user has access to a specific city.
 */
async function hasAccessToCity(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  role: string,
  userCityId: string | null,
  targetCityId: string
): Promise<boolean> {
  if (role === 'owner') return true;
  if (role === 'city_admin') return userCityId === targetCityId;

  // Agent: check agent_cities
  const { data } = await supabase
    .from('agent_cities')
    .select('id')
    .eq('user_id', userId)
    .eq('city_id', targetCityId)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id, is_active')
      .eq('id', user.id)
      .single();

    if (!userData || !userData.is_active || !AGENT_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('city_id');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const perPage = 20;

    if (!cityId) {
      return NextResponse.json({ error: 'city_id requerido' }, { status: 400 });
    }

    // Validate city access
    const hasAccess = await hasAccessToCity(supabase, user.id, userData.role, userData.city_id, cityId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Sin acceso a esta ciudad' }, { status: 403 });
    }

    // Use service role to bypass RLS for cross-table joins
    const serviceClient = createServiceRoleClient();

    // Build query
    let query = serviceClient
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('city_id', cityId)
      .neq('status', 'cart')
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, count, error: ordersError } = await query;

    if (ordersError) {
      return NextResponse.json({ error: 'Error al cargar pedidos' }, { status: 500 });
    }

    // Flatten joins: get restaurant and rider names
    const restaurantIds = [...new Set((orders ?? []).map((o: Record<string, unknown>) => o.restaurant_id).filter(Boolean))];
    const riderIds = [...new Set((orders ?? []).map((o: Record<string, unknown>) => o.rider_id).filter(Boolean))];

    const { data: restaurants } = restaurantIds.length > 0
      ? await serviceClient.from('restaurants').select('id, name').in('id', restaurantIds)
      : { data: [] };

    // riders → join users for name + phone
    let riderMap: Record<string, { name: string; phone: string | null }> = {};
    if (riderIds.length > 0) {
      const { data: riders } = await serviceClient
        .from('riders')
        .select('id, user_id')
        .in('id', riderIds);

      if (riders && riders.length > 0) {
        const riderUserIds = riders.map((r: Record<string, unknown>) => r.user_id);
        const { data: riderUsers } = await serviceClient
          .from('users')
          .select('id, name, phone')
          .in('id', riderUserIds);

        for (const rider of riders) {
          const u = riderUsers?.find((ru: { id: string; name: string; phone: string }) => ru.id === rider.user_id);
          if (u) {
            riderMap[rider.id] = { name: u.name, phone: u.phone };
          }
        }
      }
    }

    const restMap: Record<string, string> = {};
    for (const r of restaurants ?? []) {
      restMap[r.id] = r.name;
    }

    // Build flattened response
    const flatOrders = (orders ?? []).map((o: Record<string, unknown>) => ({
      id: o.id,
      code: o.code,
      status: o.status,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      restaurant_name: restMap[o.restaurant_id as string] ?? 'Desconocido',
      restaurant_id: o.restaurant_id,
      rider_name: o.rider_id ? (riderMap[o.rider_id as string]?.name ?? null) : null,
      rider_id: o.rider_id,
      rider_phone: o.rider_id ? (riderMap[o.rider_id as string]?.phone ?? null) : null,
      items: o.items,
      subtotal_cents: o.subtotal_cents,
      delivery_fee_cents: o.delivery_fee_cents,
      service_fee_cents: o.service_fee_cents,
      discount_cents: o.discount_cents,
      total_cents: o.total_cents,
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      actual_payment_method: o.actual_payment_method,
      delivery_address: o.delivery_address,
      delivery_lat: o.delivery_lat,
      delivery_lng: o.delivery_lng,
      delivery_instructions: o.delivery_instructions,
      notes: o.notes,
      fee_is_manual: o.fee_is_manual,
      fee_calculated_cents: o.fee_calculated_cents,
      source: o.source,
      created_at: o.created_at,
      updated_at: o.updated_at,
    }));

    return NextResponse.json({
      data: flatOrders,
      total: count ?? 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count ?? 0) / perPage),
    });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
