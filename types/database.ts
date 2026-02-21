// ============================================================
// YUMI — Database Types (manual, matches YUMI-DATABASE-SCHEMA.sql)
// ============================================================
// REGLA: Si un campo no está en el schema SQL, NO EXISTE.
// Dinero SIEMPRE en céntimos (INTEGER con sufijo _cents).
// ============================================================

// === ENUMs ===

export type UserRole = 'owner' | 'city_admin' | 'agent' | 'restaurant' | 'rider';

export type OrderStatus =
  | 'cart'
  | 'awaiting_confirmation'
  | 'pending_confirmation'
  | 'confirmed'
  | 'rejected'
  | 'preparing'
  | 'ready'
  | 'assigned_rider'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'pos' | 'yape' | 'plin';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type RejectionReason = 'item_out_of_stock' | 'closing_soon' | 'kitchen_issue' | 'other';
export type PenaltyLevel = 'none' | 'warning' | 'restricted' | 'banned';
export type EscalationReason =
  | 'complaint'
  | 'angry_customer'
  | 'unintelligible_message'
  | 'technical_issue'
  | 'refund_request'
  | 'human_requested'
  | 'client_refuses_links'
  | 'alcohol_request'
  | 'medication_request'
  | 'large_order'
  | 'other';
export type EscalationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EscalationStatus = 'pending' | 'in_progress' | 'resolved';
export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type SettlementStatus = 'pending' | 'paid' | 'disputed';
export type VehicleType = 'motorcycle' | 'bicycle' | 'car';
export type RiderPayType = 'fixed_salary' | 'commission';
export type OrderSource = 'web' | 'whatsapp' | 'admin';

// === Operating Hours ===

export interface DaySchedule {
  open: string;   // "08:00"
  close: string;  // "22:00"
  closed: boolean;
}

export interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

// === City Settings ===

export interface CitySettings {
  currency: string;
  currency_symbol: string;
  min_order_cents: number;
  service_fee_cents: number;
  default_prep_time_minutes: number;
  operating_hours: OperatingHours;
  alcohol_sales_enabled: boolean;
  notifications_respect_hours: boolean;
}

// === Tables ===

