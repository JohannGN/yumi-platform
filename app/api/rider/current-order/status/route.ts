import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Valid status transitions for rider
const VALID_TRANSITIONS: Record<string, string[]> = {
  assigned_rider: ['picked_up'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
};

export async function PATCH(request: NextRequest) {
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
    const { data: rider } = await supabase
      .from('riders')
      .select('id, current_order_id')
      .eq('user_id', user.id)
      .single();

    if (!rider || !rider.current_order_id) {
      return NextResponse.json({ error: 'No tienes pedido activo' }, { status: 400 });
    }

    // Get current order
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, rider_id, payment_method')
      .eq('id', rider.current_order_id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Verify order belongs to this rider
    if (order.rider_id !== rider.id) {
      return NextResponse.json({ error: 'Pedido no asignado a ti' }, { status: 403 });
    }

    const body = await request.json();
    const {
      status: newStatus,
      actual_payment_method,
      delivery_proof_url,
      payment_proof_url,
    } = body as {
      status: string;
      actual_payment_method?: string;
      delivery_proof_url?: string;
      payment_proof_url?: string;
    };

    // Validate status transition
    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `No se puede cambiar de "${order.status}" a "${newStatus}"`,
        },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    // For 'delivered' status: validate evidence
    if (newStatus === 'delivered') {
      // Delivery proof is ALWAYS required
      if (!delivery_proof_url) {
        return NextResponse.json(
          { error: 'Foto de entrega obligatoria' },
          { status: 400 }
        );
      }
      updateData.delivery_proof_url = delivery_proof_url;

      // Determine actual payment method
      const actualMethod = actual_payment_method || order.payment_method;
      updateData.actual_payment_method = actualMethod;

      // Payment proof required for non-cash methods
      if (['pos', 'yape', 'plin'].includes(actualMethod)) {
        if (!payment_proof_url) {
          return NextResponse.json(
            { error: 'Foto de pago obligatoria para este método' },
            { status: 400 }
          );
        }
        updateData.payment_proof_url = payment_proof_url;
      }

      // Mark payment as paid
      updateData.payment_status = 'paid';
    }

    // For intermediate statuses, just store actual_payment_method if provided
    if (actual_payment_method && newStatus !== 'delivered') {
      updateData.actual_payment_method = actual_payment_method;
    }

    // Use service role for updates that trigger status change functions
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateError } = await serviceSupabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id);

    if (updateError) {
      console.error('Order status update error:', updateError);
      return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  } catch (err) {
    console.error('PATCH /api/rider/current-order/status error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
