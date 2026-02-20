import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_confirmation: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['assigned_rider', 'cancelled'],
  assigned_rider: ['picked_up', 'cancelled'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
  delivered: [],
  rejected: [],
  cancelled: [],
};

// ─── GET — detalle de pedido (con historial) ──────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!userData || !['owner', 'city_admin', 'agent'].includes(userData.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // ── Fetch pedido completo ──────────────────────────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, code, status, source,
        restaurant_id, rider_id,
        customer_name, customer_phone,
        delivery_address, delivery_lat, delivery_lng, delivery_instructions,
        items,
        subtotal_cents, delivery_fee_cents, service_fee_cents,
        discount_cents, total_cents, rider_bonus_cents,
        payment_method, actual_payment_method, payment_status,
        delivery_proof_url, payment_proof_url,
        rejection_reason, rejection_notes,
        customer_rating, customer_comment,
        fee_is_manual, fee_calculated_cents,
        notes,
        created_at, confirmed_at, restaurant_confirmed_at,
        ready_at, assigned_at, picked_up_at,
        in_transit_at, delivered_at, cancelled_at,
        restaurants!inner(id, name, slug),
        riders(id, users(name, phone))
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // City admin solo ve su ciudad
    if (userData.role === 'city_admin' && userData.city_id) {
      const { data: orderCity } = await supabase
        .from('orders')
        .select('city_id')
        .eq('id', orderId)
        .single();
      if (orderCity?.city_id !== userData.city_id) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
    }

    // ── Fetch historial de estados ────────────────────────────────────────────
    const { data: history } = await supabase
      .from('order_status_history')
      .select('id, from_status, to_status, notes, changed_by_user_id, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    // ── Enriquecer historial con nombre del usuario ───────────────────────────
    const historyWithUsers = await Promise.all(
      (history ?? []).map(async (h) => {
        if (!h.changed_by_user_id) return { ...h, changed_by_name: null };
        const { data: changedBy } = await supabase
          .from('users')
          .select('name, role')
          .eq('id', h.changed_by_user_id)
          .single();
        return {
          ...h,
          changed_by_name: changedBy?.name ?? null,
          changed_by_role: changedBy?.role ?? null,
        };
      })
    );

    // ── Transiciones válidas ──────────────────────────────────────────────────
    const validNextStatuses = VALID_TRANSITIONS[order.status] ?? [];

    return NextResponse.json({
      order,
      history: historyWithUsers,
      valid_next_statuses: validNextStatuses,
    });
  } catch (err) {
    console.error('[admin/orders/[id] GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ─── PATCH — cambiar estado / cancelar pedido ─────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['owner', 'city_admin', 'agent'].includes(userData.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await req.json();
    const { status: newStatus, notes, rejection_reason, rejection_notes } = body;

    // Obtener estado actual
    const { data: current } = await supabase
      .from('orders')
      .select('status, rider_id')
      .eq('id', orderId)
      .single();

    if (!current) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Validar transición
    const allowed = VALID_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Transición inválida: ${current.status} → ${newStatus}` },
        { status: 400 }
      );
    }

    // Construir update
    const updates: Record<string, unknown> = { status: newStatus };
    if (notes) updates.notes = notes;
    if (newStatus === 'rejected') {
      updates.rejection_reason = rejection_reason ?? 'other';
      updates.rejection_notes = rejection_notes ?? null;
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select('id, code, status')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    console.error('[admin/orders/[id] PATCH]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
