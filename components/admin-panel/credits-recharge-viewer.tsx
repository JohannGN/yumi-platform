'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, TicketCheck } from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  formatRechargeCode,
  rechargeCodeStatusLabels,
} from '@/config/design-tokens';
import type { RechargeCodeStatus } from '@/types/credit-types';

// ── Types ────────────────────────────────────────────────────
interface RechargeCodeRow {
  id: string;
  code: string;
  amount_cents: number;
  generated_by: string;
  generated_by_name: string;
  intended_rider_id: string | null;
  intended_rider_name: string | null;
  redeemed_by: string | null;
  redeemed_by_name: string | null;
  redeemed_at: string | null;
  status: RechargeCodeStatus;
  notes: string | null;
  created_at: string;
}

interface RechargeCodesResponse {
  data: RechargeCodeRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'redeemed', label: 'Canjeados' },
  { value: 'voided', label: 'Anulados' },
];

const statusBadgeStyles: Record<RechargeCodeStatus, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  redeemed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  voided: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
};

// ── Skeleton ─────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────
export function CreditsRechargeViewer() {
  const [data, setData] = useState<RechargeCodesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/recharge-codes?${params}`);
      if (!res.ok) throw new Error('Error');
      const json = await res.json() as RechargeCodesResponse;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { void fetchCodes(); }, [fetchCodes]);

  useEffect(() => { setPage(1); }, [statusFilter]);

  const pagination = data?.pagination;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header + Filter */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Registro de auditoría — solo lectura
        </p>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {STATUS_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <TableSkeleton />
        ) : !data || data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <TicketCheck className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium">Sin códigos de recarga</p>
            <p className="text-xs mt-0.5">No se encontraron registros con este filtro</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Código</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Generado por</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rider destino</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Creación</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Canjeado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {data.data.map((code) => (
                <tr key={code.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-gray-900 dark:text-white tracking-wider">
                      {formatRechargeCode(code.code)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {formatCurrency(code.amount_cents)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[140px]">
                    {code.generated_by_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[140px]">
                    {code.intended_rider_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`
                      inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold
                      ${statusBadgeStyles[code.status]}
                    `}>
                      {rechargeCodeStatusLabels[code.status] ?? code.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums">
                    {formatDate(code.created_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums">
                    {code.redeemed_at ? formatDate(code.redeemed_at) : '—'}
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
            Página {pagination.page} de {pagination.pages} ({pagination.total} códigos)
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
