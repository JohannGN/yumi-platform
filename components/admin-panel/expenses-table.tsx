'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { formatCurrency, formatDateShort, recurringPeriodLabels } from '@/config/tokens';
import { DateRangePicker, ExportCSVButton } from '@/components/shared';
import { ExpenseFormModal } from './expense-form-modal';
import { ExpenseDetailSheet } from './expense-detail-sheet';
import type { Expense, ExpenseFilters, ExpensesResponse } from '@/types/expenses';
import type { ExpenseCategory } from '@/types/expenses';

interface CityOption {
  id: string;
  name: string;
}

export function ExpensesTable() {
  // Data
  const [response, setResponse] = useState<ExpensesResponse | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState<ExpenseFilters>({
    limit: 20,
    page: 1,
  });
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [recurringFilter, setRecurringFilter] = useState<string>('');

  // UI state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Build active filters
  const buildFilters = useCallback((): ExpenseFilters => {
    const f: ExpenseFilters = { limit: 20, page: filters.page };
    if (dateRange.from) f.from = dateRange.from;
    if (dateRange.to) f.to = dateRange.to;
    if (categoryFilter) f.category_id = categoryFilter;
    if (cityFilter) f.city_id = cityFilter;
    if (recurringFilter === 'true') f.recurring = true;
    if (recurringFilter === 'false') f.recurring = false;
    return f;
  }, [filters.page, dateRange, categoryFilter, cityFilter, recurringFilter]);

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const activeFilters = buildFilters();
      const params = new URLSearchParams(
        Object.entries(activeFilters)
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => [k, String(v)])
      );
      const res = await fetch(`/api/admin/expenses?${params.toString()}`);
      if (res.ok) {
        const data: ExpensesResponse = await res.json();
        setResponse(data);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  // Fetch categories & cities (once)
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [catRes, cityRes] = await Promise.all([
          fetch('/api/admin/expense-categories?all=true'),
          fetch('/api/admin/cities'),
        ]);
        if (catRes.ok) {
          const cats = await catRes.json();
          setCategories(Array.isArray(cats) ? cats : cats.data || []);
        }
        if (cityRes.ok) {
          const citiesData = await cityRes.json();
          setCities(Array.isArray(citiesData) ? citiesData : citiesData.data || []);
        }
      } catch (err) {
        console.error('Error loading metadata:', err);
      }
    };
    loadMeta();
  }, []);

  // Fetch on filter change
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Reset page on filter change
  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    switch (key) {
      case 'category_id':
        setCategoryFilter(value);
        break;
      case 'city_id':
        setCityFilter(value);
        break;
      case 'recurring':
        setRecurringFilter(value);
        break;
    }
  };

  const handleDateChange = (from?: string, to?: string) => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    setDateRange({ from, to });
  };

  // Pagination
  const total = response?.total ?? 0;
  const currentPage = filters.page ?? 1;
  const totalPages = Math.ceil(total / 20);

  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Actions
  const handleRowClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setDetailOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowFormModal(true);
    setDetailOpen(false);
  };

  const handleDelete = async (expenseId: string) => {
    try {
      const res = await fetch(`/api/admin/expenses/${expenseId}`, { method: 'DELETE' });
      if (res.ok) {
        setDetailOpen(false);
        setSelectedExpense(null);
        fetchExpenses();
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  const handleFormClose = (saved?: boolean) => {
    setShowFormModal(false);
    setEditingExpense(null);
    if (saved) fetchExpenses();
  };

  // Export params (without page/limit)
  const exportParams = (() => {
    const p: Record<string, string> = {};
    if (dateRange.from) p.from = dateRange.from;
    if (dateRange.to) p.to = dateRange.to;
    if (categoryFilter) p.category_id = categoryFilter;
    if (cityFilter) p.city_id = cityFilter;
    if (recurringFilter) p.recurring = recurringFilter;
    return p;
  })();

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-3 items-end">
          <DateRangePicker
            from={dateRange.from}
            to={dateRange.to}
            onChange={handleDateChange}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Categoría</label>
            <select
              value={categoryFilter}
              onChange={(e) => updateFilter('category_id', e.target.value)}
              className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">Todas</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Ciudad</label>
            <select
              value={cityFilter}
              onChange={(e) => updateFilter('city_id', e.target.value)}
              className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">Todas</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Recurrente</label>
            <select
              value={recurringFilter}
              onChange={(e) => updateFilter('recurring', e.target.value)}
              className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <ExportCSVButton
            mode="server"
            apiUrl="/api/admin/export/expenses"
            params={exportParams}
            filename={`egresos-${formatDateShort(new Date())}`}
            label="Exportar"
          />
          <button
            onClick={() => {
              setEditingExpense(null);
              setShowFormModal(true);
            }}
            className="flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium text-white"
            style={{ backgroundColor: '#FF6B35' }}
          >
            <Plus className="w-4 h-4" />
            Nuevo egreso
          </button>
        </div>
      </div>

      {/* Summary */}
      {response && !loading && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {total} egreso{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          {total > 0 && (
            <span className="ml-2 font-medium" style={{ color: '#EF4444' }}>
              Total: {formatCurrency(
                response.expenses.reduce((sum, e) => sum + e.amount_cents, 0)
              )}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Descripción</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Monto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Ciudad</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Recurrente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Creado por</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className={`px-4 py-3 ${j >= 4 ? 'hidden md:table-cell' : ''} ${j >= 5 ? 'hidden lg:table-cell' : ''}`}>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : response?.expenses?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No se encontraron egresos
                  </td>
                </tr>
              ) : (
                response?.expenses?.map((expense) => (
                  <tr
                    key={expense.id}
                    onClick={() => handleRowClick(expense)}
                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatDateShort(expense.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        {expense.category_icon && (
                          <span className="text-base">{expense.category_icon}</span>
                        )}
                        <span className="text-gray-900 dark:text-gray-100">
                          {expense.category_name || '—'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[200px] truncate hidden sm:table-cell">
                      {expense.description}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap" style={{ color: '#EF4444' }}>
                      {formatCurrency(expense.amount_cents)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                      {expense.city_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      {expense.recurring ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                        >
                          🔄 {recurringPeriodLabels[expense.recurring_period || ''] || expense.recurring_period}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                      {expense.creator_name || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
              >
                Anterior
              </button>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <ExpenseFormModal
          expense={editingExpense}
          categories={categories.filter((c) => c.is_active)}
          cities={cities}
          onClose={handleFormClose}
        />
      )}

      {/* Detail Sheet */}
      <ExpenseDetailSheet
        expense={selectedExpense}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedExpense(null);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
