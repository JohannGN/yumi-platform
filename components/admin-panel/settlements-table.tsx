'use client';

import { formatCurrency, formatDateShort } from '@/config/tokens';
import {
  RestaurantSettlement,
  RiderSettlement,
  SETTLEMENT_STATUS_CONFIG,
} from '@/types/settlement-types';

// ─── Skeleton ──────────────────────────────────────────────
function SettlementSkeleton() {
  return (
    <div className="space-y-px">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="h-3.5 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-5 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────
interface Props {
  type: 'restaurant' | 'rider';
  settlements: RestaurantSettlement[] | RiderSettlement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

// ─── Component ─────────────────────────────────────────────
export function SettlementsTable({ type, settlements, selectedId, onSelect, loading }: Props) {
  if (loading) return <SettlementSkeleton />;

  if (settlements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <p className="text-2xl mb-2">📋</p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Sin liquidaciones
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Crea una nueva con el botón de arriba
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {settlements.map(s => {
        const isSelected = s.id === selectedId;
        const statusCfg  = SETTLEMENT_STATUS_CONFIG[s.status];

        // ── Datos según tipo ──────────────────────────────
        const name =
          type === 'restaurant'
            ? (s as RestaurantSettlement).restaurant?.name ?? '—'
            : (s as RiderSettlement).rider?.user?.name ?? '—';

        const amountLabel =
          type === 'restaurant'
            ? `Neto: ${formatCurrency(s.net_payout_cents)}`
            : `Neto: ${formatCurrency(s.net_payout_cents)}`;

        const subLabel =
          type === 'restaurant'
            ? `${(s as RestaurantSettlement).total_orders} pedidos · Ventas ${formatCurrency((s as RestaurantSettlement).gross_sales_cents)}`
            : `${(s as RiderSettlement).total_deliveries} entregas`;

        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={[
              'w-full text-left px-4 py-3 transition-colors',
              isSelected
                ? 'bg-orange-50 dark:bg-orange-900/20 border-l-2 border-orange-500'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-transparent',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {/* Nombre */}
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {name}
                </p>
                {/* Período */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatDateShort(s.period_start)} – {formatDateShort(s.period_end)}
                </p>
                {/* Sub info */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {subLabel}
                </p>
              </div>
              {/* Monto + badge */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(s.net_payout_cents)}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
