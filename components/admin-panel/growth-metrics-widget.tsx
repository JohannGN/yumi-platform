'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, UserCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { colors } from '@/config/tokens';
import type { GrowthResponse } from '@/types/admin-panel-additions';

type Period = 'day' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
};

const PERIOD_COMPARE: Record<Period, string> = {
  day: 'vs ayer',
  week: 'vs semana anterior',
  month: 'vs mes anterior',
};

export function GrowthMetricsWidget() {
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<GrowthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/stats/growth?period=${period}`);
      if (res.ok) {
        const json = await res.json() as GrowthResponse;
        setData(json);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const cp = data?.current_period;
  const growthPct = data?.growth_percentage ?? 0;
  const isPositive = growthPct > 0;
  const isNeutral = growthPct === 0;
  const GrowthIcon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;
  const growthColor = isPositive ? 'text-green-600 dark:text-green-400' : isNeutral ? 'text-gray-400' : 'text-red-500 dark:text-red-400';
  const growthBg = isPositive ? 'bg-green-50 dark:bg-green-900/20' : isNeutral ? 'bg-gray-50 dark:bg-gray-800' : 'bg-red-50 dark:bg-red-900/20';

  // Format dates for chart tooltip
  const formatChartDate = (date: string) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Crecimiento de clientes
        </h3>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                period === p
                  ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Skeleton */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            ))}
          </div>
          <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
      ) : (
        <>
          {/* KPI cards row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Unique customers */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {cp?.unique_customers ?? 0}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Clientes únicos</p>
              </div>
            </div>

            {/* New customers */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30">
                <UserPlus className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {cp?.new_customers ?? 0}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Nuevos</p>
              </div>
            </div>

            {/* Returning customers */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {cp?.returning_customers ?? 0}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Recurrentes</p>
              </div>
            </div>
          </div>

          {/* Growth badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${growthBg} ${growthColor}`}>
              <GrowthIcon className="w-3.5 h-3.5" />
              {isPositive ? '+' : ''}{growthPct}%
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {PERIOD_COMPARE[period]}
            </span>
          </div>

          {/* Trend chart */}
          {data?.trend && data.trend.length > 0 && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.brand.primary} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={colors.brand.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#F9FAFB',
                    }}
                    labelFormatter={(label) => {
                      const d = new Date(label as string);
                      return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
                    }}
                    formatter={(value: number | string) => [`${value} clientes`, 'Únicos']}
                  />
                  <Area
                    type="monotone"
                    dataKey="customers"
                    stroke={colors.brand.primary}
                    strokeWidth={2}
                    fill="url(#growthGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: colors.brand.primary, stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
