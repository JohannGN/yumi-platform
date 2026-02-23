'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  creditTransactionTypeLabels,
} from '@/config/design-tokens';
import type { CreditTransactionType, CreditEntityType } from '@/types/credit-types';

// ── Types ────────────────────────────────────────────────────
interface TransactionRow {
  id: string;
  entity_type: CreditEntityType;
  entity_id: string;
  entity_name: string;
  transaction_type: CreditTransactionType;
  amount_cents: number;
  balance_before_cents: number;
  balance_after_cents: number;
  notes: string | null;
  created_at: string;
}

interface TransactionsResponse {
  data: TransactionRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const TRANSACTION_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  ...Object.entries(creditTransactionTypeLabels).map(([k, v]) => ({ value: k, label: v })),
];

const ENTITY_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'rider', label: 'Rider' },
  { value: 'restaurant', label: 'Restaurante' },
];

// ── Skeleton ─────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3">
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────
export function CreditsTransactionsTable() {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [transactionType, setTransactionType] = useState('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (entityType) params.set('entity_type', entityType);
      if (transactionType) params.set('transaction_type', transactionType);
      const res = await fetch(`/api/admin/credits/transactions?${params}`);
      if (!res.ok) throw new Error('Error');
      const json = await res.json() as TransactionsResponse;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, entityType, transactionType]);

  useEffect(() => { void fetchTransactions(); }, [fetchTransactions]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [entityType, transactionType]);

  const pagination = data?.pagination;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {ENTITY_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {TRANSACTION_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {pagination && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
            {pagination.total} transacciones
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <TableSkeleton />
        ) : !data || data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <Search className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium">Sin transacciones</p>
            <p className="text-xs mt-0.5">No se encontraron registros con estos filtros</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entidad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transacción</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monto</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo después</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {data.data.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums">
                    {formatDate(tx.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`
                        inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase
                        ${tx.entity_type === 'rider'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }
                      `}>
                        {tx.entity_type === 'rider' ? 'R' : 'RE'}
                      </span>
                      <span className="text-gray-900 dark:text-white text-sm truncate max-w-[140px]">
                        {tx.entity_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {tx.entity_type === 'rider' ? 'Rider' : 'Restaurante'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      {creditTransactionTypeLabels[tx.transaction_type] ?? tx.transaction_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    <span className={`text-sm font-semibold ${
                      tx.amount_cents >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {tx.amount_cents >= 0 ? '+' : ''}{formatCurrency(tx.amount_cents)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatCurrency(tx.balance_after_cents)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 max-w-[200px] truncate">
                    {tx.notes ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Página {pagination.page} de {pagination.pages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
