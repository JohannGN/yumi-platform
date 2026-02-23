// ============================================================
// YUMI PLATFORM — Agent Panel Types
// Chat: AGENTE-1 + AGENTE-3
// ============================================================

// ─── Permissions ────────────────────────────────────────────

export interface AgentPermissions {
  can_cancel_orders: boolean;
  can_toggle_restaurants: boolean;
  can_manage_menu_global: boolean;
  can_disable_menu_items: boolean;
  can_view_riders: boolean;
  can_create_orders: boolean;
  can_manage_escalations: boolean;
  can_view_finance_daily: boolean;
  can_view_finance_weekly: boolean;
}

// ─── Context / Profile ──────────────────────────────────────

export interface AgentProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  assigned_cities: AgentCity[];
  permissions: AgentPermissions; // AGENTE-3: added
}

export interface AgentCity {
  city_id: string;
  city_name: string;
  city_slug: string;
  is_active: boolean;
}

// ─── Orders ─────────────────────────────────────────────────

export interface AgentOrder {
  id: string;
  code: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  restaurant_name: string;
  restaurant_id: string;
  rider_name: string | null;
  rider_id: string | null;
  rider_phone: string | null;
  items: Array<{
    item_id: string;
    variant_id: string | null;
    name: string;
    variant_name: string | null;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    weight_kg: number | null;
    modifiers?: Array<{
      modifier_id: string;
      name: string;
      price_cents: number;
    }>;
  }>;
  subtotal_cents: number;
  delivery_fee_cents: number;
  service_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  payment_method: string;
  payment_status: string;
  actual_payment_method: string | null;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_instructions: string | null;
  notes: string | null;
  fee_is_manual: boolean;
  fee_calculated_cents: number;
  source: string;
  rejection_reason: string | null;
  rejection_notes: string | null;
  customer_rating: number | null;
  customer_comment: string | null;
  created_at: string;
  confirmed_at: string | null;
  restaurant_confirmed_at: string | null;
  ready_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
}

// Para crear pedido manual (agente)
export interface AgentCreateOrderPayload {
  city_id: string;
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_instructions?: string;
  items: Array<{
    item_id: string;
    variant_id?: string;
    name: string;
    variant_name?: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    weight_kg?: number | null;
    modifiers?: Array<{
      modifier_id: string;
      name: string;
      price_cents: number;
    }>;
  }>;
  payment_method: string;
  delivery_fee_cents: number;
  fee_is_manual: boolean;
  notes?: string;
}

// ─── Escalations ────────────────────────────────────────────

export interface AgentEscalation {
  id: string;
  customer_phone: string;
  escalation_reason: string;
  priority: string;
  status: string;
  conversation_context: Array<Record<string, unknown>>;
  assigned_to_user_id: string | null;
  assigned_to_name: string | null;
  related_order_id: string | null;
  related_order_code: string | null;
  chatwoot_conversation_id: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  updated_at: string;
}

// Status history entry (for order detail)
export interface AgentOrderStatusEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ─── AGENTE-3: Restaurants ──────────────────────────────────

export interface AgentRestaurant {
  id: string;
  name: string;
  slug: string;
  category_name: string;
  is_open: boolean;
  is_active: boolean;
  accepts_orders: boolean;
  commission_mode: 'global' | 'per_item';
  phone: string | null;
  whatsapp: string | null;
  opening_hours: Record<string, { open: string; close: string; closed: boolean }>;
  should_be_open: boolean;
  alert: boolean;
  total_orders: number;
  estimated_prep_minutes: number;
}

// ─── AGENTE-3: Riders ───────────────────────────────────────

export interface AgentRider {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  is_online: boolean;
  is_available: boolean;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
  current_order_id: string | null;
  current_order_code: string | null;
  current_order_status: string | null;
  pay_type: string;
  total_deliveries: number;
  avg_rating: number;
}

// ─── AGENTE-3: Menu Item Audit ──────────────────────────────

export interface MenuItemAuditEntry {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  action: string;
  changed_by_name: string;
  changed_by_role: string;
  source: string;
  old_value: string | null;
  new_value: string | null;
  notes: string | null;
  created_at: string;
}

// ─── AGENTE-3: Permission labels ────────────────────────────

export const agentPermissionLabels: Record<keyof AgentPermissions, string> = {
  can_cancel_orders: 'Cancelar pedidos',
  can_toggle_restaurants: 'Abrir/cerrar restaurantes',
  can_manage_menu_global: 'Crear platos (restaurantes comisión global)',
  can_disable_menu_items: 'Apagar/encender platos',
  can_view_riders: 'Ver riders y ubicación',
  can_create_orders: 'Crear pedidos manuales',
  can_manage_escalations: 'Gestionar escalaciones',
  can_view_finance_daily: 'Ver finanzas diarias',
  can_view_finance_weekly: 'Ver finanzas semanales',
};

export const agentPermissionDescriptions: Record<keyof AgentPermissions, string> = {
  can_cancel_orders: 'Puede cancelar pedidos activos y liberar al rider',
  can_toggle_restaurants: 'Puede abrir o cerrar restaurantes remotamente',
  can_manage_menu_global: 'Puede crear platos nuevos en restaurantes con comisión global',
  can_disable_menu_items: 'Puede desactivar o activar platos de cualquier restaurante',
  can_view_riders: 'Puede ver la lista y ubicación GPS de riders conectados',
  can_create_orders: 'Puede crear pedidos manuales para clientes',
  can_manage_escalations: 'Puede gestionar y resolver escalaciones de soporte',
  can_view_finance_daily: 'Puede ver el resumen financiero del día',
  can_view_finance_weekly: 'Puede ver el resumen financiero semanal',
};
