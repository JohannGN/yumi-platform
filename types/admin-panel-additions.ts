// ============================================================
// ADICIONES AL ARCHIVO types/admin-panel.ts
// Chat 8A — Monitoreo Financiero + Cierre de Caja
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
