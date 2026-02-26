// ============================================================
// YUMI PLATFORM — TYPES ADMIN PANEL
// Versión: 2.2 (FIX-6 — Comisiones)
// ============================================================
// FIX-6: +commission_mode en AdminRestaurant, CreateRestaurantPayload,
//        UpdateRestaurantPayload
// ============================================================

// ─── Tipos existentes (Chat 7A) ────────────────────────────

export interface AdminUser {
  id: string;
  role: string;
  city_id: string | null;
  name: string;
  email: string;
}

export interface PlatformSettings {
  id: string;
  pos_surcharge_enabled: boolean;
  pos_commission_rate: number;
  pos_igv_rate: number;
  updated_at: string;
  updated_by: string | null;
}

export interface AdminStats {
  orders: {
    total: number;
    active: number;
    delivered: number;
    cancelled: number;
    rejected: number;
  };
  revenue: {
    total_cents: number;
    delivery_fees_cents: number;
    subtotal_cents: number;
    avg_order_cents: number;
  };
  restaurants: {
    total: number;
    active: number;
    open_now: number;
  };
  riders: {
    total: number;
    online: number;
    available: number;
    busy: number;
  };
  performance: {
    avg_delivery_minutes: number;
    avg_prep_minutes: number;
  };
}

export interface DailyStats {
  delivered: number;
  cancelled: number;
  date: string;
  revenue_cents: number;
}

// ─── Tipos (Chat 7B) ────────────────────────────────────────

export interface AdminOrder {
  id: string;
  code: string;
  status: string;
  restaurant_id: string;
  restaurant_name: string;
  rider_id: string | null;
  rider_name: string | null;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_instructions: string | null;
  items: OrderItem[];
  subtotal_cents: number;
  delivery_fee_cents: number;
  service_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  rider_bonus_cents: number;
  payment_method: string;
  actual_payment_method: string | null;
  payment_status: string;
  delivery_proof_url: string | null;
  payment_proof_url: string | null;
  rejection_reason: string | null;
  rejection_notes: string | null;
  customer_rating: number | null;
  customer_comment: string | null;
  source: string;
  created_at: string;
  confirmed_at: string | null;
  restaurant_confirmed_at: string | null;
  ready_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  fee_is_manual: boolean;
  fee_calculated_cents: number;
}

export interface OrderItem {
  item_id: string;
  variant_id: string | null;
  name: string;
  variant_name: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  weight_kg: number | null;
  modifiers?: OrderItemModifier[];
}

export interface OrderItemModifier {
  group_name: string;
  option_name: string;
  price_cents: number;
}

export interface AdminRider {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  city_id: string;
  vehicle_type: string;
  vehicle_plate: string | null;
  is_online: boolean;
  is_available: boolean;
  current_order_id: string | null;
  current_order_code: string | null;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
  shift_started_at: string | null;
  total_deliveries: number;
  avg_rating: number;
  total_ratings: number;
  pay_type: string;
  fixed_salary_cents: number | null;
  commission_percentage: number | null;
  show_earnings: boolean;
}

export interface ShiftLog {
  id: string;
  rider_id: string;
  rider_name: string;
  city_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  deliveries_count: number;
}

export interface CreateRiderPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  city_id: string;
  vehicle_type: 'motorcycle' | 'bicycle' | 'car';
  vehicle_plate?: string;
  pay_type: 'fixed_salary' | 'commission';
}

