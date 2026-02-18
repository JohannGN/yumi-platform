'use client';

import { Clock, Package, TrendingUp } from 'lucide-react';
import { formatDate } from '@/config/tokens';
import type { ShiftLog } from '@/types/admin-panel';

interface ShiftLogsTableProps {
  shifts: ShiftLog[];
  compact?: boolean;
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function ShiftLogsTable({ shifts, compact = false }: ShiftLogsTableProps) {
  if (!shifts.length) {
    return (
      <div className="text-center py-10">
        <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Sin turnos registrados</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Los últimos 30 días</p>
      </div>
    );
  }

  // Calcular estadísticas
  const completed = shifts.filter((s) => s.ended_at && s.duration_minutes);
  const totalDeliveries = shifts.reduce((acc, s) => acc + (s.deliveries_count ?? 0), 0);
  const avgDuration = completed.length > 0
    ? Math.round(completed.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0) / completed.length)
    : 0;
  const avgDeliveries = completed.length > 0
    ? Math.round(totalDeliveries / completed.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Resumen */}
      {!compact && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            icon={<Package className="w-4 h-4 text-blue-500" />}
            value={totalDeliveries}
            label="Entregas totales"
            bg="bg-blue-50 dark:bg-blue-900/20"
          />
          <SummaryCard
            icon={<Clock className="w-4 h-4 text-orange-500" />}
            value={formatDuration(avgDuration)}
            label="Duración promedio"
            bg="bg-orange-50 dark:bg-orange-900/20"
          />
          <SummaryCard
            icon={<TrendingUp className="w-4 h-4 text-green-500" />}
            value={avgDeliveries}
            label="Entregas/turno"
            bg="bg-green-50 dark:bg-green-900/20"
          />
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              {['Inicio', 'Fin', 'Duración', 'Entregas'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {shifts.map((shift) => (
              <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {formatDate(shift.started_at)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {shift.ended_at ? formatDate(shift.ended_at) : (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      En curso
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {formatDuration(shift.duration_minutes)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900 dark:text-gray-100">
                    <Package className="w-3 h-3 text-gray-400" />
                    {shift.deliveries_count}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ icon, value, label, bg }: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
