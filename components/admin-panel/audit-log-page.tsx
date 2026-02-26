'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Loader2, Download,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  auditActionLabels,
  auditEntityTypeLabels,
  formatDate,
} from '@/config/tokens';
import { DateRangePicker, ExportCSVButton } from '@/components/shared';
import type { DateRange } from '@/components/shared';
import type { AuditLogEntry } from '@/types/admin-panel-additions';

const ACTIONS = ['create', 'update', 'delete', 'toggle', 'assign'] as const;
const ENTITY_TYPES = [
  'user', 'rider', 'restaurant', 'order', 'agent_permission',
  'menu_item', 'category', 'city', 'zone', 'recharge_code',
  'credit_adjustment', 'liquidation',
] as const;
const LIMIT = 30;

const actionBadgeColors: Record<string, string> = {
  create: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  update: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  delete: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  toggle: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  assign: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
};

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  const [page, setPage] = useState(1);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity_type', entityFilter);
      if (dateRange.from) params.set('from', dateRange.from);
      if (dateRange.to) params.set('to', dateRange.to);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));

      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (!res.ok) throw new Error('Error fetching audit log');
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error('[AuditLogPage]', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, dateRange, page]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const totalPages = Math.ceil(total / LIMIT);

  // CSV data for export
  const csvData = entries.map((e) => ({
    Fecha: formatDate(e.created_at),
    Usuario: e.user_name,
    Acción: auditActionLabels[e.action] ?? e.action,
    Entidad: auditEntityTypeLabels[e.entity_type] ?? e.entity_type,
    'ID Entidad': e.entity_id ?? '',
    Detalles: JSON.stringify(e.details),
  }));

  // Skeleton
  if (loading && entries.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <ScrollText className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Log de Auditoría</h1>
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ScrollText className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Log de Auditoría</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">({total})</span>
        </div>
        {csvData.length > 0 && (
          <ExportCSVButton
            mode="client"
            data={csvData}
            filename="auditoria-yumi"
          />
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none"
        >
          <option value="">Todas las acciones</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{auditActionLabels[a]}</option>
          ))}
        </select>

        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none"
        >
          <option value="">Todas las entidades</option>
          {ENTITY_TYPES.map((et) => (
            <option key={et} value={et}>{auditEntityTypeLabels[et] ?? et}</option>
          ))}
        </select>

        <DateRangePicker
          value={dateRange}
          onChange={(range) => { setDateRange(range); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-left">
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Fecha</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Usuario</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Acción</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Entidad</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 w-10"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {loading ? (
                <tr key="loading">
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr key="empty">
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  const hasDetails = entry.details && Object.keys(entry.details).length > 0;
                  return (
                    <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                      onClick={() => hasDetails && setExpandedId(isExpanded ? null : entry.id)}
                    >
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">
                        {formatDate(entry.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {entry.user_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${actionBadgeColors[entry.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {auditActionLabels[entry.action] ?? entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">
                            {auditEntityTypeLabels[entry.entity_type] ?? entry.entity_type}
                          </span>
                          {entry.entity_id && (
                            <p className="text-xs text-gray-400 font-mono truncate max-w-[120px]">
                              {entry.entity_id.slice(0, 8)}…
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasDetails ? (
                          isExpanded
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : null}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>

        {/* Expanded details panel */}
        {expandedId && (() => {
          const entry = entries.find((e) => e.id === expandedId);
          if (!entry || !entry.details || Object.keys(entry.details).length === 0) return null;
          return (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                Detalles
              </p>
              <pre className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg p-3 overflow-x-auto border border-gray-200 dark:border-gray-700 max-h-48">
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            </div>
          );
        })()}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500 dark:text-gray-400">
            Mostrando {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-gray-700 dark:text-gray-300 tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
