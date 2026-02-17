'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, colors } from '@/config/tokens';

interface CashCalculatorProps {
  totalCents: number;
  onExactAmount: () => void;
  onContinue: () => void;
}

export function CashCalculator({ totalCents, onExactAmount, onContinue }: CashCalculatorProps) {
  const [inputValue, setInputValue] = useState('');
  const totalSoles = totalCents / 100;

  const paidAmount = parseFloat(inputValue) || 0;
  const changeCents = Math.round((paidAmount - totalSoles) * 100);
  const isInsufficient = inputValue.length > 0 && paidAmount < totalSoles;
  const isValid = paidAmount >= totalSoles;

  // Quick amount buttons
  const quickAmounts = getQuickAmounts(totalSoles);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 p-4"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide">
          Cobro en efectivo
        </h2>
      </div>

      {/* Total */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-700 p-5 text-center">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Total a cobrar
        </p>
        <p className="text-3xl font-black text-white tabular-nums mt-1">
          {formatCurrency(totalCents)}
        </p>
      </div>

      {/* Exact amount shortcut */}
      <button
        onClick={onExactAmount}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-bold text-sm active:scale-[0.98] transition-transform"
      >
        <span>💰</span>
        Monto exacto
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
          o calcular vuelto
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Input */}
      <div>
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
          Cliente paga con:
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
            S/
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="0.00"
            autoFocus
            className={`w-full pl-10 pr-4 py-3.5 rounded-xl border-2 text-right text-lg font-bold tabular-nums bg-white dark:bg-gray-800 outline-none transition-colors ${
              isInsufficient
                ? 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-orange-400 dark:focus:border-orange-500'
            }`}
          />
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2 mt-2">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              onClick={() => setInputValue(amt.toFixed(2))}
              className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-400 active:scale-95 transition-transform"
            >
              S/ {amt}
            </button>
          ))}
        </div>
      </div>

      {/* Change result */}
      <AnimatePresence mode="wait">
        {isInsufficient ? (
          <motion.div
            key="insufficient"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 p-4 text-center"
          >
            <p className="text-sm font-bold text-red-600 dark:text-red-400">
              El monto es insuficiente
            </p>
            <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">
              Faltan {formatCurrency(Math.abs(changeCents))}
            </p>
          </motion.div>
        ) : isValid ? (
          <motion.div
            key="change"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50 p-4 text-center"
          >
            <p className="text-xs font-semibold text-green-600 dark:text-green-500 uppercase tracking-wider">
              Vuelto
            </p>
            <p className="text-2xl font-black text-green-700 dark:text-green-400 tabular-nums mt-0.5">
              💵 {formatCurrency(changeCents)}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Continue */}
      <button
        onClick={onContinue}
        disabled={!isValid && inputValue.length > 0}
        className="w-full py-4 rounded-2xl text-base font-bold text-white shadow-lg disabled:opacity-40 active:scale-[0.97] transition-all"
        style={{ backgroundColor: colors.brand.primary }}
      >
        Continuar →
      </button>
    </motion.div>
  );
}

// Get sensible quick amount buttons based on total
function getQuickAmounts(total: number): number[] {
  if (total <= 10) return [10, 20, 50];
  if (total <= 20) return [20, 50, 100];
  if (total <= 50) return [50, 100, 200];
  if (total <= 100) return [100, 200, 500];
  return [200, 500, 1000];
}
