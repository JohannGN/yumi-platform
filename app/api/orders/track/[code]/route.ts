import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
    }

    const upperCode = code.toUpperCase();

    // Fetch order with restaurant info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        code,
        status,
        customer_name,
        customer_phone,
        delivery_address,
        delivery_lat,
        delivery_lng,
        delivery_instructions,
        items,
        subtotal_cents,
        delivery_fee_cents,
        service_fee_cents,
        discount_cents,
        total_cents,
        payment_method,
        payment_status,
        rejection_reason,
        rejection_notes,
        source,
        rider_id,
        customer_rating,
        customer_comment,
        estimated_prep_time_minutes,
        estimated_delivery_time_minutes,
        created_at,
        confirmed_at,
        restaurant_confirmed_at,
        ready_at,
        assigned_at,
        picked_up_at,
        in_transit_at,
        delivered_at,
        cancelled_at,
        restaurant_id,
        restaurants (
          id,
          name,
          slug,
          logo_url,
          lat,
          lng,
          phone,
          theme_color
        )
      `)
      .eq('code', upperCode)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Fetch status history
    const { data: statusHistory } = await supabase
      .from('order_status_history')
      .select('id, from_status, to_status, created_at, notes')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true });

    // Fetch rider info if assigned
    let riderInfo = null;
    if (order.rider_id) {
      const { data: rider } = await supabase
        .from('riders')
        .select(`
          id,
          current_lat,
          current_lng,
          last_location_update,
          vehicle_type,
          users (
            name,
            phone,
            avatar_url
          )
        `)
        .eq('id', order.rider_id)
        .single();

      if (rider) {
        riderInfo = {
          id: rider.id,
          name: (rider.users as any)?.name || 'Rider',
          phone: (rider.users as any)?.phone || null,
          avatar_url: (rider.users as any)?.avatar_url || null,
          vehicle_type: rider.vehicle_type,
          current_lat: rider.current_lat,
          current_lng: rider.current_lng,
          last_location_update: rider.last_location_update,
        };
      }
    }

    return NextResponse.json({
      order: {
        ...order,
        restaurant: order.restaurants,
        restaurants: undefined,
      },
      status_history: statusHistory || [],
      rider: riderInfo,
    });
  } catch (err) {
    console.error('Track order error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
