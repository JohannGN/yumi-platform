'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice, roundUpCents } from '@/lib/utils/rounding';
import { paymentMethodLabels, colors } from '@/config/tokens';
import type { PaymentMethod } from '@/types/checkout';

interface StepPaymentMethodProps {
  subtotalCents: number;
  deliveryFeeCents: number;
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  onNext: () => void;
  onBack: () => void;
}

const PAYMENT_OPTIONS: { method: PaymentMethod; emoji: string; description: string }[] = [
  { method: 'cash', emoji: '💵', description: 'Pagas al recibir tu pedido' },
  { method: 'pos', emoji: '💳', description: 'Tarjeta al recibir tu pedido' },
  { method: 'yape', emoji: '📱', description: 'Transferencia inmediata' },
  { method: 'plin', emoji: '📱', description: 'Transferencia inmediata' },
];

export function StepPaymentMethod({
  subtotalCents,
  deliveryFeeCents,
  selectedMethod,
  onSelect,
  onNext,
  onBack,
}: StepPaymentMethodProps) {
  const [cashAmount, setCashAmount] = useState<string>('');
  const [hasExactAmount, setHasExactAmount] = useState(false);

  // All totals rounded up (YUMI favor)
  const totalCents = useMemo(() => {
    return roundUpCents(subtotalCents + deliveryFeeCents);
  }, [subtotalCents, deliveryFeeCents]);

  const totalSoles = totalCents / 100;

  // Cash change calculation
  const cashAmountCents = useMemo(() => {
    if (hasExactAmount) return totalCents;
    const parsed = parseFloat(cashAmount);
    if (isNaN(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100);
  }, [cashAmount, hasExactAmount, totalCents]);

  const changeCents = useMemo(() => {
    if (hasExactAmount || cashAmountCents <= 0) return 0;
    return Math.max(0, cashAmountCents - totalCents);
  }, [cashAmountCents, totalCents, hasExactAmount]);

  const cashInsufficient = !hasExactAmount && cashAmountCents > 0 && cashAmountCents < totalCents;

  // Quick cash suggestions (bills >= total)
  const cashSuggestions = useMemo(() => {
    const suggestions: number[] = [];
    const amounts = [5, 10, 20, 50, 100, 200];
    for (const amt of amounts) {
      if (amt * 100 >= totalCents && amt !== totalSoles) {
        suggestions.push(amt);
      }
      if (suggestions.length >= 3) break;
    }
    return suggestions;
  }, [totalCents, totalSoles]);

  // Can continue if: not cash, OR has exact amount, OR entered enough cash
  const canContinue =
    selectedMethod !== 'cash' ||
    hasExactAmount ||
    cashAmountCents >= totalCents;

  const handleSelectExact = () => {
    setHasExactAmount(true);
    setCashAmount('');
  };

  const handleSelectSuggestion = (amt: number) => {
    setHasExactAmount(false);
    setCashAmount(amt.toString());
  };

  const handleCashInputChange = (value: string) => {
    setHasExactAmount(false);
    setCashAmount(value);
  };

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
          {formatPrice(totalCents)}
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
                onClick={() => {
                  onSelect(method);
                  if (method !== 'cash') {
                    setCashAmount('');
                    setHasExactAmount(false);
                  }
                }}
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
                    ✓
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

      {/* Cash amount section (only for cash) */}
      <AnimatePresence>
        {selectedMethod === 'cash' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ¿Con cuánto pagas?
              </p>

              {/* EXACT AMOUNT button — first and prominent */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSelectExact}
                className={`
                  w-full py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200
                  ${hasExactAmount
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-green-300 dark:hover:border-green-700'
                  }
                `}
              >
                <span className="flex items-center justify-center gap-2">
                  {hasExactAmount ? '✅' : '💰'}
                  {hasExactAmount
                    ? `Pagaré con el monto exacto: ${formatPrice(totalCents)}`
                    : 'Tengo el monto exacto (no necesito vuelto)'
                  }
                </span>
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-amber-200 dark:bg-amber-800/50" />
                <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">
                  o selecciona un billete
                </span>
                <div className="flex-1 h-px bg-amber-200 dark:bg-amber-800/50" />
              </div>

              {/* Quick bill suggestions */}
              <div className="flex gap-2">
                {cashSuggestions.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleSelectSuggestion(amt)}
                    className={`
                      flex-1 py-2 rounded-lg text-sm font-medium transition-all
                      ${!hasExactAmount && parseFloat(cashAmount) === amt
                        ? 'bg-[#FF6B35] text-white shadow-sm'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                      }
                    `}
                  >
                    S/{amt}
                  </button>
                ))}
              </div>

              {/* Manual input */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                  S/
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.10"
                  min="0"
                  value={hasExactAmount ? '' : cashAmount}
                  onChange={(e) => handleCashInputChange(e.target.value)}
                  onFocus={() => setHasExactAmount(false)}
                  placeholder="Otro monto..."
                  className={`
                    w-full pl-10 pr-4 py-2.5 rounded-lg border-2 text-base font-bold tabular-nums
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                    placeholder-gray-300 dark:placeholder-gray-600
                    focus:outline-none focus:ring-0
                    transition-colors duration-200
                    ${cashInsufficient
                      ? 'border-red-400 dark:border-red-500'
                      : !hasExactAmount && cashAmountCents >= totalCents
                        ? 'border-green-400 dark:border-green-500'
                        : 'border-gray-200 dark:border-gray-700 focus:border-[#FF6B35]'
                    }
                  `}
                />
              </div>

              {/* Change display */}
              <AnimatePresence mode="wait">
                {!hasExactAmount && cashAmountCents > 0 && !cashInsufficient && changeCents > 0 && (
                  <motion.div
                    key="change"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 text-center"
                  >
                    <span className="text-sm text-green-700 dark:text-green-400">
                      Tu vuelto: <span className="font-bold">{formatPrice(changeCents)}</span>
                    </span>
                  </motion.div>
                )}

                {cashInsufficient && (
                  <motion.p
                    key="insufficient"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-red-500 dark:text-red-400"
                  >
                    El monto debe ser al menos {formatPrice(totalCents)}
                  </motion.p>
                )}
              </AnimatePresence>
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
          whileTap={canContinue ? { scale: 0.97 } : undefined}
          onClick={() => canContinue && onNext()}
          disabled={!canContinue}
          className={`
            flex-1 py-3 rounded-xl font-semibold text-white transition-all duration-200
            ${canContinue
              ? 'bg-[#FF6B35] hover:bg-[#E55A25] active:bg-[#D04A15] shadow-md'
              : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
            }
          `}
        >
          Revisar pedido
        </motion.button>
      </div>
    </motion.div>
  );
}
