// ============================================================
// YUMI PLATFORM — Credit System Types
// Versión: 1.0 (CREDITOS-1A)
// Fecha: 23 Feb 2026
// ============================================================
// Tipos para el modelo de créditos prepagados.
// Cubre: rider_credits, restaurant_credits, recharge_codes,
//        credit_transactions, restaurant_liquidations.
// ============================================================

// ============================================================
// ENUMS / UNION TYPES
// ============================================================

/** Tipos de transacción de créditos */
export type CreditTransactionType =
  | 'recharge'               // Rider deposita y canjea código
  | 'order_food_debit'       // Descuento porción comida (rider → restaurante)
  | 'order_commission_debit' // Descuento comisión YUMI del delivery (rider)
  | 'order_credit'           // Créditos ganados por pedido (restaurante)
  | 'liquidation'            // Pago diario al restaurante
  | 'refund'                 // Devolución por cancelación post-descuento
  | 'adjustment'             // Ajuste manual (admin/owner)
  | 'voided_recharge';       // Anulación de recarga

/** Estado del código de recarga */
export type RechargeCodeStatus = 'pending' | 'redeemed' | 'voided';

/** Método de pago para liquidación a restaurante */
export type LiquidationPaymentMethod = 'yape' | 'plin' | 'transfer' | 'cash';

/** Tipo de entidad en credit_transactions */
export type CreditEntityType = 'rider' | 'restaurant';

/** Estado de salud del saldo de créditos */
export type CreditHealthStatus = 'healthy' | 'warning' | 'critical' | 'blocked';


// ============================================================
// INTERFACES — Tablas de base de datos
// ============================================================

/** rider_credits — Saldo de créditos del rider */
export interface RiderCredits {
  id: string;
  rider_id: string;
  balance_cents: number;
  total_deposited_cents: number;
  total_spent_cents: number;
  created_at: string;
  updated_at: string;
}

/** restaurant_credits — Saldo de créditos del restaurante */
export interface RestaurantCredits {
  id: string;
  restaurant_id: string;
  balance_cents: number;
  total_earned_cents: number;
  total_liquidated_cents: number;
  created_at: string;
  updated_at: string;
}

/** recharge_codes — Códigos de recarga */
export interface RechargeCode {
  id: string;
  code: string;
  amount_cents: number;
  generated_by: string;
  intended_rider_id: string | null;
  redeemed_by: string | null;
  redeemed_at: string | null;
  status: RechargeCodeStatus;
  notes: string | null;
  created_at: string;
}

