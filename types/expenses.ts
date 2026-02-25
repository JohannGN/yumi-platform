// ============================================================
// YUMI PLATFORM — EGRESOS-1
// types/expenses.ts
// Interfaces para módulo de egresos/gastos
// ============================================================

export interface ExpenseCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  city_id: string;
  category_id: string;
  category_name: string;           // join aplanado
  category_icon: string | null;    // join aplanado
  amount_cents: number;
  description: string;
  date: string;
  receipt_url: string | null;
  recurring: boolean;
  recurring_period: string | null;
  linked_rider_id: string | null;
  linked_rider_name: string | null;       // join aplanado
  linked_restaurant_id: string | null;
  linked_restaurant_name: string | null;  // join aplanado
  created_by: string;
  creator_name: string;            // join aplanado
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseFilters {
  city_id: string;
  from?: string;
  to?: string;
  category_id?: string;
  recurring?: boolean;
  page?: number;
  limit?: number;
}

export interface ExpensesResponse {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateExpensePayload {
  city_id: string;
  category_id: string;
  amount_cents: number;
  description: string;
  date: string;
  receipt_url?: string;
  recurring: boolean;
  recurring_period?: string;
  linked_rider_id?: string;
  linked_restaurant_id?: string;
  notes?: string;
}
