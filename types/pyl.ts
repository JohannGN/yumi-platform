// ============================================================
// YUMI PLATFORM — P&L (Estado de Resultados) Types
// Chat: EGRESOS-3 + Vista Contable
// ============================================================

export type PylMode = 'gestion' | 'contable';

export interface PylCategoryBreakdown {
  category_id: string;
  category_name: string;
  category_icon: string;
  total_cents: number;
  count: number;
}

// === RESPUESTA COMPLETA P&L ===
export interface PylSummary {
  period: { from: string; to: string };

  // --- Vista Gestión (margen operativo YUMI) ---
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

  // --- Vista Contable (flujo bancario real para SUNAT) ---
  accounting: {
    // Entradas a cuentas YUMI
    digital_payments_received_cents: number;  // yape/plin: total_cents clientes
    rider_recharges_cents: number;            // recargas de créditos riders
    total_income_cents: number;

    // Salidas de cuentas YUMI
    restaurant_liquidations_cents: number;    // pagos a restaurantes
    restaurant_liquidations_count: number;
    operational_expenses_cents: number;       // gastos operativos
    total_expenses_cents: number;

    // Balance bancario neto
    net_bank_balance_cents: number;           // entradas - salidas

    // Efectivo en tránsito (rider cobra, no pasa por banco)
    cash_collected_cents: number;
    pos_collected_cents: number;
    total_cash_in_transit_cents: number;

    // Desglose por método de pago
    by_payment_method: {
      method: string;
      orders_count: number;
      total_cents: number;
    }[];

    // Liquidaciones detalladas por restaurante
    liquidations_by_restaurant: {
      restaurant_id: string;
      restaurant_name: string;
      amount_cents: number;
      date: string;
      payment_method: string;
    }[];
  };
}

export interface PylTrendPoint {
  date: string;
  // Gestión
  income_cents: number;
  expenses_cents: number;
  margin_cents: number;
  orders_count: number;
  // Contable
  digital_received_cents: number;
  bank_expenses_cents: number;
  bank_balance_cents: number;
}
