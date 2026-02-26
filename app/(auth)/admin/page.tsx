'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  TrendingUp,
  Truck,
  UtensilsCrossed,
  Bike,
  Clock,
  ChefHat,
  DollarSign,
} from 'lucide-react';
import { KpiCard } from '@/components/admin-panel/kpi-card';
import { StatsChart } from '@/components/admin-panel/stats-chart';
import { GrowthMetricsWidget } from '@/components/admin-panel/growth-metrics-widget';
import { DateRangePicker } from '@/components/shared/date-range-picker';
import type { DateRange } from '@/components/shared/date-range-picker';
import { colors, formatCurrency } from '@/config/tokens';
import type { AdminStats, DailyStats } from '@/types/admin-panel';

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AdminDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: todayISO(),
    to: todayISO(),
  });
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [chartData, setChartData] = useState<DailyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
      });
      const res = await fetch(`/api/admin/stats?${params}`);
      if (res.ok) {
        const data = await res.json() as AdminStats;
        setStats(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  const loadChart = useCallback(async () => {
    setIsChartLoading(true);
    try {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      const diffDays = Math.max(7, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const res = await fetch(`/api/admin/stats/daily?days=${Math.min(diffDays, 30)}`);
      if (res.ok) {
        const data = await res.json() as DailyStats[];
        setChartData(data);
      }
    } finally {
      setIsChartLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadChart(); }, [loadChart]);

  return (
    <div className="space-y-3">
      {/* Header with DateRangePicker */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Resumen del negocio</h2>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* All 8 KPIs in a single compact grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Pedidos totales"
          value={isLoading ? '—' : String(stats?.orders.total ?? 0)}
          subtitle={isLoading ? '' : `${stats?.orders.active ?? 0} activos ahora`}
          icon={Package}
          color={colors.brand.primary}
          isLoading={isLoading}
        />
        <KpiCard
          title="Ingresos"
          value={isLoading ? '—' : formatCurrency(stats?.revenue.total_cents ?? 0)}
          subtitle={isLoading ? '' : `Delivery: ${formatCurrency(stats?.revenue.delivery_fees_cents ?? 0)}`}
          icon={DollarSign}
          color={colors.semantic.success}
          isLoading={isLoading}
        />
        <KpiCard
          title="Pedido promedio"
          value={isLoading ? '—' : formatCurrency(stats?.revenue.avg_order_cents ?? 0)}
          subtitle={isLoading ? '' : `${stats?.orders.delivered ?? 0} entregados`}
          icon={TrendingUp}
          color={colors.brand.accent}
          isLoading={isLoading}
        />
        <KpiCard
          title="Cancelados"
          value={isLoading ? '—' : String(stats?.orders.cancelled ?? 0)}
          subtitle={isLoading ? '' : `${stats?.orders.rejected ?? 0} rechazados`}
          icon={Truck}
          color={colors.semantic.error}
          isLoading={isLoading}
        />
        <KpiCard
          title="Restaurantes"
          value={isLoading ? '—' : String(stats?.restaurants.active ?? 0)}
          subtitle={isLoading ? '' : `${stats?.restaurants.open_now ?? 0} abiertos`}
          icon={UtensilsCrossed}
          color={colors.brand.secondary}
          isLoading={isLoading}
        />
        <KpiCard
          title="Riders en línea"
          value={isLoading ? '—' : String(stats?.riders.online ?? 0)}
          subtitle={isLoading ? '' : `${stats?.riders.available ?? 0} disp · ${stats?.riders.busy ?? 0} ocup`}
          icon={Bike}
          color={colors.semantic.info}
          isLoading={isLoading}
        />
        <KpiCard
          title="Tiempo entrega"
          value={isLoading ? '—' : `${stats?.performance.avg_delivery_minutes ?? 0} min`}
          subtitle="Prom. desde confirmación"
          icon={Clock}
          color={colors.semantic.warning}
          isLoading={isLoading}
        />
        <KpiCard
          title="Tiempo preparación"
          value={isLoading ? '—' : `${stats?.performance.avg_prep_minutes ?? 0} min`}
          subtitle="Prom. restaurante"
          icon={ChefHat}
          color={colors.brand.primaryLight}
          isLoading={isLoading}
        />
      </div>

      {/* Chart + Growth — matched height */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:h-[300px]">
        <div className="lg:col-span-2">
          <StatsChart data={chartData} isLoading={isChartLoading} />
        </div>
        <div>
          <GrowthMetricsWidget />
        </div>
      </div>

      {/* Compact status bar */}
      {!isLoading && stats && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-5 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado actual</h3>
            <div className="flex items-center gap-6 flex-wrap">
              {[
                { label: 'Pedidos activos', value: stats.orders.active, dot: colors.brand.primary },
                { label: 'Restaurantes abiertos', value: stats.restaurants.open_now, dot: colors.semantic.success },
                { label: 'Riders disponibles', value: stats.riders.available, dot: colors.semantic.info },
                { label: 'Riders ocupados', value: stats.riders.busy, dot: colors.semantic.warning },
              ].map(({ label, value, dot }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
