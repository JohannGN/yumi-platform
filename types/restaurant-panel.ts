// ============================================================
// YUMI — Restaurant Panel Types
// Chat 5 — Fragment 1/7
// ============================================================

// === RESTAURANT (from Supabase) ===
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
  opening_hours: OpeningHours;
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
}

// === OPENING HOURS ===
export interface DayHours {
  open: string;   // "08:00"
  close: string;  // "22:00"
  closed: boolean;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type OpeningHours = Record<DayOfWeek, DayHours>;

// === ORDER (as seen in restaurant panel) ===
export interface OrderItem {
  menu_item_id: string;
  name: string;
  variant_id: string | null;
  variant_name: string | null;
  base_price_cents: number;
  quantity: number;
  modifiers: OrderItemModifier[];
  unit_total_cents: number;
  line_total_cents: number;
}

export interface OrderItemModifier {
  group_name: string;
  selections: {
    name: string;
    price_cents: number;
  }[];
}

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

export type RejectionReason =
  | 'item_out_of_stock'
  | 'closing_soon'
  | 'kitchen_issue'
  | 'other';

export interface PanelOrder {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
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
  source: 'web' | 'whatsapp' | 'admin';
  estimated_prep_time_minutes: number | null;
  customer_rating: number | null;
  customer_comment: string | null;
  created_at: string;
  confirmed_at: string | null;
  restaurant_confirmed_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
}

// === KANBAN COLUMNS ===
export type KanbanColumn = 'pending_confirmation' | 'confirmed' | 'preparing' | 'ready';

export const KANBAN_COLUMNS: KanbanColumn[] = [
  'pending_confirmation',
  'confirmed',
  'preparing',
  'ready',
];

export const KANBAN_LABELS: Record<KanbanColumn, string> = {
  pending_confirmation: 'Pendientes',
  confirmed: 'Confirmados',
  preparing: 'Preparando',
  ready: 'Listos',
};

// === DASHBOARD STATS ===
export interface DashboardStats {
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  avgRating: number;
  totalRatings: number;
}

// === MENU (for CRUD) ===
export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
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
  // Joined relations (optional, loaded when needed)
  item_variants?: ItemVariant[];
  item_modifier_groups?: PanelModifierGroup[];
}

export interface ItemVariant {
  id: string;
  menu_item_id: string;
  name: string;
  price_cents: number;
  is_available: boolean;
  display_order: number;
}

export interface PanelModifierGroup {
  id: string;
  menu_item_id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  display_order: number;
  item_modifiers: PanelModifier[];
}

export interface PanelModifier {
  id: string;
  modifier_group_id: string;
  name: string;
  price_cents: number;
  is_default: boolean;
  is_available: boolean;
  display_order: number;
}

// === PRINTER CONFIG ===
export interface PrinterConfig {
  enabled: boolean;
  autoprint_on_accept: boolean;
  autoprint_label_on_ready: boolean;
  connection_type: 'usb' | 'bluetooth' | 'none';
  device_name: string | null;
}

// === NAV ITEMS ===
export interface NavItem {
  label: string;
  href: string;
  icon: string; // emoji for now, can be replaced with Lucide icons later
  badge?: number;
}
