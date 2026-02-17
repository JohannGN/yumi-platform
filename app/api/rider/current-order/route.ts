import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verify rider role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'rider') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Get rider
    const { data: rider, error: riderError } = await supabase
      .from('riders')
      .select('id, current_order_id')
      .eq('user_id', user.id)
      .single();

    if (riderError || !rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    // No active order
    if (!rider.current_order_id) {
      return NextResponse.json(null, { status: 404 });
    }

    // Get order with restaurant join
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants!orders_restaurant_id_fkey(
          name, address, lat, lng, phone
        )
      `)
      .eq('id', rider.current_order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Verify this order belongs to this rider
    if (order.rider_id !== rider.id) {
      return NextResponse.json({ error: 'Pedido no asignado a este rider' }, { status: 403 });
    }

    const restaurant = order.restaurant as {
      name: string;
      address: string;
      lat: number;
      lng: number;
      phone: string | null;
    } | null;

    return NextResponse.json({
      id: order.id,
      code: order.code,
      status: order.status,
      // Cliente
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      delivery_address: order.delivery_address,
      delivery_lat: parseFloat(String(order.delivery_lat)),
      delivery_lng: parseFloat(String(order.delivery_lng)),
      delivery_instructions: order.delivery_instructions,
      // Restaurante
      restaurant_id: order.restaurant_id,
      restaurant_name: restaurant?.name ?? '',
      restaurant_address: restaurant?.address ?? '',
      restaurant_lat: restaurant?.lat ? parseFloat(String(restaurant.lat)) : 0,
      restaurant_lng: restaurant?.lng ? parseFloat(String(restaurant.lng)) : 0,
      restaurant_phone: restaurant?.phone ?? null,
      // Items
      items: order.items ?? [],
      // Montos
      subtotal_cents: order.subtotal_cents,
      delivery_fee_cents: order.delivery_fee_cents,
      service_fee_cents: order.service_fee_cents,
      total_cents: order.total_cents,
      rider_bonus_cents: order.rider_bonus_cents,
      // Pago
      payment_method: order.payment_method,
      actual_payment_method: order.actual_payment_method,
      payment_status: order.payment_status,
      // Evidencia
      delivery_proof_url: order.delivery_proof_url,
      payment_proof_url: order.payment_proof_url,
      // Timestamps
      created_at: order.created_at,
      confirmed_at: order.confirmed_at,
      restaurant_confirmed_at: order.restaurant_confirmed_at,
      ready_at: order.ready_at,
      assigned_at: order.assigned_at,
      picked_up_at: order.picked_up_at,
      in_transit_at: order.in_transit_at,
      // Estimados
      estimated_prep_time_minutes: order.estimated_prep_time_minutes,
      estimated_delivery_time_minutes: order.estimated_delivery_time_minutes,
      source: order.source,
    });
  } catch (err) {
    console.error('GET /api/rider/current-order error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
