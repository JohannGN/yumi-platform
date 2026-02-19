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

    if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // ── 1. Traer riders + users join ──────────────────────────────────────────
    // NOTA: current_order_id es FK manual (sin constraint en BD), por eso
    // NO se puede usar orders!riders_current_order_id_fkey — falla silenciosamente.
    // Se resuelve con una segunda query.
    let query = supabase
      .from('riders')
      .select(`
        id, user_id, city_id,
        vehicle_type, vehicle_plate,
        is_online, is_available, current_order_id,
        current_lat, current_lng, last_location_update,
        shift_started_at, total_deliveries, avg_rating, total_ratings,
        pay_type, fixed_salary_cents, commission_percentage, show_earnings,
        users!inner(name, email, phone, is_active)
      `);

    if (profile.role === 'city_admin' && profile.city_id) {
      query = query.eq('city_id', profile.city_id);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('[admin/riders GET] query error:', error);
      throw error;
    }

    // ── 2. Mapear campos de users al nivel raíz ───────────────────────────────
    const riders = (rows ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const u = r.users as { name: string; email: string; phone: string; is_active: boolean } | null;
      return {
        id:                    r.id,
        user_id:               r.user_id,
        city_id:               r.city_id,
        vehicle_type:          r.vehicle_type,
        vehicle_plate:         r.vehicle_plate,
        is_online:             r.is_online,
        is_available:          r.is_available,
        current_order_id:      r.current_order_id,
        current_lat:           r.current_lat,
        current_lng:           r.current_lng,
        last_location_update:  r.last_location_update,
        shift_started_at:      r.shift_started_at,
        total_deliveries:      r.total_deliveries,
        avg_rating:            r.avg_rating,
        total_ratings:         r.total_ratings,
        pay_type:              r.pay_type,
        fixed_salary_cents:    r.fixed_salary_cents,
        commission_percentage: r.commission_percentage,
        show_earnings:         r.show_earnings,
        name:                  u?.name     ?? '',
        email:                 u?.email    ?? '',
        phone:                 u?.phone    ?? '',
        is_active:             u?.is_active ?? true,
        current_order_code:    null as string | null, // se rellena abajo
      };
    });

    // ── 3. Resolver códigos de pedido activo (FK manual) ─────────────────────
    const activeOrderIds = riders
      .map((r) => r.current_order_id as string | null)
      .filter((id): id is string => Boolean(id));

    if (activeOrderIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, code')
        .in('id', activeOrderIds);

      const orderMap = new Map((orders ?? []).map((o) => [o.id, o.code]));
      for (const rider of riders) {
        if (rider.current_order_id) {
          rider.current_order_code = orderMap.get(rider.current_order_id as string) ?? null;
        }
      }
    }

    // ── 4. Ordenar por nombre ─────────────────────────────────────────────────
    riders.sort((a, b) => a.name.localeCompare(b.name, 'es'));

    return NextResponse.json({ riders, total: riders.length });

  } catch (err) {
    console.error('[admin/riders GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Solo owner o city_admin pueden crear riders' }, { status: 403 });
    }

    const body = await req.json() as {
    name: string;
    email: string;
    password: string;
    phone: string;
    city_id: string;
    vehicle_type: string;
    vehicle_plate?: string;
    pay_type: string;
    avatar_url?: string;
     };

    if (!body.name || !body.email || !body.password || !body.phone || !body.city_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (body.password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Crear usuario en Auth
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error('[create rider auth]', authError);
      return NextResponse.json({
        error: authError?.message ?? 'Error al crear usuario auth',
      }, { status: 422 });
    }

    const newUserId = authData.user.id;

    // Insertar en public.users
    const { error: userErr } = await serviceClient
  .from('users')
  .insert({
    id:         newUserId,
    role:       'rider',
    city_id:    body.city_id,
    name:       body.name,
    phone:      body.phone.startsWith('+51') ? body.phone : `+51${body.phone}`,
    email:      body.email,
    is_active:  true,
    ...(body.avatar_url ? { avatar_url: body.avatar_url } : {}),
  });

    if (userErr) {
      await serviceClient.auth.admin.deleteUser(newUserId);
      throw userErr;
    }

    // Insertar en riders
    const { data: newRider, error: riderErr } = await serviceClient
      .from('riders')
      .insert({
        user_id:          newUserId,
        city_id:          body.city_id,
        vehicle_type:     body.vehicle_type ?? 'motorcycle',
        vehicle_plate:    body.vehicle_plate ?? null,
        pay_type:         body.pay_type ?? 'fixed_salary',
        is_online:        false,
        is_available:     false,
        total_deliveries: 0,
        avg_rating:       0,
        total_ratings:    0,
        show_earnings:    false,
      })
      .select()
      .single();

    if (riderErr) {
      await serviceClient.auth.admin.deleteUser(newUserId);
      throw riderErr;
    }

    return NextResponse.json({ rider: newRider }, { status: 201 });

  } catch (err) {
    console.error('[admin/riders POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
