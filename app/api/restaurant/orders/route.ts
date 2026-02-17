// ============================================================
// GET /api/restaurant/orders — Pedidos activos del restaurante
// SEGURIDAD: Stripea datos del cliente antes de enviar
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeOrdersForRestaurant } from '@/lib/utils/sanitize-order';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener restaurante del usuario
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    // Obtener status filter del query param (opcional)
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    // Query base: pedidos activos (no cart, no cancelled, no delivered)
    let query = supabase
      .from('orders')
      .select(`
        id,
        code,
        city_id,
        restaurant_id,
        rider_id,
        customer_name,
        customer_phone,
        delivery_address,
        delivery_lat,
        delivery_lng,
        delivery_instructions,
        delivery_fee_cents,
        delivery_zone_id,
        service_fee_cents,
        discount_cents,
        total_cents,
        rider_bonus_cents,
        confirmation_token,
        confirmation_expires_at,
        items,
        subtotal_cents,
        status,
        rejection_reason,
        rejection_notes,
        payment_method,
        payment_status,
        source,
        created_at,
        confirmed_at,
        restaurant_confirmed_at,
        ready_at,
        assigned_at,
        picked_up_at,
        in_transit_at,
        delivered_at,
        cancelled_at,
        estimated_prep_time_minutes,
        estimated_delivery_time_minutes,
        customer_rating,
        customer_comment,
        updated_at
      `)
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    } else {
      // Por defecto: pedidos activos (excluir cart, delivered, cancelled)
      query = query.not('status', 'in', '("cart","delivered","cancelled")');
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error('Error fetching restaurant orders:', ordersError);
      return NextResponse.json({ error: 'Error obteniendo pedidos' }, { status: 500 });
    }

    // 🔒 SEGURIDAD: Stripear datos sensibles del cliente
    const sanitizedOrders = sanitizeOrdersForRestaurant(orders || []);

    // Obtener info del rider para pedidos que tienen rider asignado
    const riderIds = [...new Set((orders || []).filter(o => o.rider_id).map(o => o.rider_id))];
    let ridersMap: Record<string, string> = {};

    if (riderIds.length > 0) {
      const { data: riders } = await supabase
        .from('riders')
        .select('id, user_id')
        .in('id', riderIds);

      if (riders && riders.length > 0) {
        const userIds = riders.map(r => r.user_id);
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);

        if (users) {
          for (const rider of riders) {
            const riderUser = users.find(u => u.id === rider.user_id);
            if (riderUser) {
              ridersMap[rider.id] = riderUser.name;
            }
          }
        }
      }
    }

    // Agregar nombre del rider a pedidos sanitizados
    const ordersWithRider = sanitizedOrders.map(order => ({
      ...order,
      rider_name: order.rider_id ? (ridersMap[order.rider_id as string] || null) : null,
    }));

    return NextResponse.json({ orders: ordersWithRider });
  } catch (error) {
    console.error('Unexpected error in restaurant orders:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
