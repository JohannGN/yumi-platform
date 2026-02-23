'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatOrderCode, paymentMethodLabels, colors, getCreditStatusColor } from '@/config/tokens';
import type { PaymentMethodType } from '@/types/rider-panel';
import type { CreditTransaction } from '@/types/credit-types';

interface DeliveryBreakdownProps {
  orderCode: string;
  restaurantName?: string;
  totalCents: number;
  subtotalCents: number;
  deliveryFeeCents: number;
  paymentMethod: PaymentMethodType;
  /** true si rider es commission */
  isCommission: boolean;
  /** Llamar para cerrar el breakdown */
  onClose: () => void;
}

interface BreakdownData {
  balance_cents: number;
  recent_transactions: CreditTransaction[];
}

export function DeliveryBreakdown({
  orderCode,
  restaurantName,
  totalCents,
  subtotalCents,
  deliveryFeeCents,
  paymentMethod,
  isCommission,
  onClose,
}: DeliveryBreakdownProps) {
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch latest credits data after delivery
  useEffect(() => {
    if (!isCommission) {
      setIsLoading(false);
      return;
    }

    const fetchBreakdown = async () => {
      try {
        const res = await fetch('/api/rider/credits');
        if (res.ok) {
          const data = await res.json();
          setBreakdown({
            balance_cents: data.balance_cents,
            recent_transactions: data.recent_transactions ?? [],
          });
        }
      } catch {
        // Silent fail — breakdown is informational
      } finally {
        setIsLoading(false);
      }
    };

    fetchBreakdown();
  }, [isCommission]);

  const isDigitalPayment = ['yape', 'plin', 'pos'].includes(paymentMethod);

  // Find order-related transactions from latest
  const foodDebit = breakdown?.recent_transactions.find(
    (t) => t.transaction_type === 'order_food_debit'
  );
  const commissionDebit = breakdown?.recent_transactions.find(
    (t) => t.transaction_type === 'order_commission_debit'
  );

  const foodDebitCents = foodDebit ? Math.abs(foodDebit.amount_cents) : 0;
  const commissionDebitCents = commissionDebit ? Math.abs(commissionDebit.amount_cents) : 0;
  const earningsCents = deliveryFeeCents - commissionDebitCents;

  return (
    <AnimatePresence>
      {true ? (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[430px] bg-white dark:bg-gray-900 rounded-t-3xl shadow-xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            <div className="px-5 pb-6 pt-2 max-h-[75vh] overflow-y-auto">
              {/* Header */}
              <div className="text-center mb-4">
                <span className="text-3xl">📊</span>
                <h2 className="text-lg font-black text-gray-900 dark:text-white mt-1">
                  Desglose de entrega
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {formatOrderCode(orderCode)}
                  {restaurantName && (
                    <span className="font-sans"> · {restaurantName}</span>
                  )}
                </p>
              </div>

              {/* Fixed salary: simple confirmation */}
              {!isCommission && (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">✅</span>
                  </div>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    Entrega completada
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Total cobrado: {formatCurrency(totalCents)}
                  </p>
                </div>
              )}

              {/* Commission rider: full breakdown */}
              {isCommission && (
                <>
                  {isDigitalPayment ? (
                    /* Digital payment: no credit movement */
                    <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📱</span>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                          Pago digital — {paymentMethodLabels[paymentMethod] || paymentMethod}
                        </p>
                      </div>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/70">
                        Sin movimiento de créditos. YUMI recibió el pago directamente.
                      </p>
                    </div>
                  ) : (
                    /* Cash payment: show debits */
                    <>
                      {isLoading ? (
                        <BreakdownSkeleton />
                      ) : (
                        <div className="space-y-2 mb-4">
                          {/* Subtotal cobrado */}
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Subtotal cobrado
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                              {formatCurrency(subtotalCents)}
                            </span>
                          </div>

                          {/* Food debit */}
                          {foodDebitCents > 0 && (
                            <div className="flex items-center justify-between py-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                (-) Porción comida
                              </span>
                              <span className="text-sm font-bold text-red-500 tabular-nums">
                                -{formatCurrency(foodDebitCents)}
                              </span>
                            </div>
                          )}

                          {/* Commission debit */}
                          {commissionDebitCents > 0 && (
                            <div className="flex items-center justify-between py-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                (-) Comisión YUMI delivery
                              </span>
                              <span className="text-sm font-bold text-red-500 tabular-nums">
                                -{formatCurrency(commissionDebitCents)}
                              </span>
                            </div>
                          )}

                          {/* Divider */}
                          <div className="border-t border-gray-100 dark:border-gray-800" />

                          {/* Earnings */}
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              Tu ganancia delivery
                            </span>
                            <span
                              className="text-base font-black tabular-nums"
                              style={{ color: colors.semantic.success }}
                            >
                              {formatCurrency(Math.max(0, earningsCents))}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Current balance */}
                  {breakdown && (
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          Saldo actual
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getCreditStatusColor(breakdown.balance_cents) }}
                          />
                          <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                            {formatCurrency(breakdown.balance_cents)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                className="w-full mt-5 py-3.5 rounded-2xl text-sm font-bold text-white active:scale-[0.97] transition-transform"
                style={{ backgroundColor: colors.brand.primary }}
              >
                Entendido
              </button>
            </div>

            {/* Safe area */}
            <div className="h-[env(safe-area-inset-bottom,0px)]" />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function BreakdownSkeleton() {
  return (
    <div className="space-y-3 mb-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="w-32 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          <div className="w-20 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
