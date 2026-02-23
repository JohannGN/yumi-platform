import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
// [CREDITOS-1B] Import del procesador de créditos
import { processDeliveryCredits } from '@/lib/credits/process-delivery';

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

    // For 'delivered' status: validate evidence + recalculate POS surcharge
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

      // Recalculate POS surcharge if payment method changed
      const originalMethod = order.payment_method;
      if (actualMethod !== originalMethod) {
        // Fetch full order for recalculation
        const { data: fullOrder } = await supabase
          .from('orders')
          .select('subtotal_cents, delivery_fee_cents, service_fee_cents, total_cents')
          .eq('id', order.id)
          .single();

        if (fullOrder) {
          const roundUpCents = (c: number) => Math.ceil(c / 10) * 10;
          let newServiceFee = 0;

          if (actualMethod === 'pos') {
            // Changed TO pos → add surcharge
            const { data: settings } = await supabase
              .from('platform_settings')
              .select('pos_surcharge_enabled, pos_commission_rate, pos_igv_rate')
              .single();

            if (settings?.pos_surcharge_enabled) {
              const base = fullOrder.subtotal_cents + fullOrder.delivery_fee_cents;
              newServiceFee = roundUpCents(
                Math.round(base * settings.pos_commission_rate * (1 + settings.pos_igv_rate))
              );
            }
          }
          // If changed FROM pos to cash/yape/plin → newServiceFee stays 0 (remove surcharge)

          updateData.service_fee_cents = newServiceFee;
          updateData.total_cents = roundUpCents(
            fullOrder.subtotal_cents + fullOrder.delivery_fee_cents + newServiceFee
          );
        }
      }

      // =========================================================
      // [CREDITOS-1B] Procesar créditos ANTES de cambiar status
      // =========================================================
      // Guardar actual_payment_method primero (process-delivery lo necesita)
      const serviceSupabaseForCredits = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Asegurar que actual_payment_method esté guardado antes de procesar créditos
      await serviceSupabaseForCredits
        .from('orders')
        .update({ actual_payment_method: actualMethod })
        .eq('id', order.id);

      const creditsResult = await processDeliveryCredits(order.id, serviceSupabaseForCredits);

      if (!creditsResult.success) {
        console.error(
          `[CREDITS] Failed for order ${order.id}:`,
          creditsResult.error
        );
        return NextResponse.json(
          { error: `Error procesando créditos: ${creditsResult.error}` },
          { status: 500 }
        );
      }

      console.log(
        `[CREDITS] Order ${order.id} processed:`,
        `rest_commission=${creditsResult.restaurant_commission_cents}`,
        `yumi_delivery=${creditsResult.yumi_delivery_commission_cents}`,
        `rider_delivery=${creditsResult.rider_delivery_commission_cents}`,
        `food_debit=${creditsResult.rider_food_debit_cents}`,
        `comm_debit=${creditsResult.rider_commission_debit_cents}`,
        `rest_credit=${creditsResult.restaurant_credit_cents}`
      );
      // =========================================================
      // [FIN CREDITOS-1B]
      // =========================================================

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
