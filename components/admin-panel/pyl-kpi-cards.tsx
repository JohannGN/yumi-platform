'use client';

// ============================================================
// PylKpiCards — KPI cards para el dashboard P&L
// Chat: EGRESOS-3
// ============================================================

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpDown,
  ShoppingBag,
  Target,
} from 'lucide-react';
import { formatCurrency } from '@/config/tokens';
import { colors } from '@/config/design-tokens';
import type { PylSummary } from '@/types/pyl';

interface PylKpiCardsProps {
  summary: PylSummary;
}

export function PylKpiCards({ summary }: PylKpiCardsProps) {
  const isPositiveMargin = summary.margin.net_cents >= 0;

  const cards = [
    {
      label: 'Ingresos totales',
      value: formatCurrency(summary.income.total_cents),
      icon: TrendingUp,
      iconColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      sub: `${summary.orders_count} pedidos entregados`,
    },
    {
      label: 'Egresos totales',
      value: formatCurrency(summary.expenses.total_cents),
      icon: TrendingDown,
      iconColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      sub: `${summary.expenses.by_category.length} categorías`,
    },
    {
      label: 'Margen neto',
      value: formatCurrency(summary.margin.net_cents),
      icon: DollarSign,
      iconColor: isPositiveMargin
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400',
      iconBg: isPositiveMargin
        ? 'bg-green-100 dark:bg-green-900/30'
        : 'bg-red-100 dark:bg-red-900/30',
      sub: `${summary.margin.margin_percentage.toFixed(1)}% del ingreso`,
      highlight: true,
      highlightPositive: isPositiveMargin,
    },
    {
      label: 'Ratio I/E',
      value: summary.margin.ratio >= 999 ? '∞' : `${summary.margin.ratio.toFixed(1)}x`,
      icon: ArrowUpDown,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      sub: summary.margin.ratio >= 1
        ? 'Ingresos superan egresos'
        : 'Egresos superan ingresos',
    },
    {
      label: 'Ingreso por pedido',
      value: formatCurrency(summary.avg_income_per_order_cents),
      icon: ShoppingBag,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      sub: `Promedio de ${summary.orders_count} pedidos`,
    },
    {
      label: 'Equilibrio',
      value: summary.breakeven.orders_needed > 0
        ? `${summary.breakeven.orders_needed} ped/mes`
        : 'Sin costos fijos',
      icon: Target,
      iconColor: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      sub: summary.breakeven.monthly_fixed_costs_cents > 0
        ? `Fijos: ${formatCurrency(summary.breakeven.monthly_fixed_costs_cents)}/mes`
        : 'Sin egresos recurrentes registrados',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`bg-white dark:bg-gray-800 rounded-xl p-5 border transition-colors ${
              card.highlight
                ? card.highlightPositive
                  ? 'border-green-300 dark:border-green-700 ring-1 ring-green-200 dark:ring-green-800'
                  : 'border-red-300 dark:border-red-700 ring-1 ring-red-200 dark:ring-red-800'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {card.label}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {card.value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {card.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
}
