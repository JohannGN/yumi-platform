'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  formatRechargeCode,
  formatCurrency,
  formatDate,
  rechargeCodeStatusLabels,
} from '@/config/design-tokens';
import type { RechargeCodeWithDetails } from '@/types/credit-types';
import { Loader2, Ban, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'redeemed' | 'voided';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'redeemed', label: 'Canjeados' },
  { value: 'voided', label: 'Anulados' },
];

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending:
    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  redeemed:
    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  voided:
    'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
};

interface RechargeCodeListProps {
  refreshKey?: number; // increment to force refetch
}

export function RechargeCodeList({ refreshKey }: RechargeCodeListProps) {
  const [codes, setCodes] = useState<RechargeCodeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Void dialog state
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        status: statusFilter,
      });
      const res = await fetch(`/api/agent/recharge-codes?${params}`);
      if (!res.ok) throw new Error('Error al cargar códigos');
      const json = await res.json();
      setCodes(json.data ?? []);
      setTotalPages(json.pagination?.pages ?? 1);
      setTotal(json.pagination?.total ?? 0);
    } catch {
      setCodes([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, refreshKey]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  async function handleVoid(codeId: string) {
    setVoidingId(codeId);
    setVoidError(null);
    try {
      const res = await fetch(`/api/agent/recharge-codes/${codeId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Anulado por agente' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? 'Error al anular código');
      }
      setVoidConfirmId(null);
      fetchCodes();
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setVoidingId(null);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header + filter tabs */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Códigos generados
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {total} código{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={[
                'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                statusFilter === tab.value
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="px-5 pb-5 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : codes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-5">
            <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {statusFilter === 'all'
                ? 'No hay códigos generados aún'
                : `No hay códigos con estado "${rechargeCodeStatusLabels[statusFilter] ?? statusFilter}"`}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-gray-200 dark:border-gray-700">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  Rider
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                  Fecha
                </th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {codes.map((rc) => (
                <tr key={rc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono font-medium text-gray-900 dark:text-white">
                      {formatRechargeCode(rc.code)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                      {formatCurrency(rc.amount_cents)}
                    </span>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className="text-gray-600 dark:text-gray-300">
                      {rc.intended_rider_name ?? '—'}
                    </span>
                    {rc.status === 'redeemed' && rc.redeemed_by_name && (
                      <span className="block text-xs text-green-600 dark:text-green-400">
                        Canjeado por: {rc.redeemed_by_name}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={[
                        'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                        STATUS_BADGE_CLASSES[rc.status] ?? STATUS_BADGE_CLASSES.voided,
                      ].join(' ')}
                    >
                      {rechargeCodeStatusLabels[rc.status] ?? rc.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(rc.created_at)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {rc.status === 'pending' ? (
                      voidConfirmId === rc.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleVoid(rc.id)}
                            disabled={voidingId === rc.id}
                            className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                          >
                            {voidingId === rc.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Sí'
                            )}
                          </button>
                          <button
                            onClick={() => { setVoidConfirmId(null); setVoidError(null); }}
                            className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setVoidConfirmId(rc.id); setVoidError(null); }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Anular código"
                        >
                          <Ban className="w-3 h-3" />
                          Anular
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Void error */}
      {voidError && (
        <div className="mx-5 mb-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400">{voidError}</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Anterior
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
