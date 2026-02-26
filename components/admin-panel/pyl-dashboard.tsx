'use client';

// ============================================================
// PylDashboard — Dashboard Estado de Resultados
// Dos modos: Gestión (margen YUMI) y Contable (flujo bancario SUNAT)
// Chat: EGRESOS-3 + Vista Contable
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, RefreshCw, Building2, TrendingUp } from 'lucide-react';
import { DateRangePicker, ExportCSVButton } from '@/components/shared';
import { PylKpiCards } from './pyl-kpi-cards';
import { PylTrendChart } from './pyl-trend-chart';
import { PylBreakdownCharts } from './pyl-breakdown-charts';
import { PylBreakevenCard } from './pyl-breakeven-card';
import { PylAccountingCards } from './pyl-accounting-cards';
import { PylAccountingFlow } from './pyl-accounting-flow';
import { PylLiquidationsTable } from './pyl-liquidations-table';
import { formatCurrency, formatDateShort } from '@/config/tokens';
import type { PylSummary, PylTrendPoint, PylMode } from '@/types/pyl';

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
  const [mode, setMode] = useState<PylMode>('gestion');
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

  // CSV export
  const getCsvData = (): string[][] => {
    if (!summary) return [];

    if (mode === 'contable') {
      const rows: string[][] = [
        ['Reporte Contable YUMI — Flujo Bancario'],
        [`Período: ${formatDateShort(from)} - ${formatDateShort(to)}`],
        [],
        ['ENTRADAS A CUENTAS YUMI'],
        ['Concepto', 'Monto'],
        ['Pagos digitales (Yape/Plin)', formatCurrency(summary.accounting.digital_payments_received_cents)],
        ['Recargas de riders', formatCurrency(summary.accounting.rider_recharges_cents)],
        ['Total entradas', formatCurrency(summary.accounting.total_income_cents)],
        [],
        ['SALIDAS DE CUENTAS YUMI'],
        ['Concepto', 'Monto'],
        ['Liquidaciones a restaurantes', formatCurrency(summary.accounting.restaurant_liquidations_cents)],
        ['Gastos operativos', formatCurrency(summary.accounting.operational_expenses_cents)],
        ['Total salidas', formatCurrency(summary.accounting.total_expenses_cents)],
        [],
        ['BALANCE BANCARIO NETO', formatCurrency(summary.accounting.net_bank_balance_cents)],
        [],
        ['EFECTIVO EN TRÁNSITO (cash físico, no pasa por banco)'],
        ['Cash cobrado por riders', formatCurrency(summary.accounting.cash_collected_cents)],
        ['Total pendiente bancarizar', formatCurrency(summary.accounting.total_cash_in_transit_cents)],
        [],
        ['DESGLOSE POR MÉTODO DE PAGO'],
        ['Método', 'Pedidos', 'Monto'],
      ];
      for (const pm of summary.accounting.by_payment_method) {
        rows.push([pm.method, String(pm.orders_count), formatCurrency(pm.total_cents)]);
      }
      rows.push([]);
      rows.push(['LIQUIDACIONES A RESTAURANTES']);
      rows.push(['Restaurante', 'Monto', 'Fecha', 'Método']);
      for (const liq of summary.accounting.liquidations_by_restaurant) {
        rows.push([liq.restaurant_name, formatCurrency(liq.amount_cents), liq.date, liq.payment_method]);
      }
      return rows;
    }

    // Gestión mode
    const rows: string[][] = [
      ['Estado de Resultados YUMI — Vista Gestión'],
      [`Período: ${formatDateShort(from)} - ${formatDateShort(to)}`],
      [],
      ['INGRESOS YUMI'],
      ['Concepto', 'Monto'],
      ['Delivery fees', formatCurrency(summary.income.delivery_fees_cents)],
      ['Comisiones restaurantes', formatCurrency(summary.income.commissions_cents)],
      ['Redondeo surplus', formatCurrency(summary.income.rounding_surplus_cents)],
      ['Total ingresos', formatCurrency(summary.income.total_cents)],
      [],
      ['EGRESOS OPERATIVOS'],
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
    rows.push(['Pedidos entregados', String(summary.orders_count)]);
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
              {mode === 'gestion' ? 'Margen operativo YUMI' : 'Flujo bancario para SUNAT'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setMode('gestion')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'gestion'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Gestión
            </button>
            <button
              onClick={() => setMode('contable')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'contable'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Contable
            </button>
          </div>

          <DateRangePicker from={from} to={to} onChange={(range) => handleDateChange(range.from, range.to)} />
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
              filename={`pyl_${mode}_${from}_${to}`}
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
            key={`content-${mode}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {mode === 'gestion' ? (
              <>
                <PylKpiCards summary={summary} />
                <PylTrendChart data={trend} mode="gestion" />
                <PylBreakdownCharts summary={summary} />
                <PylBreakevenCard summary={summary} />
              </>
            ) : (
              <>
                <PylAccountingCards summary={summary} />
                <PylTrendChart data={trend} mode="contable" />
                <PylAccountingFlow summary={summary} />
                <PylLiquidationsTable summary={summary} />
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function PylSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4" />
        <div className="h-[350px] bg-gray-100 dark:bg-gray-700/50 rounded-lg" />
      </div>
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
