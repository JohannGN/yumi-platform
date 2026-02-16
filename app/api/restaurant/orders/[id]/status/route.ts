// ============================================================
// PATCH /api/restaurant/orders/[id]/status
// Update order status: accept, reject, preparing, ready
// Chat 5 — Fragment 3/7
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Valid status transitions for restaurant
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_confirmation: ['confirmed', 'rejected'],
  confirmed: ['preparing'],
  preparing: ['ready'],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // 1. Auth
    const supabase = await createAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Get restaurant
    const serviceClient = createServiceClient();
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Sin restaurante' }, { status: 404 });
    }

    // 3. Get current order
    const { data: order } = await serviceClient
      .from('orders')
      .select('id, status, restaurant_id')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (order.restaurant_id !== restaurant.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 4. Parse body
    const body = await request.json();
    const { status: newStatus, rejection_reason, rejection_notes } = body;

    if (!newStatus) {
      return NextResponse.json({ error: 'Status requerido' }, { status: 400 });
    }

    // 5. Validate transition
    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `No se puede cambiar de "${order.status}" a "${newStatus}"` },
        { status: 400 }
      );
    }

    // 6. Rejection requires reason
    if (newStatus === 'rejected' && !rejection_reason) {
      return NextResponse.json(
        { error: 'Motivo de rechazo requerido' },
        { status: 400 }
      );
    }

    // 7. Build update
    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'rejected') {
      updateData.rejection_reason = rejection_reason;
      if (rejection_notes) {
        updateData.rejection_notes = rejection_notes;
      }
    }

    // 8. Update order
    const { data: updatedOrder, error: updateError } = await serviceClient
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('id, code, status, updated_at')
      .single();

    if (updateError) {
      console.error('[/api/restaurant/orders/status] Update error:', updateError);
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (err) {
    console.error('[/api/restaurant/orders/status] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
