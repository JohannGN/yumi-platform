'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatRechargeCode, formatCurrency } from '@/config/design-tokens';
import type { RechargeCode } from '@/types/credit-types';
import { Check, Copy, MessageCircle, RefreshCw } from 'lucide-react';

interface RechargeCodeResultProps {
  code: RechargeCode;
  riderName: string | null;
  riderPhone: string | null;
  onReset: () => void;
}

export function RechargeCodeResult({
  code,
  riderName,
  riderPhone,
  onReset,
}: RechargeCodeResultProps) {
  const [copied, setCopied] = useState(false);

  const formattedCode = formatRechargeCode(code.code);
  const amountText = formatCurrency(code.amount_cents);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }

  function handleWhatsApp() {
    const msg = encodeURIComponent(
      `Tu código de recarga YUMI: ${code.code} por ${amountText}. Ingresalo en tu panel de rider.`
    );
    const url = riderPhone
      ? `https://wa.me/${riderPhone.replace('+', '')}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
    >
      {/* Success header */}
      <div className="text-center mb-5">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Código generado
        </h3>
      </div>

      {/* Code display */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center mb-4">
        <p className="text-2xl font-mono font-bold tracking-widest text-gray-900 dark:text-white">
          {formattedCode}
        </p>
        <p className="text-lg font-semibold text-orange-600 dark:text-orange-400 mt-1">
          {amountText}
        </p>
      </div>

      {/* Rider info */}
      <div className="text-center mb-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {riderName ? (
            <>
              Destinado a: <span className="font-medium text-gray-900 dark:text-white">{riderName}</span>
            </>
          ) : (
            'Código genérico — cualquier rider puede canjearlo'
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              ¡Copiado!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copiar código
            </>
          )}
        </button>

        <button
          onClick={handleWhatsApp}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Enviar por WhatsApp
        </button>

        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Generar otro código
        </button>
      </div>
    </motion.div>
  );
}