export interface City {
  id: string;
  name: string;
  slug: string;
  country: string;
  timezone: string;
  is_active: boolean;
  settings: CitySettings;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  icon_url: string | null;
  description: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryZone {
  id: string;
  city_id: string;
  name: string;
  // polygon is PostGIS geometry — handled server-side
  base_fee_cents: number;
  per_km_fee_cents: number;
  min_fee_cents: number;
  max_fee_cents: number;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  role: UserRole;
  city_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  city_id: string;
  owner_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  default_logo: boolean;
  default_banner: boolean;
  lat: number;
  lng: number;
  address: string;
  phone: string | null;
  whatsapp: string | null;
  sells_alcohol: boolean;
  is_active: boolean;
  is_open: boolean;
  accepts_orders: boolean;
  whatsapp_last_message_at: string | null;
  opening_hours: OperatingHours;
  daily_opening_time: string | null;
  commission_percentage: number;
  total_orders: number;
  avg_rating: number;
  total_ratings: number;
  cart_max_items: number;
  cart_max_quantity: number;
  cart_max_weight_kg: number;
  cart_requires_review_weight_kg: number;
  estimated_prep_minutes: number;
  min_order_cents: number;
  theme_color: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Joined fields (optional, from queries)
  category?: Category;
  // Computed/future fields (populated by backend when available)
  free_delivery?: boolean;  // true = delivery fee is S/ 0.00 for this restaurant
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  menu_category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price_cents: number;
  is_available: boolean;
  stock_quantity: number | null;
  tags: string[];
  weight_kg: number | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Joined
  variants?: ItemVariant[];
  modifier_groups?: ItemModifierGroup[];
}

export interface ItemVariant {
  id: string;
  menu_item_id: string;
  name: string;
  price_cents: number;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ItemModifierGroup {
  id: string;
  menu_item_id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  display_order: number;
  created_at: string;
  updated_at: string;
  item_modifiers?: ItemModifier[];
}

export interface ItemModifier {
  id: string;
  modifier_group_id: string;
  name: string;
  price_cents: number;
  is_default: boolean;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Rider {
  id: string;
  user_id: string;
  city_id: string;
  vehicle_type: VehicleType;
  vehicle_plate: string | null;
  gps_device_id: string | null;
  traccar_device_id: number | null;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
  is_online: boolean;
  is_available: boolean;
  current_order_id: string | null;
  whatsapp_last_message_at: string | null;
  shift_started_at: string | null;
  shift_ended_at: string | null;
  total_deliveries: number;
  avg_rating: number;
  total_ratings: number;
  pay_type: RiderPayType;
  fixed_salary_cents: number | null;
  commission_percentage: number | null;
  show_earnings: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  user?: User;
}

export interface ShiftSchedule {
  id: string;
  rider_id: string;
  city_id: string;
  day_of_week: number;
  scheduled_start: string;
  scheduled_end: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// === Order Item (JSONB snapshot) ===

export interface OrderItem {
  item_id: string;
  variant_id: string | null;
  name: string;
  variant_name: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  weight_kg: number | null;
}

export interface Order {
  id: string;
  code: string;
  city_id: string;
  restaurant_id: string;
  rider_id: string | null;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_zone_id: string | null;
  delivery_instructions: string | null;
  items: OrderItem[];
  subtotal_cents: number;
  delivery_fee_cents: number;
  service_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  status: OrderStatus;
  rejection_reason: RejectionReason | null;
  rejection_notes: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  source: OrderSource;
  confirmation_token: string | null;
  confirmation_expires_at: string | null;
  created_at: string;
  confirmed_at: string | null;
  restaurant_confirmed_at: string | null;
  ready_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  estimated_prep_time_minutes: number | null;
  estimated_delivery_time_minutes: number | null;
  rider_to_rest_distance_km: number | null;
  rest_to_client_distance_km: number | null;
  total_delivery_distance_km: number | null;
  rider_bonus_cents: number;
  customer_rating: number | null;
  customer_comment: string | null;
  cart_limit_exceeded: boolean;
  updated_at: string;
  // Joined
  restaurant?: Restaurant;
  rider?: Rider;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by_user_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerPenalty {
  id: string;
  phone: string;
  total_penalties: number;
  penalty_level: PenaltyLevel;
  reasons: Array<{
    date: string;
    reason: string;
    order_id: string;
    notes?: string;
  }>;
  banned_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RestaurantSettlement {
  id: string;
  restaurant_id: string;
  period_start: string;
  period_end: string;
  total_orders: number;
  gross_sales_cents: number;
  commission_cents: number;
  net_payout_cents: number;
  status: SettlementStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiderSettlement {
  id: string;
  rider_id: string;
  period_start: string;
  period_end: string;
  total_deliveries: number;
  cash_collected_cents: number;
  pos_collected_cents: number;
  yape_plin_collected_cents: number;
  delivery_fees_cents: number;
  bonuses_cents: number;
  fuel_reimbursement_cents: number;
  net_payout_cents: number;
  status: SettlementStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyRiderReport {
  id: string;
  rider_id: string;
  date: string;
  shift_started_at: string | null;
  shift_ended_at: string | null;
  total_deliveries: number;
  cash_collected_cents: number;
  pos_collected_cents: number;
  yape_plin_collected_cents: number;
  total_distance_km: number;
  fuel_used_liters: number | null;
  fuel_cost_cents: number | null;
  earnings_cents: number;
  status: ReportStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportEscalation {
  id: string;
  customer_phone: string;
  conversation_context: unknown[];
  escalation_reason: EscalationReason;
  priority: EscalationPriority;
  status: EscalationStatus;
  assigned_to_user_id: string | null;
  related_order_id: string | null;
  chatwoot_conversation_id: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  phone: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  reference: string | null;
  city_id: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  order_id: string | null;
  recipient_phone: string;
  recipient_type: string;
  template_name: string;
  message_body: string | null;
  status: string;
  meta_message_id: string | null;
  error_message: string | null;
  created_at: string;
}

// === Cart Types (client-side only, not a DB table) ===

export interface CartItem {
  item_id: string;
  variant_id: string | null;
  name: string;
  variant_name: string | null;
  quantity: number;
  unit_price_cents: number;
  image_url: string | null;
  weight_kg: number | null;
}

export interface CartState {
  restaurant_id: string | null;
  restaurant_name: string | null;
  restaurant_slug: string | null;
  city_slug: string | null;
  items: CartItem[];
  updated_at: string | null;
}
