// ============================================================
// YUMI PLATFORM — P&L (Estado de Resultados) Types
// Chat: EGRESOS-3
// ============================================================

export interface PylCategoryBreakdown {
  category_id: string;
  category_name: string;
  category_icon: string;
  total_cents: number;
  count: number;
}

export interface PylSummary {
  period: { from: string; to: string };
  income: {
    delivery_fees_cents: number;
    commissions_cents: number;
    rounding_surplus_cents: number;
    total_cents: number;
  };
  expenses: {
    total_cents: number;
    by_category: PylCategoryBreakdown[];
  };
  margin: {
    net_cents: number;
    ratio: number;
    margin_percentage: number;
  };
  orders_count: number;
  avg_income_per_order_cents: number;
  breakeven: {
    monthly_fixed_costs_cents: number;
    avg_margin_per_order_cents: number;
    orders_needed: number;
  };
}

export interface PylTrendPoint {
  date: string;
  income_cents: number;
  expenses_cents: number;
  margin_cents: number;
  orders_count: number;
}
