// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// lib/credits/process-delivery.ts
// Corazón del sistema financiero: procesa créditos al entregar pedido
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js';
import {
  getRiderCreditBalance,
  creditRestaurant,
  calculateRestaurantCommission,
  calculateDeliverySplit,
} from './helpers';

// -------------------------------------------------------
// Tipos internos
// -------------------------------------------------------

interface OrderData {
  id: string;
  code: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  rounding_surplus_cents: number;
  payment_method: string;
  actual_payment_method: string | null;
  items: Array<{
    item_id: string;
    total_cents: number;
    commission_percentage?: number | null;
  }>;
  restaurant_id: string;
  rider_id: string | null;
}

// -------------------------------------------------------
// Resultado público
// -------------------------------------------------------

export interface DeliveryCreditsResult {
  success: boolean;
  error?: string;
  restaurant_commission_cents: number;
  yumi_delivery_commission_cents: number;
  rider_delivery_commission_cents: number;
  rider_food_debit_cents: number;
  rider_commission_debit_cents: number;
  restaurant_credit_cents: number;
}

// -------------------------------------------------------
// Función principal
// -------------------------------------------------------

/**
 * Procesa TODA la lógica de créditos al entregar un pedido.
 * Se ejecuta ANTES de cambiar status a 'delivered'.
 *
 * 1. Calcula comisiones (restaurante + delivery split)
 * 2. Snapshot en orders (4 columnas)
 * 3. Descuenta créditos rider (si commission + cash)
 * 4. Acredita restaurante (SIEMPRE)
 * 5. Inserta credit_transactions
 *
 * Si falla → NO cambiar status a delivered.
 */
