'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DailyFinancialBreakdown } from '@/types/admin-panel';

interface FinancialChartProps {
  data: DailyFinancialBreakdown[];
  loading?: boolean;
}

function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse" />
      <div className="h-56 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
    </div>
  );
}

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, entry) => sum + (entry.value ?? 0), 0);
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-500 dark:text-gray-400">{entry.name}:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            S/ {((entry.value ?? 0) / 100).toFixed(2)}
          </span>
        </div>
      ))}
      <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
        <span className="font-semibold text-gray-900 dark:text-white">
          Total: S/ {(total / 100).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function FinancialChart({ data, loading }: FinancialChartProps) {
  if (loading || !data.length) return <ChartSkeleton />;

  const chartData = data.map(d => {
    const date = new Date(d.date + 'T12:00:00');
    const label = date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' });
    return {
      label,
      Efectivo: Math.round(d.cash_cents / 100),
      POS: Math.round(d.pos_cents / 100),
      'Yape/Plin': Math.round(d.yape_plin_cents / 100),
    };
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Ingresos ultimos 7 dias
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `S/${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="Efectivo" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
          <Bar dataKey="POS" stackId="a" fill="#3B82F6" />
          <Bar dataKey="Yape/Plin" stackId="a" fill="#FF6B35" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
