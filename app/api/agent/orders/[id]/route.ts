import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

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
      .select('role, city_id, is_active')
      .eq('id', user.id)
      .single();

    if (!userData || !userData.is_active || !AGENT_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch order
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Validate city access
    if (userData.role === 'city_admin' && userData.city_id !== order.city_id) {
      return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
    }
    if (userData.role === 'agent') {
      const { data: ac } = await supabase
        .from('agent_cities')
        .select('id')
        .eq('user_id', user.id)
        .eq('city_id', order.city_id)
        .limit(1);

      if (!ac || ac.length === 0) {
        return NextResponse.json({ error: 'Sin acceso a esta ciudad' }, { status: 403 });
      }
    }

    // Fetch restaurant
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('id, name, phone, address, slug')
      .eq('id', order.restaurant_id)
      .single();

    // Fetch rider (if assigned)
    let riderData: { name: string; phone: string | null } | null = null;
    if (order.rider_id) {
      const { data: rider } = await serviceClient
        .from('riders')
        .select('id, user_id')
        .eq('id', order.rider_id)
        .single();

      if (rider) {
        const { data: riderUser } = await serviceClient
          .from('users')
          .select('name, phone')
          .eq('id', rider.user_id)
          .single();

        riderData = riderUser ? { name: riderUser.name, phone: riderUser.phone } : null;
      }
    }

    // Fetch status history
    const { data: history } = await serviceClient
      .from('order_status_history')
      .select('id, from_status, to_status, changed_by_user_id, notes, created_at')
      .eq('order_id', id)
      .order('created_at', { ascending: true });

    // Flatten user names in history
    const historyUserIds = [...new Set(
      (history ?? []).map((h: Record<string, unknown>) => h.changed_by_user_id).filter(Boolean) as string[]
    )];

    let historyUserMap: Record<string, string> = {};
    if (historyUserIds.length > 0) {
      const { data: historyUsers } = await serviceClient
        .from('users')
        .select('id, name')
        .in('id', historyUserIds);

      for (const u of historyUsers ?? []) {
        historyUserMap[u.id] = u.name;
      }
    }

    const flatHistory = (history ?? []).map((h: Record<string, unknown>) => ({
      id: h.id,
      from_status: h.from_status,
      to_status: h.to_status,
      changed_by_name: h.changed_by_user_id ? (historyUserMap[h.changed_by_user_id as string] ?? null) : null,
      notes: h.notes,
      created_at: h.created_at,
    }));

    return NextResponse.json({
      id: order.id,
      code: order.code,
      status: order.status,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      restaurant_name: restaurant?.name ?? 'Desconocido',
      restaurant_id: order.restaurant_id,
      restaurant_phone: restaurant?.phone ?? null,
      restaurant_address: restaurant?.address ?? null,
      rider_name: riderData?.name ?? null,
      rider_id: order.rider_id,
      rider_phone: riderData?.phone ?? null,
      items: order.items,
      subtotal_cents: order.subtotal_cents,
      delivery_fee_cents: order.delivery_fee_cents,
      service_fee_cents: order.service_fee_cents,
      discount_cents: order.discount_cents,
      total_cents: order.total_cents,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      actual_payment_method: order.actual_payment_method,
      delivery_address: order.delivery_address,
      delivery_lat: order.delivery_lat,
      delivery_lng: order.delivery_lng,
      delivery_instructions: order.delivery_instructions,
      notes: order.notes,
      fee_is_manual: order.fee_is_manual,
      fee_calculated_cents: order.fee_calculated_cents,
      source: order.source,
      rejection_reason: order.rejection_reason,
      rejection_notes: order.rejection_notes,
      customer_rating: order.customer_rating,
      customer_comment: order.customer_comment,
      delivery_proof_url: order.delivery_proof_url,
      payment_proof_url: order.payment_proof_url,
      created_at: order.created_at,
      confirmed_at: order.confirmed_at,
      restaurant_confirmed_at: order.restaurant_confirmed_at,
      ready_at: order.ready_at,
      assigned_at: order.assigned_at,
      picked_up_at: order.picked_up_at,
      in_transit_at: order.in_transit_at,
      delivered_at: order.delivered_at,
      cancelled_at: order.cancelled_at,
      updated_at: order.updated_at,
      status_history: flatHistory,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
