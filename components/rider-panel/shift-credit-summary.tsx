'use client';

import { motion } from 'framer-motion';
import { useRider } from './rider-context';
import { useRiderCredits } from '@/hooks/use-rider-credits';
import { formatCurrency, colors, creditStatusColors } from '@/config/tokens';

/**
 * Widget de resumen de créditos del turno actual.
 * Se actualiza en Realtime vía useRiderCredits.
 * Solo visible para riders commission.
 */
export function ShiftCreditSummary() {
  const { rider } = useRider();

  // #117: fixed_salary → nada
  if (!rider || rider.pay_type === 'fixed_salary') return null;

  const { data, isLoading } = useRiderCredits(rider.id, rider.pay_type === 'commission');

  if (isLoading || !data) return <ShiftCreditSkeleton />;

  const shift = data.shift_summary;

  // No mostrar si no hay entregas
  if (shift.deliveries === 0) return null;

  const totalDebits = shift.total_food_debit_cents + shift.total_commission_debit_cents;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">📈</span>
        <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Créditos del turno
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Débitos totales */}
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-2.5">
          <p className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase">
            Débitos
          </p>
          <p className="text-base font-black text-red-600 dark:text-red-400 tabular-nums mt-0.5">
            -{formatCurrency(Math.abs(totalDebits))}
          </p>
        </div>

        {/* Ganado delivery */}
        <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-2.5">
          <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase">
            Ganado
          </p>
          <p className="text-base font-black tabular-nums mt-0.5" style={{ color: creditStatusColors.healthy }}>
            {formatCurrency(shift.total_earned_delivery_cents)}
          </p>
        </div>
      </div>

      {/* Cash vs digital breakdown */}
      {(shift.cash_collected_cents > 0 || shift.digital_collected_cents > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center gap-4">
          {shift.cash_collected_cents > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs">💵</span>
              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 tabular-nums">
                {formatCurrency(shift.cash_collected_cents)}
              </span>
            </div>
          )}
          {shift.digital_collected_cents > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs">📱</span>
              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 tabular-nums">
                {formatCurrency(shift.digital_collected_cents)}
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ShiftCreditSkeleton() {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
      <div className="w-28 h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-3" />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-700/30 p-2.5">
          <div className="w-12 h-2 bg-gray-100 dark:bg-gray-600 rounded animate-pulse mb-2" />
          <div className="w-20 h-5 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-700/30 p-2.5">
          <div className="w-12 h-2 bg-gray-100 dark:bg-gray-600 rounded animate-pulse mb-2" />
          <div className="w-20 h-5 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
