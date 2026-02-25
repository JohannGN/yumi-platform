'use client';

// ============================================================
// PylBreakdownCharts — Desglose ingresos y egresos con PieCharts
// Chat: EGRESOS-3
// ============================================================

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Wallet, Receipt } from 'lucide-react';
import { formatCurrency } from '@/config/tokens';
import type { PylSummary } from '@/types/pyl';

interface PylBreakdownChartsProps {
  summary: PylSummary;
}

// Paleta de colores para categorías de egresos
const EXPENSE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
];

const INCOME_COLORS = ['#22C55E', '#3B82F6', '#F59E0B'];

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { fill: string; percent?: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomPieTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: entry.payload.fill }}
        />
        <span className="font-medium text-gray-900 dark:text-white">
          {entry.name}
        </span>
      </div>
      <p className="text-gray-600 dark:text-gray-300">
        {formatCurrency(entry.value)}
      </p>
    </div>
  );
}

interface LegendPayloadItem {
  value: string;
  color: string;
}

interface CustomLegendProps {
  payload?: LegendPayloadItem[];
  data: Array<{ name: string; value: number }>;
  total: number;
}

function CustomLegend({ payload, data, total }: CustomLegendProps) {
  if (!payload) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {payload.map((entry, idx) => {
        const item = data[idx];
        const pct = total > 0 ? ((item?.value || 0) / total * 100).toFixed(1) : '0';
        return (
          <div key={entry.value} className="flex items-center gap-2 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-300 truncate flex-1">
              {entry.value}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PylBreakdownCharts({ summary }: PylBreakdownChartsProps) {
  const incomeData = useMemo(() => {
    const items = [];
    if (summary.income.delivery_fees_cents > 0) {
      items.push({ name: 'Delivery fees', value: summary.income.delivery_fees_cents });
    }
    if (summary.income.commissions_cents > 0) {
      items.push({ name: 'Comisiones', value: summary.income.commissions_cents });
    }
    if (summary.income.rounding_surplus_cents > 0) {
      items.push({ name: 'Redondeo', value: summary.income.rounding_surplus_cents });
    }
    return items;
  }, [summary.income]);

  const expenseData = useMemo(
    () =>
      summary.expenses.by_category.map((cat) => ({
        name: `${cat.category_icon} ${cat.category_name}`,
        value: cat.total_cents,
      })),
    [summary.expenses.by_category]
  );

  const hasIncome = incomeData.length > 0 && summary.income.total_cents > 0;
  const hasExpenses = expenseData.length > 0 && summary.expenses.total_cents > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Income breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-green-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Desglose de ingresos
          </h3>
          <span className="ml-auto text-sm font-medium text-green-600 dark:text-green-400">
            {formatCurrency(summary.income.total_cents)}
          </span>
        </div>

        {hasIncome ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={incomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {incomeData.map((_, idx) => (
                    <Cell key={idx} fill={INCOME_COLORS[idx % INCOME_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full sm:w-48">
              <CustomLegend
                payload={incomeData.map((item, idx) => ({
                  value: item.name,
                  color: INCOME_COLORS[idx % INCOME_COLORS.length],
                }))}
                data={incomeData}
                total={summary.income.total_cents}
              />
            </div>
          </div>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            Sin ingresos en el período
          </div>
        )}
      </div>

      {/* Expense breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Desglose de egresos
          </h3>
          <span className="ml-auto text-sm font-medium text-red-600 dark:text-red-400">
            {formatCurrency(summary.expenses.total_cents)}
          </span>
        </div>

        {hasExpenses ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {expenseData.map((_, idx) => (
                    <Cell key={idx} fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full sm:w-48 max-h-[220px] overflow-y-auto">
              <CustomLegend
                payload={expenseData.map((item, idx) => ({
                  value: item.name,
                  color: EXPENSE_COLORS[idx % EXPENSE_COLORS.length],
                }))}
                data={expenseData}
                total={summary.expenses.total_cents}
              />
            </div>
          </div>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            Sin egresos en el período
          </div>
        )}
      </div>
    </div>
  );
}