export interface OrderStatusHistory {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by_user_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface EvidenceUrls {
  delivery_proof_signed_url: string | null;
  payment_proof_signed_url: string | null;
}

export interface AdminOrderFilters {
  status: string[];
  restaurant_id: string;
  rider_id: string;
  date_from: string;
  date_to: string;
  search: string;
  page: number;
  limit: number;
}

export interface OrdersListResponse {
  orders: AdminOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface RidersListResponse {
  riders: AdminRider[];
  total: number;
}

export interface ShiftLogsResponse {
  shifts: ShiftLog[];
  total: number;
  page: number;
  limit: number;
}

export interface ClosestRider {
  rider_id: string;
  rider_name: string;
  distance_km: number;
  current_lat: number;
  current_lng: number;
}

// ─── Financial types (Chat 8A) ──────────────────────────────

export interface FinancialSummary {
  period: string;
  total_revenue_cents: number;
  delivery_fees_cents: number;
  rider_bonuses_cents: number;
  cash_in_field_cents: number;
  pending_validations_count: number;
  by_payment_method: {
    cash_cents: number;
    pos_cents: number;
    yape_plin_cents: number;
  };
  daily_breakdown: DailyFinancialBreakdown[];
}

export interface DailyFinancialBreakdown {
  date: string;
  cash_cents: number;
  pos_cents: number;
  yape_plin_cents: number;
  total_cents: number;
}

export interface DailyRiderReport {
  rider_id: string;
  rider_name: string;
  report_id: string | null;
  report_status: string | null;
  shift_started_at: string | null;
  shift_ended_at: string | null;
  total_deliveries: number;
  declared_cash_cents: number;
  declared_pos_cents: number;
  declared_yape_plin_cents: number;
  notes: string | null;
  expected_cash_cents: number;
  expected_pos_cents: number;
  expected_yape_plin_cents: number;
  cash_discrepancy_cents: number;
  has_discrepancy: boolean;
}

// ─── Tipos Chat 7C ──────────────────────────────────────────

// === RESTAURANTES ===
export interface AdminRestaurant {
  id: string;
  city_id: string;
  owner_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  lat: number;
  lng: number;
  address: string;
  phone: string | null;
  whatsapp: string | null;
  sells_alcohol: boolean;
  is_active: boolean;
  is_open: boolean;
  accepts_orders: boolean;
  commission_percentage: number;
  commission_mode: string;        // FIX-6: 'global' | 'per_item'
  theme_color: string;
  estimated_prep_minutes: number;
  min_order_cents: number;
  display_order: number;
  total_orders: number;
  avg_rating: number;
  total_ratings: number;
  created_at: string;
  // Joins
  category_name?: string;
  category_emoji?: string;
  city_name?: string;
  owner_name?: string;
  owner_email?: string;
}

export interface AdminRestaurantDetail extends AdminRestaurant {
  menu_categories_count: number;
  menu_items_count: number;
  orders_today: number;
  orders_week: number;
  orders_month: number;
  recent_orders: AdminRestaurantOrder[];
}

export interface AdminRestaurantOrder {
  id: string;
  code: string;
  status: string;
  total_cents: number;
  created_at: string;
  customer_name: string;
}

export interface CreateRestaurantPayload {
  email: string;
  password: string;
  name: string;
  slug: string;
  city_id: string;
  category_id: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  whatsapp?: string;
  description?: string;
  commission_percentage?: number;
  commission_mode?: 'global' | 'per_item'; // FIX-6
  theme_color?: string;
}

export interface UpdateRestaurantPayload {
  name?: string;
  slug?: string;
  description?: string;
  category_id?: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  whatsapp?: string;
  sells_alcohol?: boolean;
  is_active?: boolean;
  commission_percentage?: number;
  commission_mode?: 'global' | 'per_item'; // FIX-6
  theme_color?: string;
  estimated_prep_minutes?: number;
  min_order_cents?: number;
  display_order?: number;
}

// === CATEGORIAS ===
export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  icon_url: string | null;
  description: string | null;
  display_order: number;
  is_visible: boolean;
  restaurant_count: number;
}

export interface CategoryPayload {
  name: string;
  slug: string;
  emoji?: string;
  description?: string;
  is_visible?: boolean;
}

export interface ReorderPayload {
  order: Array<{ id: string; display_order: number }>;
}

// === CIUDADES ===
export interface AdminCity {
  id: string;
  name: string;
  slug: string;
  country: string;
  timezone: string;
  is_active: boolean;
  settings: CitySettings;
  created_at: string;
  // Conteos
  restaurant_count: number;
  rider_count: number;
  order_count_total: number;
  order_count_month: number;
  zone_count: number;
}

export interface CitySettings {
  currency: string;
  currency_symbol: string;
  min_order_cents: number;
  service_fee_cents: number;
  default_prep_time_minutes: number;
  operating_hours: Record<string, { open: string; close: string; closed: boolean }>;
  alcohol_sales_enabled: boolean;
  rain_surcharge_active: boolean;
  rain_surcharge_cents: number;
}

// === ZONAS DELIVERY ===
export interface AdminZone {
  id: string;
  city_id: string;
  name: string;
  base_fee_cents: number;
  per_km_fee_cents: number;
  min_fee_cents: number;
  max_fee_cents: number;
  color: string;
  is_active: boolean;
  created_at: string;
  // Solo en detalle
  geojson?: string;
}

export interface CreateZonePayload {
  city_id: string;
  name: string;
  geojson: string;
  base_fee_cents: number;
  per_km_fee_cents: number;
  min_fee_cents: number;
  max_fee_cents: number;
  color: string;
}

export interface UpdateZonePayload {
  name?: string;
  base_fee_cents?: number;
  per_km_fee_cents?: number;
  min_fee_cents?: number;
  max_fee_cents?: number;
  color?: string;
  is_active?: boolean;
}

export interface CreateOrderPayload {
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_instructions?: string;
  payment_method: 'cash' | 'pos' | 'yape' | 'plin';
  delivery_fee_cents: number;
  fee_is_manual: boolean;
  fee_calculated_cents: number;
  notes?: string;
  items: Array<{
    item_id: string;
    name: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    notes?: string;
    modifiers?: Array<{
      modifier_id: string;
      name: string;
      price_cents: number;
    }>;
  }>;
}

// Re-exports from additions
export type { CashInFieldResponse, CashInFieldRider } from './admin-panel-additions';
export type { ApproveDailyReportPayload } from './admin-panel-additions';

export type StatsPeriod = 'today' | 'week' | 'month' | 'year';


export interface AdminContextValue {
  user: AdminUser | null;
  isLoading: boolean;
  cityName: string;
}
