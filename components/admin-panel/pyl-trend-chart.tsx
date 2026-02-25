'use client';

// ============================================================
// PylTrendChart — Gráfica de tendencia ingresos vs egresos
// recharts ComposedChart con barras y línea de margen
// Chat: EGRESOS-3
// ============================================================

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/config/tokens';
import type { PylTrendPoint } from '@/types/pyl';

interface PylTrendChartProps {
  data: PylTrendPoint[];
}

function formatDateLabel(date: string): string {
  // YYYY-MM-DD → DD/MM, YYYY-MM → MMM, week → DD/MM
  if (date.length === 7) {
    // month format
    const [y, m] = date.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
  }
  // day or week: YYYY-MM-DD → DD/MM
  const parts = date.split('-');
  return `${parts[2]}/${parts[1]}`;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-sm">
      <p className="font-medium text-gray-900 dark:text-white mb-2">
        {label ? formatDateLabel(label) : ''}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-300">{entry.name}</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PylTrendChart({ data }: PylTrendChartProps) {
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        label: formatDateLabel(point.date),
      })),
    [data]
  );

  const hasData = data.length > 0 && data.some(
    (d) => d.income_cents > 0 || d.expenses_cents > 0
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Tendencia
        </h3>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              className="text-gray-500 dark:text-gray-400"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-gray-500 dark:text-gray-400"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `S/${(v / 100).toFixed(0)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
            />
            <Bar
              dataKey="income_cents"
              name="Ingresos"
              fill="#22C55E"
              fillOpacity={0.85}
              radius={[4, 4, 0, 0]}
              barSize={data.length > 60 ? 6 : data.length > 30 ? 10 : 20}
            />
            <Bar
              dataKey="expenses_cents"
              name="Egresos"
              fill="#EF4444"
              fillOpacity={0.85}
              radius={[4, 4, 0, 0]}
              barSize={data.length > 60 ? 6 : data.length > 30 ? 10 : 20}
            />
            <Line
              type="monotone"
              dataKey="margin_cents"
              name="Margen"
              stroke="#FF6B35"
              strokeWidth={2.5}
              dot={data.length <= 31}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[350px] flex items-center justify-center text-gray-400 dark:text-gray-500">
          No hay datos para el período seleccionado
        </div>
      )}
    </div>
  );
}
