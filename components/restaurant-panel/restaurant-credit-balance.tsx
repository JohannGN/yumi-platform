'use client';

import { useEffect, useRef } from 'react';
import { TrendingUp, ArrowDownRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getCreditStatusColor,
  getCreditStatusLabel,
  formatCurrency,
} from '@/config/tokens';

interface RestaurantCreditBalanceProps {
  credits: {
    balance_cents: number;
    total_earned_cents: number;
    total_liquidated_cents: number;
  };
  restaurantId: string | null;
  onBalanceUpdate: () => void;
}

export function RestaurantCreditBalance({
  credits,
  restaurantId,
  onBalanceUpdate,
}: RestaurantCreditBalanceProps) {
  const supabaseRef = useRef(createClient());

  // Realtime subscription for balance updates
  useEffect(() => {
    if (!restaurantId) return;

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`restaurant-credits-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'restaurant_credits',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          onBalanceUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, onBalanceUpdate]);

  const statusColor = getCreditStatusColor(credits.balance_cents);
  const statusLabel = getCreditStatusLabel(credits.balance_cents);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
      {/* Main balance */}
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Saldo actual</p>
        <p
          className="text-3xl font-bold tabular-nums"
          style={{ color: statusColor }}
        >
          {formatCurrency(credits.balance_cents)}
        </p>
        <span
          className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${statusColor}18`,
            color: statusColor,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Secondary indicators */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="flex-shrink-0 p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total ganado</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums truncate">
              {formatCurrency(credits.total_earned_cents)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex-shrink-0 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <ArrowDownRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total liquidado</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums truncate">
              {formatCurrency(credits.total_liquidated_cents)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
