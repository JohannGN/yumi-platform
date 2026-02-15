'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice, roundUpCents } from '@/lib/utils/rounding';
import { paymentMethodLabels, colors } from '@/config/tokens';
import type { PaymentMethod } from '@/types/checkout';

// POS surcharge rate (pasarela de pagos)
export const POS_SURCHARGE_RATE = 0.045;

interface StepPaymentMethodProps {
  subtotalCents: number;
  deliveryFeeCents: number;
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  onNext: () => void;
  onBack: () => void;
}

const PAYMENT_OPTIONS: { method: PaymentMethod; emoji: string; description: string }[] = [
  { method: 'cash', emoji: '💵', description: 'Al recibir tu pedido' },
  { method: 'pos', emoji: '💳', description: 'Tarjeta al recibir' },
  { method: 'yape', emoji: '📱', description: 'Al recibir tu pedido' },
  { method: 'plin', emoji: '📱', description: 'Al recibir tu pedido' },
];

export function StepPaymentMethod({
  subtotalCents,
  deliveryFeeCents,
  selectedMethod,
  onSelect,
  onNext,
  onBack,
}: StepPaymentMethodProps) {
  const baseTotalCents = useMemo(() => {
    return roundUpCents(subtotalCents + deliveryFeeCents);
  }, [subtotalCents, deliveryFeeCents]);

  // POS surcharge: 4.5% rounded up (YUMI favor)
  const posSurchargeCents = useMemo(() => {
    return roundUpCents(Math.ceil(baseTotalCents * POS_SURCHARGE_RATE));
  }, [baseTotalCents]);

  const finalTotalCents = selectedMethod === 'pos'
    ? baseTotalCents + posSurchargeCents
    : baseTotalCents;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Total to pay */}
      <div className="text-center py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
        <p className="text-sm text-gray-500 dark:text-gray-400">Total a pagar</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
          {formatPrice(finalTotalCents)}
        </p>
      </div>

      {/* Payment method cards */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          ¿Cómo deseas pagar?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {PAYMENT_OPTIONS.map(({ method, emoji, description }) => {
            const isSelected = selectedMethod === method;
            return (
              <motion.button
                key={method}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(method)}
                className={`
                  relative p-4 rounded-xl border-2 text-left transition-all duration-200
                  ${isSelected
                    ? 'border-[#FF6B35] bg-orange-50 dark:bg-orange-950/30 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                {isSelected && (
                  <motion.div
                    layoutId="payment-check"
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    ✔
                  </motion.div>
                )}
                <span className="text-2xl block mb-1">{emoji}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                  {paymentMethodLabels[method]}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {description}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* POS surcharge notice */}
      <AnimatePresence>
        {selectedMethod === 'pos' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50">
              <div className="flex items-start gap-2.5">
                <span className="text-base mt-0.5">💳</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Recargo por pasarela de pagos
                  </p>
                  <div className="mt-1.5 space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600 dark:text-blue-400">Pedido</span>
                      <span className="tabular-nums text-blue-700 dark:text-blue-300">{formatPrice(baseTotalCents)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600 dark:text-blue-400">Recargo 4.5%</span>
                      <span className="tabular-nums text-blue-700 dark:text-blue-300">+{formatPrice(posSurchargeCents)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-1 border-t border-blue-200 dark:border-blue-800/50">
                      <span className="text-blue-800 dark:text-blue-200">Total con tarjeta</span>
                      <span className="tabular-nums text-blue-800 dark:text-blue-200">{formatPrice(finalTotalCents)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Atrás
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onNext}
          className="flex-1 py-3 rounded-xl font-semibold text-white transition-all duration-200 bg-[#FF6B35] hover:bg-[#E55A25] active:bg-[#D04A15] shadow-md"
        >
          Revisar pedido
        </motion.button>
      </div>
    </motion.div>
  );
}
