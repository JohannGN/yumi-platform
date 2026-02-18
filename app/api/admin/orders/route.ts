import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verificar sesión y rol
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Params
    const { searchParams } = new URL(request.url);
    const statusParam   = searchParams.get('status') ?? '';
    const restaurantId  = searchParams.get('restaurant_id') ?? '';
    const riderId       = searchParams.get('rider_id') ?? '';
    const dateFrom      = searchParams.get('date_from') ?? '';
    const dateTo        = searchParams.get('date_to') ?? '';
    const search        = searchParams.get('search') ?? '';
    const page          = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit         = Math.min(100, parseInt(searchParams.get('limit') ?? '50', 10));
    const offset        = (page - 1) * limit;

    // Build query con joins
    let query = supabase
      .from('orders')
      .select(`
        id, code, status, restaurant_id, rider_id,
        customer_name, customer_phone,
        delivery_address, delivery_lat, delivery_lng, delivery_instructions,
        items,
        subtotal_cents, delivery_fee_cents, service_fee_cents,
        discount_cents, total_cents, rider_bonus_cents,
        payment_method, actual_payment_method, payment_status,
        delivery_proof_url, payment_proof_url,
        rejection_reason, rejection_notes,
        customer_rating, customer_comment, source,
        created_at, confirmed_at, restaurant_confirmed_at,
        ready_at, assigned_at, picked_up_at, in_transit_at,
        delivered_at, cancelled_at,
        restaurants!inner(name),
        riders(
          users!inner(name)
        )
      `, { count: 'exact' });

    // city_admin sólo ve su ciudad
    if (profile.role === 'city_admin' && profile.city_id) {
      query = query.eq('city_id', profile.city_id);
    }

    // Filtros opcionales
    if (statusParam) {
      const statuses = statusParam.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length > 0) query = query.in('status', statuses);
    }
    if (restaurantId) query = query.eq('restaurant_id', restaurantId);
    if (riderId)       query = query.eq('rider_id', riderId);
    if (dateFrom)      query = query.gte('created_at', dateFrom);
    if (dateTo)        query = query.lte('created_at', dateTo);
    if (search) {
      query = query.or(`code.ilike.%${search}%,customer_phone.ilike.%${search}%`);
    }

    const { data: rows, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Mapear nombres de joins
    const orders = (rows ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const restaurant = r.restaurants as { name: string } | null;
      const riderJoin  = r.riders as { users: { name: string } } | null;
      return {
        ...row,
        restaurant_name: restaurant?.name ?? '',
        rider_name: riderJoin?.users?.name ?? null,
        restaurants: undefined,
        riders: undefined,
      };
    });

    return NextResponse.json({
      orders,
      total:  count ?? 0,
      page,
      limit,
    });

  } catch (err) {
    console.error('[admin/orders GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
