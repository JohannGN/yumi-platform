'use client';

import {
  TrendingUp,
  Truck,
  Wallet,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { formatCurrency } from '@/config/design-tokens';
import type { FinancialSummary } from '@/types/admin-panel';

interface FinancialKpiCardsProps {
  summary: FinancialSummary | null;
  loading?: boolean;
}

interface KpiCardData {
  title: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
  highlight?: boolean;
}

function KpiSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
      <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
      <div className="h-3 w-20 bg-gray-100 dark:bg-gray-600 rounded" />
    </div>
  );
}

export function FinancialKpiCards({ summary, loading }: FinancialKpiCardsProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
    );
  }

  const cards: KpiCardData[] = [
    {
      title: 'Ingresos hoy',
      value: formatCurrency(summary.total_revenue_cents),
      icon: TrendingUp,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      subtitle: 'pedidos entregados',
    },
    {
      title: 'Delivery fees',
      value: formatCurrency(summary.delivery_fees_cents),
      icon: Truck,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      subtitle: 'cobrado por delivery',
    },
    {
      title: 'Bonos riders',
      value: formatCurrency(summary.rider_bonuses_cents),
      icon: DollarSign,
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      subtitle: 'distancias largas',
    },
    {
      title: 'Efectivo en calle',
      value: formatCurrency(summary.cash_in_field_cents),
      icon: Wallet,
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      subtitle: 'pedidos activos',
      highlight: summary.cash_in_field_cents > 50000, // > S/ 500
    },
    {
      title: 'Pendientes validar',
      value: String(summary.pending_validations_count),
      icon: AlertCircle,
      iconBg: summary.pending_validations_count > 0
        ? 'bg-yellow-100 dark:bg-yellow-900/30'
        : 'bg-gray-100 dark:bg-gray-700',
      iconColor: summary.pending_validations_count > 0
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-gray-400',
      subtitle: 'cierres de caja',
      highlight: summary.pending_validations_count > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`
              bg-white dark:bg-gray-800 rounded-xl p-5
              border transition-all duration-200
              ${card.highlight
                ? 'border-orange-300 dark:border-orange-700 shadow-sm shadow-orange-100 dark:shadow-orange-900/20'
                : 'border-gray-200 dark:border-gray-700'
              }
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight">
                {card.title}
              </p>
              <div className={`p-2 rounded-lg ${card.iconBg} flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
              {card.value}
            </p>
            {card.subtitle && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {card.subtitle}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