/** credit_transactions — Log maestro inmutable */
export interface CreditTransaction {
  id: string;
  entity_type: CreditEntityType;
  entity_id: string;
  order_id: string | null;
  recharge_code_id: string | null;
  transaction_type: CreditTransactionType;
  amount_cents: number;
  balance_before_cents: number;
  balance_after_cents: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/** restaurant_liquidations — Pagos diarios a restaurantes */
export interface RestaurantLiquidation {
  id: string;
  restaurant_id: string;
  date: string;
  amount_cents: number;
  credits_before: number;
  payment_method: LiquidationPaymentMethod;
  proof_url: string | null;
  liquidated_by: string;
  notes: string | null;
  created_at: string;
}


// ============================================================
// INTERFACES — Columnas nuevas en orders (snapshot financiero)
// ============================================================

/** Campos financieros añadidos a orders en CREDITOS-1A */
export interface OrderFinancialSnapshot {
  rounding_surplus_cents: number;
  restaurant_commission_cents: number;
  yumi_delivery_commission_cents: number;
  rider_delivery_commission_cents: number;
}


// ============================================================
// INTERFACES — Con joins (para UI)
// ============================================================

/** RechargeCode con datos aplanados del generador y rider */
export interface RechargeCodeWithDetails extends RechargeCode {
  generated_by_name: string;
  intended_rider_name: string | null;
  redeemed_by_name: string | null;
}

/** CreditTransaction con datos aplanados del actor */
export interface CreditTransactionWithDetails extends CreditTransaction {
  created_by_name: string | null;
  order_code: string | null;
  recharge_code: string | null;
}

/** RestaurantLiquidation con datos aplanados */
export interface RestaurantLiquidationWithDetails extends RestaurantLiquidation {
  restaurant_name: string;
  liquidated_by_name: string;
}


// ============================================================
// DTOs — Para APIs (se usarán en CREDITOS-1B)
// ============================================================

/** Crear código de recarga (agente) */
export interface RechargeCodeCreateDTO {
  amount_cents: number;
  intended_rider_id?: string;
  notes?: string;
}

/** Canjear código de recarga (rider) */
export interface RedeemCodeDTO {
  code: string;
}

/** Liquidar créditos de restaurante (agente) */
export interface LiquidateRestaurantDTO {
  restaurant_id: string;
  amount_cents: number;
  payment_method: LiquidationPaymentMethod;
  proof_url?: string;
  notes?: string;
}

/** Ajuste manual de créditos (admin) */
export interface CreditAdjustmentDTO {
  entity_type: CreditEntityType;
  entity_id: string;
  amount_cents: number;
  notes: string;
}

/** Anular código de recarga (admin/agente) */
export interface VoidRechargeDTO {
  recharge_code_id: string;
  notes: string;
}


// ============================================================
// HELPERS — Resumen de créditos
// ============================================================

/** Resumen del estado de créditos para UI widgets */
export interface CreditSummary {
  balance_cents: number;
  status: CreditHealthStatus;
  can_receive_cash_orders: boolean;
}

/** Resumen financiero de un turno de rider */
export interface RiderShiftFinancialSummary {
  total_deliveries: number;
  cash_orders: number;
  digital_orders: number;
  total_food_debit_cents: number;
  total_commission_debit_cents: number;
  total_earnings_cents: number;
  balance_start_cents: number;
  balance_end_cents: number;
}

/** Resumen financiero diario de un restaurante */
export interface RestaurantDailyFinancialSummary {
  date: string;
  total_orders: number;
  total_earned_cents: number;
  total_commission_cents: number;
  net_credits_cents: number;
  was_liquidated: boolean;
  liquidation_amount_cents: number | null;
}

/** Desglose financiero de un pedido individual (para UI) */
export interface OrderFinancialBreakdown {
  order_id: string;
  order_code: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  rounding_surplus_cents: number;
  total_cents: number;
  restaurant_commission_cents: number;
  restaurant_net_cents: number;
  yumi_delivery_commission_cents: number;
  rider_delivery_commission_cents: number;
  payment_method: string;
  actual_payment_method: string | null;
}


// ============================================================
// CONSTANTES — Umbrales de créditos
// ============================================================

/** Umbrales de créditos (duplicado de design-tokens para uso en lógica server) */
export const CREDIT_THRESHOLDS = {
  /** S/100 — por debajo, rider NO puede recibir pedidos en efectivo */
  MINIMUM_CENTS: 10000,
  /** S/150 — por debajo, se muestra alerta amarilla */
  WARNING_CENTS: 15000,
  /** S/150 — por encima, operación normal (verde) */
  HEALTHY_CENTS: 15000,
} as const;

/** Evaluar estado de salud del saldo */
export function getCreditHealth(balanceCents: number): CreditSummary {
  let status: CreditHealthStatus;

  if (balanceCents >= CREDIT_THRESHOLDS.HEALTHY_CENTS) {
    status = 'healthy';
  } else if (balanceCents >= CREDIT_THRESHOLDS.MINIMUM_CENTS) {
    status = 'warning';
  } else if (balanceCents > 0) {
    status = 'critical';
  } else {
    status = 'blocked';
  }

  return {
    balance_cents: balanceCents,
    status,
    can_receive_cash_orders: balanceCents >= CREDIT_THRESHOLDS.MINIMUM_CENTS,
  };
}


// ============================================================
// UTILIDADES — Validación
// ============================================================

/** Validar que un código de recarga tiene formato correcto */
export function isValidRechargeCode(code: string): boolean {
  // 8 caracteres del charset: ABCDEFGHJKMNPQRTVWXYZ23456789
  return /^[ABCDEFGHJKMNPQRTVWXYZ23456789]{8}$/.test(code);
}

/** Normalizar código de recarga (uppercase, sin espacios) */
export function normalizeRechargeCode(input: string): string {
  return input.replace(/\s/g, '').toUpperCase();
}

/** Tipos de transacción que suman al saldo (positivos) */
export const CREDIT_POSITIVE_TYPES: CreditTransactionType[] = [
  'recharge',
  'order_credit',
  'refund',
];

/** Tipos de transacción que restan del saldo (negativos) */
export const CREDIT_NEGATIVE_TYPES: CreditTransactionType[] = [
  'order_food_debit',
  'order_commission_debit',
  'liquidation',
  'voided_recharge',
];

/** adjustment puede ser positivo o negativo */
