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

  const formatChartDate = (date: string) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Crecimiento
        </h3>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${
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
        <div className="space-y-3 animate-pulse flex-1">
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 h-14 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            ))}
          </div>
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg min-h-[100px]" />
        </div>
      ) : (
        <>
          {/* Compact KPI row */}
          <div className="flex gap-2 mb-3">
            {[
              { icon: Users, value: cp?.unique_customers ?? 0, label: 'Únicos', bg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
              { icon: UserPlus, value: cp?.new_customers ?? 0, label: 'Nuevos', bg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
              { icon: UserCheck, value: cp?.returning_customers ?? 0, label: 'Recurrentes', bg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
            ].map(({ icon: ItemIcon, value, label, bg, iconColor }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${bg}`}>
                  <ItemIcon className={`w-3.5 h-3.5 ${iconColor}`} />
                </div>
                <p className="text-base font-bold text-gray-900 dark:text-white leading-none">{value}</p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-none">{label}</p>
              </div>
            ))}
          </div>

          {/* Growth badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${growthBg} ${growthColor}`}>
              <GrowthIcon className="w-3 h-3" />
              {isPositive ? '+' : ''}{growthPct}%
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {PERIOD_COMPARE[period]}
            </span>
          </div>

          {/* Trend chart — fills remaining space */}
          {data?.trend && data.trend.length > 0 && (
            <div className="flex-1 min-h-0">
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
                    tick={{ fontSize: 9, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 9, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#F9FAFB',
                    }}
                    labelFormatter={(label) => {
                      const d = new Date(label as string);
                      return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
                    }}
                    formatter={((value: number | string) => [`${value} clientes`, 'Únicos']) as never}
                  />
                  <Area
                    type="monotone"
                    dataKey="customers"
                    stroke={colors.brand.primary}
                    strokeWidth={2}
                    fill="url(#growthGradient)"
                    dot={false}
                    activeDot={{ r: 3, fill: colors.brand.primary, stroke: '#fff', strokeWidth: 2 }}
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
