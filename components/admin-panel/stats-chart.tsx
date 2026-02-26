'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { colors, formatCurrency } from '@/config/tokens';
import type { DailyStats } from '@/types/admin-panel';

interface StatsChartProps {
  data: DailyStats[];
  isLoading?: boolean;
}

function formatChartDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'America/Lima' });
}

interface TooltipPayload {
  value: number;
  name: string;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const revenue = payload.find((p) => p.name === 'revenue_cents');
  const delivered = payload.find((p) => p.name === 'delivered');
  const cancelled = payload.find((p) => p.name === 'cancelled');

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label ? formatChartDate(label) : ''}
      </p>
      {delivered && (
        <p className="text-green-600 dark:text-green-400">Entregados: {delivered.value}</p>
      )}
      {cancelled && (
        <p className="text-red-500 dark:text-red-400">Cancelados: {cancelled.value}</p>
      )}
      {revenue && (
        <p className="text-gray-900 dark:text-white font-semibold mt-1">
          {formatCurrency(revenue.value)}
        </p>
      )}
    </div>
  );
}

export function StatsChart({ data, isLoading }: StatsChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 h-full">
        <div className="w-40 h-4 rounded bg-gray-100 dark:bg-gray-800 animate-pulse mb-3" />
        <div className="h-[180px] rounded-xl bg-gray-50 dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Pedidos por día
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.semantic.success} stopOpacity={0.2} />
                <stop offset="95%" stopColor={colors.semantic.success} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.semantic.error} stopOpacity={0.15} />
                <stop offset="95%" stopColor={colors.semantic.error} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => value === 'delivered' ? 'Entregados' : 'Cancelados'}
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="delivered"
              stroke={colors.semantic.success}
              strokeWidth={2}
              fill="url(#colorDelivered)"
              dot={false}
              activeDot={{ r: 3, fill: colors.semantic.success }}
            />
            <Area
              type="monotone"
              dataKey="cancelled"
              stroke={colors.semantic.error}
              strokeWidth={2}
              fill="url(#colorCancelled)"
              dot={false}
              activeDot={{ r: 3, fill: colors.semantic.error }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
