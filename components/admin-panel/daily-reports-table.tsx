'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/config/design-tokens';
import type { DailyRiderReport } from '@/types/admin-panel';

const reportStatusConfig = {
  draft: { label: 'Borrador', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' },
  submitted: { label: 'Pendiente', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  approved: { label: 'Aprobado', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  rejected: { label: 'Rechazado', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
} as const;

interface DailyReportsTableProps {
  selectedDate: string;
  selectedRiderId: string | null;
  onSelectRider: (report: DailyRiderReport) => void;
}

export function DailyReportsTable({
  selectedDate,
  selectedRiderId,
  onSelectRider,
}: DailyReportsTableProps) {
  const [reports, setReports] = useState<DailyRiderReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/financial/daily-riders?date=${selectedDate}`);
      if (!res.ok) throw new Error('Error');
      const json = await res.json() as { date: string; reports: DailyRiderReport[] };
      setReports(json.reports);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { void fetchReports(); }, [fetchReports]);

  // Exponer refresh para que el padre recargue tras aprobar/rechazar
  // (se maneja via key en el padre)

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
          Reportes del dia
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-PE', {
            weekday: 'long', day: 'numeric', month: 'long'
          })}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="h-4 w-28 bg-gray-200 dark:bg-gray-600 rounded" />
                <div className="ml-auto h-5 w-16 bg-gray-200 dark:bg-gray-600 rounded-full" />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Sin reportes para este dia
            </p>
            <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">
              Ningún rider tuvo turno activo
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {reports.map(report => {
              const isSelected = selectedRiderId === report.rider_id;
              const statusCfg = report.report_status
                ? reportStatusConfig[report.report_status]
                : reportStatusConfig.draft;

              return (
                <li key={report.rider_id}>
                  <button
                    onClick={() => onSelectRider(report)}
                    className={`
                      w-full text-left px-4 py-3 transition-colors flex items-center gap-3
                      ${isSelected
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-l-2 border-orange-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }
                      ${report.has_discrepancy && report.report_status === 'submitted'
                        ? 'bg-red-50/50 dark:bg-red-900/10'
                        : ''
                      }
                    `}
                  >
                    {/* Indicador discrepancia */}
                    <div className="flex-shrink-0">
                      {report.has_discrepancy && report.report_status === 'submitted' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </div>

                    {/* Info rider */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {report.rider_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {report.total_deliveries} entregas
                        </span>
                        {report.declared_cash_cents > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatCurrency(report.declared_cash_cents)} efectivo
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge estado */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                        {statusCfg.label}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Summary footer */}
      {!loading && reports.length > 0 && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{reports.filter(r => r.report_status === 'submitted').length} pendientes de validar</span>
            <span>{reports.filter(r => r.has_discrepancy).length} con discrepancia</span>
          </div>
        </div>
      )}
    </div>
  );
}
