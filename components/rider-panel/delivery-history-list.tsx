'use client';

import { formatCurrency, formatTime, formatOrderCode, paymentMethodLabels, colors } from '@/config/tokens';
import { motion } from 'framer-motion';
import type { RiderHistoryOrder } from '@/types/rider-panel';

interface DeliveryHistoryListProps {
  orders: RiderHistoryOrder[];
  showEarnings: boolean;
}

export function DeliveryHistoryList({ orders, showEarnings }: DeliveryHistoryListProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">📭</span>
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          Sin entregas en este período
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {orders.map((order, idx) => {
        const method = order.actual_payment_method || order.payment_method;
        const methodLabel = paymentMethodLabels[method] || method;

        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              {/* Left: restaurant + code + time */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {order.restaurant_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-mono font-semibold text-gray-400 dark:text-gray-500">
                    {formatOrderCode(order.code)}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    {formatTime(order.delivered_at)}
                  </span>
                </div>

                {/* Payment method + rating */}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded bg-gray-50 dark:bg-gray-700">
                    {getPaymentIcon(method)} {methodLabel}
                  </span>
                  {order.customer_rating && (
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      ⭐ {order.customer_rating}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: total + earnings */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                  {formatCurrency(order.total_cents)}
                </p>
                {showEarnings && order.earnings_cents !== undefined && (
                  <p className="text-[11px] font-semibold tabular-nums mt-0.5" style={{ color: colors.semantic.success }}>
                    +{formatCurrency(order.earnings_cents)}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function getPaymentIcon(method: string): string {
  switch (method) {
    case 'cash': return '💵';
    case 'pos': return '💳';
    case 'yape':
    case 'plin': return '📱';
    default: return '💰';
  }
}
