'use client';

// ============================================================
// PylDashboard — Dashboard Estado de Resultados
// Componente principal que orquesta KPIs, gráficas y breakeven
// Chat: EGRESOS-3
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { DateRangePicker, ExportCSVButton } from '@/components/shared';
import { PylKpiCards } from './pyl-kpi-cards';
import { PylTrendChart } from './pyl-trend-chart';
import { PylBreakdownCharts } from './pyl-breakdown-charts';
import { PylBreakevenCard } from './pyl-breakeven-card';
import { formatCurrency, formatDateShort } from '@/config/tokens';
import type { PylSummary, PylTrendPoint } from '@/types/pyl';

function getDefaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export function PylDashboard() {
  const defaults = getDefaultDates();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [summary, setSummary] = useState<PylSummary | null>(null);
  const [trend, setTrend] = useState<PylTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, trendRes] = await Promise.all([
        fetch(`/api/admin/financial/pyl?from=${from}&to=${to}`),
        fetch(`/api/admin/financial/pyl/trend?from=${from}&to=${to}`),
      ]);

      if (!summaryRes.ok) throw new Error('Error cargando resumen');
      if (!trendRes.ok) throw new Error('Error cargando tendencia');

      const summaryData: PylSummary = await summaryRes.json();
      const trendData: PylTrendPoint[] = await trendRes.json();

      setSummary(summaryData);
      setTrend(trendData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateChange = (newFrom: string, newTo: string) => {
    setFrom(newFrom);
    setTo(newTo);
  };

  // CSV export data
  const getCsvData = (): string[][] => {
    if (!summary) return [];
    const rows: string[][] = [
      ['Estado de Resultados YUMI'],
      [`Período: ${formatDateShort(from)} - ${formatDateShort(to)}`],
      [],
      ['INGRESOS'],
      ['Concepto', 'Monto'],
      ['Delivery fees', formatCurrency(summary.income.delivery_fees_cents)],
      ['Comisiones restaurantes', formatCurrency(summary.income.commissions_cents)],
      ['Redondeo surplus', formatCurrency(summary.income.rounding_surplus_cents)],
      ['Total ingresos', formatCurrency(summary.income.total_cents)],
      [],
      ['EGRESOS'],
      ['Categoría', 'Monto', 'Cantidad'],
    ];
    for (const cat of summary.expenses.by_category) {
      rows.push([`${cat.category_icon} ${cat.category_name}`, formatCurrency(cat.total_cents), String(cat.count)]);
    }
    rows.push(['Total egresos', formatCurrency(summary.expenses.total_cents), '']);
    rows.push([]);
    rows.push(['MARGEN']);
    rows.push(['Margen neto', formatCurrency(summary.margin.net_cents)]);
    rows.push(['Margen %', `${summary.margin.margin_percentage.toFixed(1)}%`]);
    rows.push(['Ratio I/E', `${summary.margin.ratio}x`]);
    rows.push([]);
    rows.push(['OPERACIONES']);
    rows.push(['Pedidos entregados', String(summary.orders_count)]);
    rows.push(['Ingreso promedio/pedido', formatCurrency(summary.avg_income_per_order_cents)]);
    rows.push([]);
    rows.push(['PUNTO DE EQUILIBRIO']);
    rows.push(['Costos fijos mensuales', formatCurrency(summary.breakeven.monthly_fixed_costs_cents)]);
    rows.push(['Margen promedio/pedido', formatCurrency(summary.breakeven.avg_margin_per_order_cents)]);
    rows.push(['Pedidos necesarios/mes', String(summary.breakeven.orders_needed)]);
    return rows;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Estado de Resultados
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ingresos, egresos y margen del período
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker from={from} to={to} onChange={handleDateChange} />
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {summary && (
            <ExportCSVButton
              data={getCsvData()}
              filename={`pyl_${from}_${to}`}
              mode="client"
            />
          )}
        </div>
      </div>

      {/* Error */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300"
          >
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PylSkeleton />
          </motion.div>
        ) : summary ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <PylKpiCards summary={summary} />
            <PylTrendChart data={trend} />
            <PylBreakdownCharts summary={summary} />
            <PylBreakevenCard summary={summary} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// Skeleton loader
function PylSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          </div>
        ))}
      </div>
      {/* Trend chart skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4" />
        <div className="h-[350px] bg-gray-100 dark:bg-gray-700/50 rounded-lg" />
      </div>
      {/* Breakdown skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
            <div className="h-[250px] bg-gray-100 dark:bg-gray-700/50 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
