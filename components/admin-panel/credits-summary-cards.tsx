'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bike,
  Store,
  AlertTriangle,
  TicketCheck,
  RefreshCw,
} from 'lucide-react';
import {
  formatCurrency,
  creditStatusColors,
} from '@/config/design-tokens';

// ── Types ────────────────────────────────────────────────────
interface CreditsSummaryData {
  riders: {
    total_balance_cents: number;
    count_commission: number;
    count_critical: number;
    count_warning: number;
    count_healthy: number;
  };
  restaurants: {
    total_balance_cents: number;
    count_total: number;
  };
  recharge_codes: {
    pending_count: number;
    pending_amount_cents: number;
  };
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

// ── Skeleton ─────────────────────────────────────────────────
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

// ── Component ────────────────────────────────────────────────
export function CreditsSummaryCards() {
  const [data, setData] = useState<CreditsSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/credits/summary');
      if (!res.ok) throw new Error('Error');
      const json = await res.json() as CreditsSummaryData;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchSummary(); }, [fetchSummary]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  // Null-safe destructure — API may return partial data if no riders/restaurants exist
  const riders = data.riders ?? { total_balance_cents: 0, count_commission: 0, count_critical: 0, count_warning: 0, count_healthy: 0 };
  const restaurants = data.restaurants ?? { total_balance_cents: 0, count_total: 0 };
  const codes = data.recharge_codes ?? { pending_count: 0, pending_amount_cents: 0 };

  const alertCount = (riders.count_critical ?? 0) + (riders.count_warning ?? 0);

  const cards: KpiCardData[] = [
    {
      title: 'Saldo total riders',
      value: formatCurrency(riders.total_balance_cents),
      icon: Bike,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      subtitle: `${riders.count_commission} riders por comisión`,
    },
    {
      title: 'Saldo total restaurantes',
      value: formatCurrency(restaurants.total_balance_cents),
      icon: Store,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      subtitle: `${restaurants.count_total} restaurantes`,
    },
    {
      title: 'Riders en alerta',
      value: String(alertCount),
      icon: AlertTriangle,
      iconBg: alertCount > 0
        ? 'bg-red-100 dark:bg-red-900/30'
        : 'bg-gray-100 dark:bg-gray-700',
      iconColor: alertCount > 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-400',
      subtitle: alertCount > 0
        ? `${riders.count_critical} crítico, ${riders.count_warning} bajo`
        : 'Todos con saldo saludable',
      highlight: alertCount > 0,
    },
    {
      title: 'Códigos pendientes',
      value: String(codes.pending_count),
      icon: TicketCheck,
      iconBg: codes.pending_count > 0
        ? 'bg-orange-100 dark:bg-orange-900/30'
        : 'bg-gray-100 dark:bg-gray-700',
      iconColor: codes.pending_count > 0
        ? 'text-orange-600 dark:text-orange-400'
        : 'text-gray-400',
      subtitle: codes.pending_count > 0
        ? `${formatCurrency(codes.pending_amount_cents)} por canjear`
        : 'Sin códigos pendientes',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Refresh */}
      <div className="flex justify-end">
        <button
          onClick={() => void fetchSummary()}
          disabled={loading}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Actualizar datos"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`
                bg-white dark:bg-gray-800 rounded-xl p-5
                border transition-all duration-200
                ${card.highlight
                  ? 'border-red-300 dark:border-red-700 shadow-sm shadow-red-100 dark:shadow-red-900/20'
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

      {/* Alert detail badges */}
      {alertCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            {alertCount} rider{alertCount > 1 ? 's' : ''} con saldo insuficiente
          </p>
          <div className="flex gap-3 mt-2">
            {riders.count_critical > 0 && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                style={{ backgroundColor: `${creditStatusColors.critical}20`, color: creditStatusColors.critical }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: creditStatusColors.critical }} />
                {riders.count_critical} crítico{riders.count_critical > 1 ? 's' : ''}
              </span>
            )}
            {riders.count_warning > 0 && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                style={{ backgroundColor: `${creditStatusColors.warning}20`, color: creditStatusColors.warning }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: creditStatusColors.warning }} />
                {riders.count_warning} bajo{riders.count_warning > 1 ? 's' : ''}
              </span>
            )}
            {riders.count_healthy > 0 && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                style={{ backgroundColor: `${creditStatusColors.healthy}20`, color: creditStatusColors.healthy }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: creditStatusColors.healthy }} />
                {riders.count_healthy} saludable{riders.count_healthy > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
