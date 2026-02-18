import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId } = await params;
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

    const body = await req.json() as { rider_id: string };
    const { rider_id } = body;

    if (!rider_id) {
      return NextResponse.json({ error: 'rider_id requerido' }, { status: 400 });
    }

    // Verificar que el rider está online y disponible
    const { data: rider, error: riderErr } = await supabase
      .from('riders')
      .select('id, is_online, is_available, current_order_id')
      .eq('id', rider_id)
      .single();

    if (riderErr || !rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    if (!rider.is_online) {
      return NextResponse.json({ error: 'El rider no está en línea' }, { status: 422 });
    }

    if (!rider.is_available || rider.current_order_id) {
      return NextResponse.json({ error: 'El rider ya tiene un pedido activo' }, { status: 422 });
    }

    // Actualizar pedido: asignar rider + cambiar estado a assigned_rider
    const { data: updatedOrder, error: orderErr } = await supabase
      .from('orders')
      .update({
        rider_id,
        status: 'assigned_rider',
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderErr) throw orderErr;

    // El trigger lock_rider_on_assignment en la BD maneja:
    // riders.is_available = false + riders.current_order_id = orderId
    // Pero lo hacemos manualmente también como seguridad
    await supabase
      .from('riders')
      .update({
        is_available: false,
        current_order_id: orderId,
      })
      .eq('id', rider_id);

    return NextResponse.json({ order: updatedOrder });

  } catch (err) {
    console.error('[admin/orders/[id]/assign-rider PATCH]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
