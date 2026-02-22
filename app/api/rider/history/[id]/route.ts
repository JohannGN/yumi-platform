import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'rider') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { data: rider } = await supabase
      .from('riders')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    // FIX-6: Added delivery_fee_cents to select (for earnings display in frontend)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, code, status,
        customer_name, customer_phone,
        delivery_address, delivery_instructions,
        items,
        subtotal_cents, delivery_fee_cents, service_fee_cents,
        discount_cents, total_cents, rider_bonus_cents,
        payment_method, actual_payment_method, payment_status,
        delivery_proof_url, payment_proof_url,
        source,
        created_at, confirmed_at, restaurant_confirmed_at,
        ready_at, assigned_at, picked_up_at, in_transit_at, delivered_at,
        customer_rating, customer_comment,
        estimated_prep_time_minutes,
        restaurant:restaurants!orders_restaurant_id_fkey(name, address, phone)
      `)
      .eq('id', id)
      .eq('rider_id', rider.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (err) {
    console.error('GET /api/rider/history/[id] error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
