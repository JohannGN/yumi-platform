'use client';

import { useState, useEffect, useCallback } from 'react';
import { FinancialKpiCards } from '@/components/admin-panel/financial-kpi-cards';
import { FinancialChart } from '@/components/admin-panel/financial-chart';
import { CashInFieldTable } from '@/components/admin-panel/cash-in-field-table';
import type { FinancialSummary } from '@/types/admin-panel';

type Period = 'today' | 'week' | 'month';

const periodLabels: Record<Period, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
};

export default function FinancialDashboardPage() {
  const [period, setPeriod] = useState<Period>('today');
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/financial/summary?period=${period}`);
      if (!res.ok) throw new Error('Error');
      const data = await res.json() as FinancialSummary;
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void fetchSummary(); }, [fetchSummary]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Dashboard Financiero
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Vision general de ingresos y flujo de efectivo
          </p>
        </div>

        {/* Selector de periodo */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {(Object.keys(periodLabels) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                ${period === p
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <FinancialKpiCards summary={summary} loading={loading} />

      {/* Chart + Cash in field */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <FinancialChart
            data={summary?.daily_breakdown ?? []}
            loading={loading}
          />
        </div>
        <div className="lg:col-span-2" style={{ minHeight: '320px' }}>
          <CashInFieldTable />
        </div>
      </div>

      {/* Acceso rapido a caja */}
      {summary && summary.pending_validations_count > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-300">
              {summary.pending_validations_count} cierre{summary.pending_validations_count > 1 ? 's' : ''} de caja pendiente{summary.pending_validations_count > 1 ? 's' : ''} de validacion
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-0.5">
              Revisa los reportes de los riders y aprueba o rechaza segun corresponda
            </p>
          </div>
          <a
            href="/admin/finanzas/caja"
            className="flex-shrink-0 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Ir a Caja
          </a>
        </div>
      )}
    </div>
  );
}
