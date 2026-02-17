// ============================================================
// YUMI — Rider Panel Types
// Chat 6 — NUEVO
// ============================================================

// === Rider data from API /api/rider/me ===
export interface RiderProfile {
  id: string;
  user_id: string;
  city_id: string;
  city_name: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  vehicle_type: 'motorcycle' | 'bicycle' | 'car';
  vehicle_plate: string | null;
  is_online: boolean;
  is_available: boolean;
  current_order_id: string | null;
  whatsapp_last_message_at: string | null;
  shift_started_at: string | null;
  shift_ended_at: string | null;
  total_deliveries: number;
  avg_rating: number;
  total_ratings: number;
  pay_type: 'fixed_salary' | 'commission';
  show_earnings: boolean;
  commission_percentage: number | null;
  created_at: string;
}

// === Current order with full details ===
export interface RiderCurrentOrder {
  id: string;
  code: string;
  status: RiderOrderStatus;
  // Cliente
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_instructions: string | null;
  // Restaurante
  restaurant_id: string;
  restaurant_name: string;
  restaurant_address: string;
  restaurant_lat: number;
  restaurant_lng: number;
  restaurant_phone: string | null;
  // Items
  items: RiderOrderItem[];
  // Montos
  subtotal_cents: number;
  delivery_fee_cents: number;
  service_fee_cents: number;
  total_cents: number;
  rider_bonus_cents: number;
  // Pago
  payment_method: PaymentMethodType;
  actual_payment_method: PaymentMethodType | null;
  payment_status: string;
  // Evidencia
  delivery_proof_url: string | null;
  payment_proof_url: string | null;
  // Timestamps
  created_at: string;
  confirmed_at: string | null;
  restaurant_confirmed_at: string | null;
  ready_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  in_transit_at: string | null;
  // Estimados
  estimated_prep_time_minutes: number | null;
  estimated_delivery_time_minutes: number | null;
  source: 'web' | 'whatsapp' | 'admin';
}

export interface RiderOrderItem {
  item_id: string;
  variant_id: string | null;
  name: string;
  variant_name: string | null;
  quantity: number;
  unit_price_cents: number;
  unit_total_cents: number;
  line_total_cents: number;
  modifiers?: RiderOrderModifier[];
  weight_kg: number | null;
}

export interface RiderOrderModifier {
  group_name: string;
  selections: {
    name: string;
    price_cents: number;
  }[];
}

// === Status types ===
export type RiderOrderStatus =
  | 'assigned_rider'
  | 'picked_up'
  | 'in_transit'
  | 'delivered';

export type PaymentMethodType = 'cash' | 'pos' | 'yape' | 'plin';

// === Status update request ===
export interface UpdateOrderStatusRequest {
  status: 'picked_up' | 'in_transit' | 'delivered';
  actual_payment_method?: PaymentMethodType;
  delivery_proof_url?: string;
  payment_proof_url?: string;
}

// === History ===
export interface RiderHistoryOrder {
  id: string;
  code: string;
  restaurant_name: string;
  total_cents: number;
  actual_payment_method: PaymentMethodType | null;
  payment_method: PaymentMethodType;
  customer_rating: number | null;
  delivered_at: string;
  earnings_cents?: number;
}

export type HistoryPeriod = 'today' | 'week' | 'month';

// === Stats ===
export interface RiderStats {
  deliveries_today: number;
  deliveries_week: number;
  deliveries_month: number;
  avg_rating: number;
  total_ratings: number;
  earnings_today_cents?: number;
  earnings_week_cents?: number;
  earnings_month_cents?: number;
}

// === Delivery flow steps ===
export type DeliveryFlowStep =
  | 'confirm_payment'
  | 'cash_calculator'
  | 'pos_photo'
  | 'qr_display'
  | 'delivery_photo'
  | 'success';
