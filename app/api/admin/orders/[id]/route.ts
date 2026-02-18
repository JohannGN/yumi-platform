import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Transiciones de estado válidas para admin
const VALID_TRANSITIONS: Record<string, string[]> = {
  cart:                   ['awaiting_confirmation', 'cancelled'],
  awaiting_confirmation:  ['pending_confirmation', 'cancelled'],
  pending_confirmation:   ['confirmed', 'rejected', 'cancelled'],
  confirmed:              ['preparing', 'cancelled'],
  rejected:               ['cancelled'],
  preparing:              ['ready', 'cancelled'],
  ready:                  ['assigned_rider', 'cancelled'],
  assigned_rider:         ['picked_up', 'cancelled'],
  picked_up:              ['in_transit', 'cancelled'],
  in_transit:             ['delivered', 'cancelled'],
  delivered:              [],
  cancelled:              [],
};

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
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Pedido completo con joins
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurants!inner(id, name, address, phone),
        riders(
          id, vehicle_type, vehicle_plate,
          users!inner(name, phone, email)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Historial de estados
    const { data: history } = await supabase
      .from('order_status_history')
      .select('id, from_status, to_status, changed_by_user_id, notes, created_at')
      .eq('order_id', id)
      .order('created_at', { ascending: true });

    // Formatear respuesta
    const o = order as Record<string, unknown>;
    const restaurant = o.restaurants as { id: string; name: string; address: string; phone: string } | null;
    const riderJoin  = o.riders as {
      id: string;
      vehicle_type: string;
      vehicle_plate: string | null;
      users: { name: string; phone: string; email: string };
    } | null;

    return NextResponse.json({
      ...order,
      restaurant_name:    restaurant?.name ?? '',
      restaurant_address: restaurant?.address ?? '',
      restaurant_phone:   restaurant?.phone ?? '',
      rider_name:         riderJoin?.users?.name ?? null,
      rider_phone:        riderJoin?.users?.phone ?? null,
      rider_vehicle_type: riderJoin?.vehicle_type ?? null,
      rider_vehicle_plate: riderJoin?.vehicle_plate ?? null,
      restaurants: undefined,
      riders: undefined,
      status_history: history ?? [],
    });

  } catch (err) {
    console.error('[admin/orders/[id] GET]', err);
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
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await req.json() as { status?: string; rider_id?: string | null; notes?: string };

    // Obtener estado actual
    const { data: current, error: fetchErr } = await supabase
      .from('orders')
      .select('status, rider_id')
      .eq('id', id)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    // Cambio de estado
    if (body.status !== undefined) {
      const allowed = VALID_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json({
          error: `Transición inválida: ${current.status} → ${body.status}`,
        }, { status: 422 });
      }
      updates.status = body.status;
    }

    // Asignar/reasignar rider
    if ('rider_id' in body) {
      updates.rider_id = body.rider_id;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ order: updated });

  } catch (err) {
    console.error('[admin/orders/[id] PATCH]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
