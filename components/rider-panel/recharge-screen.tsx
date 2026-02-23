'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, formatCurrency, formatRechargeCode } from '@/config/tokens';
import { isValidRechargeCode, normalizeRechargeCode } from '@/types/credit-types';
import { RechargeSuccess } from './recharge-success';

// Valid charset for visual feedback
const VALID_CHARS = new Set('ABCDEFGHJKMNPQRTVWXYZ23456789'.split(''));

export function RechargeScreen() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [rechargeResult, setRechargeResult] = useState<{
    amount_cents: number;
    new_balance_cents: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback((value: string) => {
    // Uppercase, remove spaces, max 8 chars
    const raw = value.replace(/\s/g, '').toUpperCase().slice(0, 8);
    // Filter invalid characters
    const filtered = raw.split('').filter((c) => VALID_CHARS.has(c)).join('');
    setCode(filtered);
    setErrorMsg('');
    setStatus('idle');
  }, []);

  const handleRedeem = useCallback(async () => {
    const normalized = normalizeRechargeCode(code);

    if (!isValidRechargeCode(normalized)) {
      setErrorMsg('Código debe ser 8 caracteres alfanuméricos');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/rider/credits/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalized }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Error al canjear código');
        setStatus('error');
        return;
      }

      setRechargeResult({
        amount_cents: data.amount_cents,
        new_balance_cents: data.new_balance_cents,
      });
      setStatus('success');
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.');
      setStatus('error');
    }
  }, [code]);

  // Success screen
  if (status === 'success' && rechargeResult) {
    return (
      <RechargeSuccess
        amountCents={rechargeResult.amount_cents}
        newBalanceCents={rechargeResult.new_balance_cents}
      />
    );
  }

  // Display code formatted: "XXXX XXXX"
  const displayCode = code.length > 4 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
  const isReady = code.length === 8;

  return (
    <div className="flex flex-col gap-6 p-4 pt-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mx-auto mb-3"
        >
          <span className="text-3xl">🎫</span>
        </motion.div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">
          Recargar créditos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ingresa el código de 8 caracteres
        </p>
      </div>

      {/* Code input */}
      <div className="space-y-3">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX XXXX"
            value={displayCode}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isReady) handleRedeem();
            }}
            className={`w-full text-center text-2xl font-mono font-black tracking-[0.25em] py-4 px-4 rounded-2xl border-2 bg-white dark:bg-gray-800 outline-none transition-colors ${
              status === 'error'
                ? 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400'
                : isReady
                  ? 'border-green-300 dark:border-green-700 text-gray-900 dark:text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-orange-400 dark:focus:border-orange-500'
            }`}
          />

          {/* Character count */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className={`text-xs font-bold tabular-nums ${
              isReady ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'
            }`}>
              {code.length}/8
            </span>
          </div>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {status === 'error' && errorMsg ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs font-semibold text-red-500 dark:text-red-400 text-center"
            >
              {errorMsg}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Redeem button */}
      <button
        onClick={handleRedeem}
        disabled={!isReady || status === 'loading'}
        className="w-full py-4 rounded-2xl text-base font-bold text-white shadow-lg shadow-orange-500/20 disabled:opacity-40 disabled:shadow-none active:scale-[0.97] transition-all"
        style={{ backgroundColor: colors.brand.primary }}
      >
        {status === 'loading' ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Canjeando...
          </div>
        ) : (
          'Canjear código'
        )}
      </button>

      {/* Help text */}
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <span className="font-semibold text-gray-700 dark:text-gray-300">¿No tienes código?</span>{' '}
          Contacta a tu agente o supervisor para solicitar una recarga de créditos.
          El código se usa una sola vez.
        </p>
      </div>
    </div>
  );
}
