import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Rider completo
    const { data: rider, error } = await supabase
      .from('riders')
      .select(`
        *,
        users!inner(name, email, phone, is_active)
      `)
      .eq('id', id)
      .single();

    if (error || !rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    // Historial de turnos (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: shifts } = await supabase
      .from('shift_logs')
      .select('id, started_at, ended_at, duration_minutes, deliveries_count')
      .eq('rider_id', id)
      .gte('started_at', thirtyDaysAgo.toISOString())
      .order('started_at', { ascending: false });

    // Últimos 20 pedidos
    const { data: recentOrders } = await supabase
      .from('orders')
      .select(`
        id, code, status, total_cents, created_at, delivered_at,
        restaurants!inner(name)
      `)
      .eq('rider_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    const r = rider as Record<string, unknown>;
    const u = r.users as unknown as { name: string; email: string; phone: string; is_active: boolean } | null;

    const orders = (recentOrders ?? []).map((o) => {
      const or = o as Record<string, unknown>;
      const rest = or.restaurants as unknown as { name: string } | null;
      return { ...o, restaurant_name: rest?.name ?? '', restaurants: undefined };
    });

    return NextResponse.json({
      ...rider,
      name:      u?.name ?? '',
      email:     u?.email ?? '',
      phone:     u?.phone ?? '',
      is_active: u?.is_active ?? true,
      users:     undefined,
      shift_logs:     shifts ?? [],
      recent_orders:  orders,
    });

  } catch (err) {
    console.error('[admin/riders/[id] GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await req.json() as {
      vehicle_type?: string;
      vehicle_plate?: string;
      pay_type?: string;
      fixed_salary_cents?: number | null;
      commission_percentage?: number | null;
      show_earnings?: boolean;
      is_active?: boolean;
    };

    // Obtener user_id del rider
    const { data: riderData } = await supabase
      .from('riders')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!riderData) return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });

    // Actualizar tabla riders
    const riderUpdates: Record<string, unknown> = {};
    if (body.vehicle_type !== undefined)        riderUpdates.vehicle_type         = body.vehicle_type;
    if (body.vehicle_plate !== undefined)       riderUpdates.vehicle_plate        = body.vehicle_plate;
    if (body.pay_type !== undefined)            riderUpdates.pay_type             = body.pay_type;
    if (body.fixed_salary_cents !== undefined)  riderUpdates.fixed_salary_cents   = body.fixed_salary_cents;
    if (body.commission_percentage !== undefined) riderUpdates.commission_percentage = body.commission_percentage;
    if (body.show_earnings !== undefined)       riderUpdates.show_earnings        = body.show_earnings;

    if (Object.keys(riderUpdates).length > 0) {
      const { error } = await supabase
        .from('riders')
        .update(riderUpdates)
        .eq('id', id);
      if (error) throw error;
    }

    // Actualizar is_active en users
    if (body.is_active !== undefined) {
      const { error } = await supabase
        .from('users')
        .update({ is_active: body.is_active })
        .eq('id', riderData.user_id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[admin/riders/[id] PATCH]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
