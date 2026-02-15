// ============================================================
// YUMI — Checkout Types
// Matches cart-store.ts field names (snake_case)
// ============================================================

// === Checkout Step Management ===

export type CheckoutStep = 'customer' | 'address' | 'payment' | 'summary';

export const CHECKOUT_STEPS: CheckoutStep[] = [
  'customer',
  'address',
  'payment',
  'summary',
];

export const CHECKOUT_STEP_LABELS: Record<CheckoutStep, string> = {
  customer: 'Tus datos',
  address: 'Dirección',
  payment: 'Pago',
  summary: 'Confirmar',
};

// === Customer Info (Step 1) ===

export interface CustomerInfo {
  name: string;
  phone: string; // 9 digits without prefix
}

// === Delivery Address (Step 2) ===

export interface DeliveryAddress {
  address: string;
  lat: number;
  lng: number;
  reference: string;
}

export interface DeliveryFeeResponse {
  fee_cents: number;
  zone_name: string | null;
  zone_id: string | null;
  is_covered: boolean;
}

// === Payment Method (Step 3) ===

export type PaymentMethodType = 'cash' | 'pos' | 'yape' | 'plin';

export interface PaymentInfo {
  method: PaymentMethodType;
  cash_amount?: number; // For change calculation (in soles, not cents)
}

export const PAYMENT_METHOD_OPTIONS: {
  value: PaymentMethodType;
  label: string;
  icon: string;
  description: string;
}[] = [
  { value: 'cash', label: 'Efectivo', icon: '💵', description: 'Paga al recibir tu pedido' },
  { value: 'pos', label: 'POS / Tarjeta', icon: '💳', description: 'El rider lleva terminal POS' },
  { value: 'yape', label: 'Yape', icon: '📱', description: 'Paga directo a cuenta YUMI' },
  { value: 'plin', label: 'Plin', icon: '📱', description: 'Paga directo a cuenta YUMI' },
];

// === Order Creation ===

export interface CreateOrderPayload {
  restaurant_id: string;
  city_id: string;
  customer_name: string;
  customer_phone: string; // Full: +51XXXXXXXXX
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_instructions: string | null;
  delivery_zone_id: string | null;
  delivery_fee_cents: number;
  payment_method: PaymentMethodType;
  items: OrderItemPayload[];
  subtotal_cents: number;
  total_cents: number;
  source: 'web';
}

export interface OrderItemPayload {
  menu_item_id: string;
  name: string;
  variant_id: string | undefined;
  variant_name: string | undefined;
  base_price_cents: number;
  quantity: number;
  modifiers: {
    group_name: string;
    selections: { name: string; price_cents: number }[];
  }[];
  unit_total_cents: number;
  line_total_cents: number;
}

export interface CreateOrderResponse {
  success: boolean;
  code: string;
  confirmation_token: string;
  whatsapp_url: string;
  error?: string;
  unavailable_items?: string[];
}

// === Order Confirmation ===

export interface ConfirmOrderResponse {
  success: boolean;
  order_code: string;
  redirect_url: string;
  already_confirmed?: boolean;
  error?: string;
}

// === Penalty Check ===

export interface PenaltyCheckResponse {
  is_banned: boolean;
  penalty_level: string;
  banned_until: string | null;
  total_penalties: number;
}

// === Checkout Form State ===

export interface CheckoutFormState {
  customer: CustomerInfo;
  address: DeliveryAddress;
  payment: PaymentInfo;
  deliveryFee: DeliveryFeeResponse | null;
}

export const INITIAL_CHECKOUT_STATE: CheckoutFormState = {
  customer: { name: '', phone: '' },
  address: { address: '', lat: 0, lng: 0, reference: '' },
  payment: { method: 'cash' },
  deliveryFee: null,
};
