// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// lib/credits/helpers.ts
// Helpers compartidos para operaciones de créditos
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js';

// -------------------------------------------------------
// Tipos internos
// -------------------------------------------------------

export interface CreditBalance {
  balance_cents: number;
  total_deposited_cents: number;
  total_spent_cents: number;
}

export interface RestaurantCreditBalance {
  balance_cents: number;
  total_earned_cents: number;
  total_liquidated_cents: number;
}

export interface TransactionInsert {
  entity_type: 'rider' | 'restaurant';
  entity_id: string;
  order_id?: string | null;
  recharge_code_id?: string | null;
  transaction_type: string;
  amount_cents: number;
  balance_before_cents: number;
  balance_after_cents: number;
  notes?: string | null;
  created_by?: string | null;
}

// -------------------------------------------------------
// Rider credit operations
// -------------------------------------------------------

/**
 * Lee el saldo actual del rider. Retorna null si no existe.
 */
export async function getRiderCreditBalance(
  supabase: SupabaseClient,
  riderId: string
): Promise<CreditBalance | null> {
  const { data, error } = await supabase
    .from('rider_credits')
    .select('balance_cents, total_deposited_cents, total_spent_cents')
    .eq('rider_id', riderId)
    .single();

  if (error || !data) return null;
  return data as CreditBalance;
}

/**
 * Actualiza el saldo del rider y registra la transacción.
 * Retorna el nuevo saldo o error.
 */
export async function updateRiderCredits(
  supabase: SupabaseClient,
  riderId: string,
  deltaCents: number,
  field: 'total_deposited_cents' | 'total_spent_cents',
  transaction: Omit<TransactionInsert, 'balance_before_cents' | 'balance_after_cents'>
): Promise<{ newBalance: number; error?: string }> {
  // Leer saldo actual
  const current = await getRiderCreditBalance(supabase, riderId);
  if (!current) {
    return { newBalance: 0, error: 'Rider credits not found' };
  }

  const newBalance = current.balance_cents + deltaCents;
  const absAmount = Math.abs(deltaCents);

  // Actualizar saldo
  const updatePayload: Record<string, number> = {
    balance_cents: newBalance,
  };
  if (field === 'total_deposited_cents') {
    updatePayload.total_deposited_cents = current.total_deposited_cents + absAmount;
  } else {
    updatePayload.total_spent_cents = current.total_spent_cents + absAmount;
  }

  const { error: updateError } = await supabase
    .from('rider_credits')
    .update(updatePayload)
    .eq('rider_id', riderId);

  if (updateError) {
    return { newBalance: current.balance_cents, error: updateError.message };
  }

  // Insertar transacción
  const { error: txError } = await supabase
    .from('credit_transactions')
    .insert({
      ...transaction,
      balance_before_cents: current.balance_cents,
      balance_after_cents: newBalance,
    });

  if (txError) {
    console.error('[CREDITS] Transaction insert failed:', txError);
  }

  return { newBalance };
}

// -------------------------------------------------------
// Restaurant credit operations
// -------------------------------------------------------

/**
 * Lee el saldo actual del restaurante. Retorna null si no existe.
 */
export async function getRestaurantCreditBalance(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<RestaurantCreditBalance | null> {
  const { data, error } = await supabase
    .from('restaurant_credits')
    .select('balance_cents, total_earned_cents, total_liquidated_cents')
    .eq('restaurant_id', restaurantId)
    .single();

  if (error || !data) return null;
  return data as RestaurantCreditBalance;
}

/**
 * Acredita créditos a un restaurante y registra la transacción.
 */
export async function creditRestaurant(
  supabase: SupabaseClient,
  restaurantId: string,
  amountCents: number,
  transaction: Omit<TransactionInsert, 'balance_before_cents' | 'balance_after_cents' | 'entity_type' | 'entity_id'>
): Promise<{ newBalance: number; error?: string }> {
  let current = await getRestaurantCreditBalance(supabase, restaurantId);

  // Si no existe, crear con balance 0
  if (!current) {
    const { error: insertError } = await supabase
      .from('restaurant_credits')
      .insert({
        restaurant_id: restaurantId,
        balance_cents: 0,
        total_earned_cents: 0,
        total_liquidated_cents: 0,
      });

    if (insertError) {
      return { newBalance: 0, error: `Failed to create restaurant credits: ${insertError.message}` };
    }
    current = { balance_cents: 0, total_earned_cents: 0, total_liquidated_cents: 0 };
  }

  const newBalance = current.balance_cents + amountCents;

  const updatePayload: Record<string, number> = {
    balance_cents: newBalance,
  };

  if (amountCents > 0) {
    updatePayload.total_earned_cents = current.total_earned_cents + amountCents;
  } else {
    updatePayload.total_liquidated_cents = current.total_liquidated_cents + Math.abs(amountCents);
  }

  const { error: updateError } = await supabase
    .from('restaurant_credits')
    .update(updatePayload)
    .eq('restaurant_id', restaurantId);

  if (updateError) {
    return { newBalance: current.balance_cents, error: updateError.message };
  }

  // Insertar transacción
  const { error: txError } = await supabase
    .from('credit_transactions')
    .insert({
      ...transaction,
      entity_type: 'restaurant' as const,
      entity_id: restaurantId,
      balance_before_cents: current.balance_cents,
      balance_after_cents: newBalance,
    });

  if (txError) {
    console.error('[CREDITS] Restaurant transaction insert failed:', txError);
  }

  return { newBalance };
}

// -------------------------------------------------------
// Pagination helper
// -------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export function parsePagination(searchParams: URLSearchParams): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// -------------------------------------------------------
// Commission calculation helpers
// -------------------------------------------------------

/**
 * Calcula la comisión del restaurante según su modo.
 * floor() para la comisión → residuo beneficia al restaurante.
 */
export function calculateRestaurantCommission(
  subtotalCents: number,
  commissionPercentage: number,
  commissionMode: string,
  items: Array<{ total_cents: number; commission_percentage?: number | null }>
): number {
  if (commissionMode === 'per_item') {
    let total = 0;
    for (const item of items) {
      const pct = item.commission_percentage ?? commissionPercentage;
      total += Math.floor(item.total_cents * pct / 100);
    }
    return total;
  }

  // Global
  return Math.floor(subtotalCents * commissionPercentage / 100);
}

/**
 * Calcula el split del delivery fee entre YUMI y rider.
 * floor() para YUMI → residuo beneficia al rider.
 */
export function calculateDeliverySplit(
  deliveryFeeCents: number,
  riderPayType: string,
  riderCommissionPercentage: number | null
): { yumiCents: number; riderCents: number } {
  if (riderPayType === 'commission' && riderCommissionPercentage !== null) {
    const yumiPct = 100 - riderCommissionPercentage;
    const yumiCents = Math.floor(deliveryFeeCents * yumiPct / 100);
    const riderCents = deliveryFeeCents - yumiCents;
    return { yumiCents, riderCents };
  }

  // Fixed salary: YUMI se queda todo
  return { yumiCents: deliveryFeeCents, riderCents: 0 };
}
