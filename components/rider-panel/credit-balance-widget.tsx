'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useRider } from './rider-context';
import { useRiderCredits } from '@/hooks/use-rider-credits';
import {
  formatCurrency,
  getCreditStatusColor,
  getCreditStatusLabel,
  creditStatusColors,
} from '@/config/tokens';

export function CreditBalanceWidget() {
  const router = useRouter();
  const { rider } = useRider();

  // #117: fixed_salary → NO renderizar nada
  if (!rider || rider.pay_type === 'fixed_salary') return null;

  const { data, isLoading } = useRiderCredits(rider.id, rider.pay_type === 'commission');

  // Skeleton
  if (isLoading || !data) {
    return <CreditBalanceSkeleton />;
  }

  const statusColor = getCreditStatusColor(data.balance_cents);
  const statusLabel = getCreditStatusLabel(data.balance_cents);
  const shift = data.shift_summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden"
    >
      {/* Balance header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Mis créditos
            </p>
            <motion.p
              key={data.balance_cents}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-black text-gray-900 dark:text-white tabular-nums mt-0.5"
            >
              {formatCurrency(data.balance_cents)}
            </motion.p>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            <span
              className="text-[11px] font-bold"
              style={{ color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Cash orders indicator */}
        {!data.can_receive_cash_orders && (
          <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40">
            <span className="text-xs">⚠️</span>
            <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
              Sin pedidos en efectivo
            </p>
          </div>
        )}
      </div>

      {/* Shift mini-summary */}
      {shift.deliveries > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                  {shift.deliveries}
                </p>
                <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase">
                  Entregas
                </p>
              </div>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
              <div className="text-center">
                <p className="text-sm font-black tabular-nums" style={{ color: creditStatusColors.healthy }}>
                  {formatCurrency(shift.total_earned_delivery_cents)}
                </p>
                <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase">
                  Ganado
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => router.push('/rider/recargar')}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-orange-600 dark:text-orange-400 active:bg-orange-50 dark:active:bg-orange-950/20 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Recargar
        </button>
        <div className="w-px bg-gray-100 dark:bg-gray-700" />
        <button
          onClick={() => router.push('/rider/creditos')}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Historial
        </button>
      </div>
    </motion.div>
  );
}

function CreditBalanceSkeleton() {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="w-20 h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          <div className="w-32 h-7 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="w-24 h-5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" />
      </div>
      <div className="flex gap-3 mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/50">
        <div className="w-20 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        <div className="w-20 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  );
}
