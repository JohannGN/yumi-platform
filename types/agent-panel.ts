// ============================================================
// YUMI PLATFORM — Agent Panel Types
// Chat: AGENTE-1
// ============================================================

// Contexto del agente autenticado
export interface AgentProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  assigned_cities: AgentCity[];
}

export interface AgentCity {
  city_id: string;
  city_name: string;
  city_slug: string;
  is_active: boolean;
}

// Pedido simplificado para vista agente
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

// Escalación
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
