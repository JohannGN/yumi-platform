import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const city_id = searchParams.get('city_id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = (page - 1) * limit;

    const serviceClient = createServiceClient();

    // Build base query
    let query = serviceClient
      .from('users')
      .select('id, name, email, phone, role, city_id, is_active, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filters
    if (role) query = query.eq('role', role);
    if (profile.role === 'city_admin' && profile.city_id) {
      query = query.eq('city_id', profile.city_id);
    } else if (city_id) {
      query = query.eq('city_id', city_id);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: usersRaw, count, error } = await query;
    if (error) {
      console.error('[admin/users GET]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!usersRaw || usersRaw.length === 0) {
      return NextResponse.json({ users: [], total: 0 });
    }

    // Get city names for all users
    const cityIds = [...new Set(usersRaw.map((u) => u.city_id).filter(Boolean))] as string[];
    const cityMap: Record<string, string> = {};
    if (cityIds.length > 0) {
      const { data: cities } = await serviceClient
        .from('cities')
        .select('id, name')
        .in('id', cityIds);
      for (const c of cities ?? []) {
        cityMap[c.id] = c.name;
      }
    }

    // Get rider-specific data
    const riderUserIds = usersRaw.filter((u) => u.role === 'rider').map((u) => u.id);
    const riderMap: Record<string, { vehicle_type: string; pay_type: string }> = {};
    if (riderUserIds.length > 0) {
      const { data: riders } = await serviceClient
        .from('riders')
        .select('user_id, vehicle_type, pay_type')
        .in('user_id', riderUserIds);
      for (const r of riders ?? []) {
        riderMap[r.user_id] = { vehicle_type: r.vehicle_type, pay_type: r.pay_type };
      }
    }

    // Get restaurant-specific data
    const restUserIds = usersRaw.filter((u) => u.role === 'restaurant').map((u) => u.id);
    const restMap: Record<string, string> = {};
    if (restUserIds.length > 0) {
      const { data: restaurants } = await serviceClient
        .from('restaurants')
        .select('owner_id, name')
        .in('owner_id', restUserIds);
      for (const r of restaurants ?? []) {
        restMap[r.owner_id] = r.name;
      }
    }

    // Flatten
    const users = usersRaw.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      city_id: u.city_id,
      city_name: u.city_id ? (cityMap[u.city_id] ?? null) : null,
      is_active: u.is_active,
      created_at: u.created_at,
      restaurant_name: u.role === 'restaurant' ? (restMap[u.id] ?? undefined) : undefined,
      vehicle_type: u.role === 'rider' ? (riderMap[u.id]?.vehicle_type ?? undefined) : undefined,
      pay_type: u.role === 'rider' ? (riderMap[u.id]?.pay_type ?? undefined) : undefined,
    }));

    return NextResponse.json({ users, total: count ?? users.length });
  } catch (err) {
    console.error('[admin/users GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
