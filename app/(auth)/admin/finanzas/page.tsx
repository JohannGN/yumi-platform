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
            Resumen Financiero
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Visión general de ingresos y flujo de efectivo
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
    </div>
  );
}
