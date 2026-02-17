'use client';

import { motion } from 'framer-motion';
import { colors, paymentMethodLabels, formatCurrency, formatOrderCode } from '@/config/tokens';
import type { PaymentMethodType } from '@/types/rider-panel';

interface PaymentConfirmProps {
  orderCode: string;
  totalCents: number;
  originalMethod: PaymentMethodType;
  selectedMethod: PaymentMethodType;
  onSelectMethod: (method: PaymentMethodType) => void;
  onConfirm: () => void;
}

const methods: { key: PaymentMethodType; icon: string; label: string; sublabel?: string }[] = [
  { key: 'cash', icon: '💵', label: 'Efectivo' },
  { key: 'pos', icon: '💳', label: 'POS / Tarjeta' },
  { key: 'plin', icon: '📱', label: 'QR Digital', sublabel: 'Yape / Plin' },
];

export function PaymentConfirm({
  orderCode,
  totalCents,
  originalMethod,
  selectedMethod,
  onSelectMethod,
  onConfirm,
}: PaymentConfirmProps) {
  const originalLabel = paymentMethodLabels[originalMethod] || originalMethod;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 p-4"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide">
          Cobrar pedido
        </h2>
        <p className="text-sm font-mono font-bold text-gray-500 dark:text-gray-400 mt-0.5">
          {formatOrderCode(orderCode)}
        </p>
      </div>

      {/* Total to charge */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-700 p-5 text-center">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Total a cobrar
        </p>
        <p className="text-3xl font-black text-white tabular-nums mt-1">
          {formatCurrency(totalCents)}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          El cliente eligió: <span className="font-semibold text-gray-300">{originalLabel}</span>
        </p>
      </div>

      {/* Method selector */}
      <div>
        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
          ¿Cómo pagó el cliente?
        </p>
        <div className="flex flex-col gap-2">
          {methods.map((method) => {
            const isSelected = selectedMethod === method.key;
            const isOriginal = originalMethod === method.key || (originalMethod === 'yape' && method.key === 'plin');

            return (
              <button
                key={method.key}
                onClick={() => onSelectMethod(method.key)}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <span className="text-xl">{method.icon}</span>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-bold ${
                    isSelected ? 'text-orange-700 dark:text-orange-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {method.label}
                  </p>
                  {method.sublabel && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      {method.sublabel}
                    </p>
                  )}
                </div>

                {/* Original method badge */}
                {isOriginal && (
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    Original
                  </span>
                )}

                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="payment-check"
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        className="w-full py-4 rounded-2xl text-base font-bold text-white shadow-lg shadow-orange-500/20 active:scale-[0.97] transition-transform"
        style={{ backgroundColor: colors.brand.primary }}
      >
        Confirmar cobro →
      </button>
    </motion.div>
  );
}