export async function processDeliveryCredits(
  orderId: string,
  supabase: SupabaseClient
): Promise<DeliveryCreditsResult> {
  const fail = (error: string): DeliveryCreditsResult => ({
    success: false,
    error,
    restaurant_commission_cents: 0,
    yumi_delivery_commission_cents: 0,
    rider_delivery_commission_cents: 0,
    rider_food_debit_cents: 0,
    rider_commission_debit_cents: 0,
    restaurant_credit_cents: 0,
  });

  try {
    // =====================================================
    // PASO 1: Obtener datos
    // =====================================================

    // a. Order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        id, code, subtotal_cents, delivery_fee_cents, total_cents,
        rounding_surplus_cents, payment_method, actual_payment_method,
        items, restaurant_id, rider_id
      `)
      .eq('id', orderId)
      .single();

    if (orderErr || !order) return fail(`Order not found: ${orderErr?.message}`);
    const o = order as OrderData;
    if (!o.rider_id) return fail('Order has no rider assigned');

    // b. Restaurant
    const { data: restaurant, error: restErr } = await supabase
      .from('restaurants')
      .select('id, commission_percentage, commission_mode')
      .eq('id', o.restaurant_id)
      .single();

    if (restErr || !restaurant) return fail(`Restaurant not found: ${restErr?.message}`);

    // c. Rider
    const { data: rider, error: riderErr } = await supabase
      .from('riders')
      .select('id, pay_type, commission_percentage')
      .eq('id', o.rider_id)
      .single();

    if (riderErr || !rider) return fail(`Rider not found: ${riderErr?.message}`);

    // =====================================================
    // PASO 2: Calcular comisiones
    // =====================================================

    // d. Comisión restaurante
    const restaurantCommissionCents = calculateRestaurantCommission(
      o.subtotal_cents,
      restaurant.commission_percentage,
      restaurant.commission_mode,
      o.items
    );

    // e. Split delivery fee
    const { yumiCents: yumiDelivery, riderCents: riderDelivery } = calculateDeliverySplit(
      o.delivery_fee_cents,
      rider.pay_type,
      rider.commission_percentage
    );

    // =====================================================
    // PASO 3: Snapshot en orders (4 columnas)
    // =====================================================

    const { error: snapshotErr } = await supabase
      .from('orders')
      .update({
        restaurant_commission_cents: restaurantCommissionCents,
        yumi_delivery_commission_cents: yumiDelivery,
        rider_delivery_commission_cents: riderDelivery,
        // rounding_surplus_cents ya calculado al crear pedido
      })
      .eq('id', orderId);

    if (snapshotErr) return fail(`Snapshot update failed: ${snapshotErr.message}`);

    // =====================================================
    // PASO 4: Créditos rider (solo commission + cash)
    // =====================================================

    let riderFoodDebit = 0;
    let riderCommissionDebit = 0;

    if (rider.pay_type === 'commission') {
      const actualMethod = o.actual_payment_method || o.payment_method;

      if (actualMethod === 'cash') {
        riderFoodDebit = o.subtotal_cents;
        riderCommissionDebit = yumiDelivery;
        const totalDebit = riderFoodDebit + riderCommissionDebit;

        // Leer saldo actual
        const riderCredits = await getRiderCreditBalance(supabase, rider.id);
        if (!riderCredits) return fail('Rider credits record not found');

        const currentBalance = riderCredits.balance_cents;

        // REGLA #8: Créditos insuficientes → PERMITIR pero loguear warning
        if (currentBalance < totalDebit) {
          console.warn(
            `[CREDITS WARNING] Rider ${rider.id} balance=${currentBalance} ` +
            `needs=${totalDebit} order=${o.code}. Proceeding anyway.`
          );
        }

        const balanceAfterFood = currentBalance - riderFoodDebit;
        const balanceAfterAll = balanceAfterFood - riderCommissionDebit;

        // Actualizar saldo rider (una sola operación)
        const { error: balanceErr } = await supabase
          .from('rider_credits')
          .update({
            balance_cents: balanceAfterAll,
            total_spent_cents: riderCredits.total_spent_cents + totalDebit,
          })
          .eq('rider_id', rider.id);

        if (balanceErr) return fail(`Rider credit update failed: ${balanceErr.message}`);

        // Transaction: food_debit
        await supabase.from('credit_transactions').insert({
          entity_type: 'rider',
          entity_id: rider.id,
          order_id: orderId,
          transaction_type: 'order_food_debit',
          amount_cents: -riderFoodDebit,
          balance_before_cents: currentBalance,
          balance_after_cents: balanceAfterFood,
          notes: `Porción comida pedido ${o.code}`,
        });

        // Transaction: commission_debit (solo si > 0)
        if (riderCommissionDebit > 0) {
          await supabase.from('credit_transactions').insert({
            entity_type: 'rider',
            entity_id: rider.id,
            order_id: orderId,
            transaction_type: 'order_commission_debit',
            amount_cents: -riderCommissionDebit,
            balance_before_cents: balanceAfterFood,
            balance_after_cents: balanceAfterAll,
            notes: `Comisión YUMI delivery pedido ${o.code}`,
          });
        }
      }
      // Si digital (yape/plin/pos): SIN movimiento créditos rider
    }
    // Si fixed_salary: NO tocar rider_credits

    // =====================================================
    // PASO 5: Acreditar restaurante (SIEMPRE)
    // =====================================================

    const restaurantCreditAmount = o.subtotal_cents - restaurantCommissionCents;

    if (restaurantCreditAmount > 0) {
      const { error: restCreditErr } = await creditRestaurant(
        supabase,
        o.restaurant_id,
        restaurantCreditAmount,
        {
          order_id: orderId,
          transaction_type: 'order_credit',
          amount_cents: restaurantCreditAmount,
          notes: `Crédito por pedido ${o.code}`,
        }
      );

      if (restCreditErr) {
        // No bloquear la entrega por error en créditos restaurante
        console.error(`[CREDITS] Restaurant credit failed: ${restCreditErr}`);
      }
    }

    // =====================================================
    // Resultado exitoso
    // =====================================================

    return {
      success: true,
      restaurant_commission_cents: restaurantCommissionCents,
      yumi_delivery_commission_cents: yumiDelivery,
      rider_delivery_commission_cents: riderDelivery,
      rider_food_debit_cents: riderFoodDebit,
      rider_commission_debit_cents: riderCommissionDebit,
      restaurant_credit_cents: restaurantCreditAmount,
    };
  } catch (err) {
    console.error('[CREDITS] processDeliveryCredits fatal:', err);
    return fail(err instanceof Error ? err.message : 'Unknown error');
  }
}
