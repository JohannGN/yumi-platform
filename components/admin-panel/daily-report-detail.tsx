'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { formatCurrency, formatTime, paymentMethodLabels } from '@/config/design-tokens';
import type { DailyRiderReport, ApproveDailyReportPayload } from '@/types/admin-panel';

const reportStatusConfig = {
  draft: { label: 'Borrador', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' },
  submitted: { label: 'Pendiente revision', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  approved: { label: 'Aprobado', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  rejected: { label: 'Rechazado', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
} as const;

function formatDuration(startAt: string | null, endAt: string | null): string {
  if (!startAt || !endAt) return '—';
  const diff = Math.floor((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

interface DailyReportDetailProps {
  report: DailyRiderReport | null;
  onActionSuccess: () => void;
}

export function DailyReportDetail({ report, onActionSuccess }: DailyReportDetailProps) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <Package className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          Selecciona un rider para ver su reporte
        </p>
      </div>
    );
  }

  const statusCfg = report.report_status
    ? reportStatusConfig[report.report_status]
    : reportStatusConfig.draft;

  const discrepancyRows = [
    {
      method: paymentMethodLabels.cash,
      declared: report.declared_cash_cents,
      expected: report.expected_cash_cents,
      diff: report.cash_discrepancy_cents,
      critical: report.has_discrepancy,
    },
    {
      method: paymentMethodLabels.pos,
      declared: report.declared_pos_cents,
      expected: report.expected_pos_cents,
      diff: report.declared_pos_cents - report.expected_pos_cents,
      critical: false,
    },
    {
      method: 'Yape / Plin',
      declared: report.declared_yape_plin_cents,
      expected: report.expected_yape_plin_cents,
      diff: report.declared_yape_plin_cents - report.expected_yape_plin_cents,
      critical: false,
    },
  ];

  async function handleAction(status: 'approved' | 'rejected') {
    if (status === 'rejected' && !rejectNote.trim()) {
      setError('La nota de rechazo es obligatoria');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: ApproveDailyReportPayload = {
        status,
        ...(status === 'rejected' ? { admin_notes: rejectNote } : {}),
      };
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const res = await fetch(`/api/admin/riders/${report.rider_id}/daily-report?date=${today}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Error al procesar');
      }
      setRejecting(false);
      setRejectNote('');
      onActionSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">
              {report.rider_name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Cierre de caja
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4 flex-1">
        {/* Resumen turno */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Resumen de turno
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Inicio</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {report.shift_started_at ? formatTime(report.shift_started_at) : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Fin</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {report.shift_ended_at ? formatTime(report.shift_ended_at) : 'Activo'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Duracion</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDuration(report.shift_started_at, report.shift_ended_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Entregas</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {report.total_deliveries}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla discrepancia — solo si tiene datos */}
        {(report.report_status === 'submitted' || report.report_status === 'approved' || report.report_status === 'rejected') && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Verificacion de montos
            </p>

            {report.has_discrepancy && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  Discrepancia en efectivo superior a la tolerancia
                </p>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Metodo</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Declarado</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Esperado</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {discrepancyRows.map(row => (
                    <tr
                      key={row.method}
                      className={`border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                        row.critical ? 'bg-red-50/80 dark:bg-red-900/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200">
                        {row.method}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                        {formatCurrency(row.declared)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                        {formatCurrency(row.expected)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        <div className="flex items-center justify-end gap-1">
                          {row.diff > 0 ? (
                            <TrendingUp className="w-3 h-3 text-yellow-500" />
                          ) : row.diff < 0 ? (
                            <TrendingDown className="w-3 h-3 text-red-500" />
                          ) : (
                            <Minus className="w-3 h-3 text-gray-400" />
                          )}
                          <span className={
                            row.diff > 50 ? 'text-yellow-600 dark:text-yellow-400 font-semibold' :
                            row.diff < -50 ? 'text-red-600 dark:text-red-400 font-semibold' :
                            'text-gray-500 dark:text-gray-400'
                          }>
                            {row.diff >= 0 ? '+' : ''}{formatCurrency(row.diff)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notas del rider */}
        {report.notes && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Notas del rider
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {report.notes}
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Form rechazo inline */}
        {rejecting && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Motivo de rechazo (obligatorio)
            </p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Describe la discrepancia o motivo del rechazo..."
              rows={3}
              className="w-full text-sm border border-red-200 dark:border-red-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { void handleAction('rejected'); }}
                disabled={saving || !rejectNote.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {saving ? 'Guardando...' : 'Confirmar rechazo'}
              </button>
              <button
                onClick={() => { setRejecting(false); setRejectNote(''); setError(null); }}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Botones accion — solo si submitted */}
      {report.report_status === 'submitted' && !rejecting && (
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={() => { void handleAction('approved'); }}
            disabled={saving}
            className="flex-[2] flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Aprobar
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={saving}
            className="flex-[1] flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium py-2.5 rounded-xl transition-colors border border-red-200 dark:border-red-800"
          >
            <XCircle className="w-4 h-4" />
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
