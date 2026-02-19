// ============================================================
// YUMI – SETTLEMENT TYPES (Chat 8B)
// ⚠️  Agregar el contenido de este archivo al final de:
//     types/admin-panel.ts
// Luego puedes eliminar este archivo e importar desde admin-panel.ts
// ============================================================

// ─── Status ────────────────────────────────────────────────
export type SettlementStatus = 'pending' | 'paid' | 'disputed';

// Config de estilos para badges de estado
// TODO: mover labels a config/design-tokens.ts como settlementStatusLabels
export const SETTLEMENT_STATUS_CONFIG: Record<
  SettlementStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pendiente',
    className:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  paid: {
    label: 'Pagado',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  disputed: {
    label: 'En disputa',
    className:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

// ─── Restaurant Settlement ──────────────────────────────────
export interface RestaurantSettlement {
  id: string;
  restaurant_id: string;
  period_start: string;  // DATE  'YYYY-MM-DD'
  period_end: string;    // DATE  'YYYY-MM-DD'
  total_orders: number;
  gross_sales_cents: number;
  commission_cents: number;
  net_payout_cents: number;
  status: SettlementStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  restaurant?: {
    name: string;
    commission_percentage: number;
  };
}

// ─── Rider Settlement ──────────────────────────────────────
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
  // joined
  rider?: {
    pay_type: 'fixed_salary' | 'commission';
    fixed_salary_cents: number | null;
    commission_percentage: number | null;
    user?: { name: string };
  };
}

// ─── Preview (dry_run) ─────────────────────────────────────
export interface SettlementPreview {
  period_start: string;
  period_end: string;
  total_orders?: number;
  total_deliveries?: number;
  gross_sales_cents?: number;
  commission_cents?: number;
  commission_percentage?: number;
  delivery_fees_cents?: number;
  bonuses_cents?: number;
  net_payout_cents: number;
  has_overlap: boolean;
  overlap_period?: string;
}

// ─── Payloads ──────────────────────────────────────────────
export interface CreateRestaurantSettlementPayload {
  restaurant_id: string;
  period_start: string;
  period_end: string;
  notes?: string;
  dry_run?: boolean;
}

export interface CreateRiderSettlementPayload {
  rider_id: string;
  period_start: string;
  period_end: string;
  fuel_reimbursement_cents?: number;
  notes?: string;
  dry_run?: boolean;
}

export interface UpdateSettlementPayload {
  status?: 'paid' | 'disputed' | 'pending';
  paid_at?: string;
  notes?: string;
  fuel_reimbursement_cents?: number; // solo rider settlements
}
