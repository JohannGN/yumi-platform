// ============================================================
// ADICIONES AL ARCHIVO types/admin-panel.ts
// Chat 8A — Monitoreo Financiero + Cierre de Caja
// + ADMIN-FIN-3 — Usuarios + Auditoría
// + ALERTAS — Alertas operativas + Métricas crecimiento
// INSTRUCCION: Agregar estas interfaces al final del archivo existente
// ============================================================

// === FINANCIERO — CHAT 8A ===

export interface FinancialSummary {
  period: 'today' | 'week' | 'month';
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

export interface CashInFieldRider {
  rider_id: string;
  rider_name: string;
  is_online: boolean;
  active_orders_count: number;
  delivered_today_count: number;
  active_cash_cents: number;
  delivered_cash_cents: number;
  total_cash_cents: number;
}

export interface CashInFieldResponse {
  riders: CashInFieldRider[];
  total_cash_in_field_cents: number;
}

export interface DailyRiderReport {
  rider_id: string;
  rider_name: string;
  report_id: string | null;
  report_status: 'draft' | 'submitted' | 'approved' | 'rejected' | null;
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

export interface ApproveDailyReportPayload {
  status: 'approved' | 'rejected';
  admin_notes?: string;
}

// === ADMIN-FIN-3 — Usuarios + Auditoría ===

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'owner' | 'city_admin' | 'agent' | 'restaurant' | 'rider';
  city_id: string | null;
  city_name: string | null;
  is_active: boolean;
  created_at: string;
  restaurant_name?: string;
  vehicle_type?: string;
  pay_type?: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  action: 'create' | 'update' | 'delete' | 'toggle' | 'assign';
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogFilters {
  action?: string;
  entity_type?: string;
  user_id?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// === MAPA OPERATIVO ===

export interface MapRider {
  id: string;
  name: string;
  lat: number;
  lng: number;
  is_online: boolean;
  is_available: boolean;
  current_order_id: string | null;
  vehicle_type: 'motorcycle' | 'bicycle' | 'car';
}

export interface MapRestaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  is_open: boolean;
  schedule_open: boolean;
  schedule_label: string;
  address: string;
  category_name: string;
}

export interface MapActiveOrder {
  id: string;
  code: string;
  status: string;
  delivery_lat: number;
  delivery_lng: number;
  restaurant_name: string;
  rider_name: string | null;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface MapFilters {
  showRiders: boolean;
  showRestaurants: boolean;
  showOrders: boolean;
  showHeatmap: boolean;
  riderStatus: 'all' | 'available' | 'busy' | 'offline';
  orderStatus: 'all' | string;
  heatmapDays: 7 | 30 | 90;
}

// === BAN MANUAL ===

export interface BanPhonePayload {
  phone: string;
  level: 'warning' | 'restricted' | 'banned';
  reason: string;
  banned_days?: number;
  instant_ban?: boolean;
}

export interface PenaltyInfo {
  phone: string;
  penalty_level: 'none' | 'warning' | 'restricted' | 'banned';
  total_penalties: number;
  reasons: Array<{ date: string; reason: string; order_id?: string }>;
  banned_until: string | null;
}

// === ALERTAS OPERATIVAS ===

export type AlertPriority = 'critical' | 'high' | 'warning';

export type AlertType =
  | 'restaurant_not_opened'
  | 'rider_offline_in_shift'
  | 'order_stuck_pending'
  | 'order_stuck_preparing'
  | 'rider_disappeared'
  | 'order_no_rider';

export interface OperationalAlert {
  type: AlertType;
  priority: AlertPriority;
  message: string;
  entity_type: 'order' | 'rider' | 'restaurant';
  entity_id: string;
  entity_link: string;
  created_at: string;
  minutes_elapsed: number;
}

export interface AlertsSummary {
  critical: number;
  high: number;
  warning: number;
  total: number;
}

export interface AlertsResponse {
  alerts: OperationalAlert[];
  summary: AlertsSummary;
}

// === MÉTRICAS CRECIMIENTO ===

export interface GrowthPeriodData {
  unique_customers: number;
  total_orders: number;
  new_customers: number;
  returning_customers: number;
}

export interface GrowthResponse {
  current_period: GrowthPeriodData;
  previous_period: GrowthPeriodData;
  growth_percentage: number;
  trend: Array<{ date: string; customers: number }>;
}

// === HORARIO DE CORTE ===

export interface LastOrderTimeResult {
  accepting: boolean;
  lastOrderTime: string | null;
  closingTime: string | null;
  message: string;
}
