'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { colors } from '@/config/tokens';

type ConfirmationState = 'loading' | 'confirmed' | 'already_confirmed' | 'expired' | 'error';

interface ConfirmPageClientProps {
  token: string;
}

// ─── Animated Check SVG ────────────────────────────────────
// Circle draws itself → check draws itself → pulse ring loops
function AnimatedCheck() {
  return (
    <div className="relative inline-flex items-center justify-center w-24 h-24">
      {/* Pulsing rings (infinite loop) */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-green-400 dark:border-green-500"
        initial={{ scale: 1, opacity: 0 }}
        animate={{ scale: [1, 1.6, 1.6], opacity: [0, 0.4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1 }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-green-400 dark:border-green-500"
        initial={{ scale: 1, opacity: 0 }}
        animate={{ scale: [1, 1.4, 1.4], opacity: [0, 0.25, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1.4 }}
      />

      {/* Main circle + check */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.1 }}
        className="relative w-24 h-24"
      >
        <svg viewBox="0 0 96 96" className="w-24 h-24">
          {/* Green filled circle with draw animation */}
          <motion.circle
            cx="48"
            cy="48"
            r="44"
            fill="none"
            stroke="#22C55E"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.2 }}
          />
          {/* Fill that fades in */}
          <motion.circle
            cx="48"
            cy="48"
            r="42"
            fill="#22C55E"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.7 }}
          />
          {/* Checkmark that draws itself */}
          <motion.path
            d="M28 50 L42 64 L68 36"
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.9 }}
          />
        </svg>
      </motion.div>

      {/* Subtle glow */}
      <motion.div
        className="absolute inset-[-8px] rounded-full bg-green-400/20 dark:bg-green-500/10 blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0.3] }}
        transition={{ duration: 1.5, delay: 0.8 }}
      />
    </div>
  );
}

// ─── Loading spinner (package/delivery themed) ─────────────
function LoadingAnimation() {
  return (
    <div className="relative inline-flex items-center justify-center w-20 h-20">
      {/* Spinning ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-[3px] border-gray-200 dark:border-gray-700"
      />
      <motion.div
        className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#FF6B35] border-r-[#FF6B35]"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {/* Center icon */}
      <motion.span
        className="text-3xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        📦
      </motion.span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────

export function ConfirmPageClient({ token }: ConfirmPageClientProps) {
  const [state, setState] = useState<ConfirmationState>('loading');
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const confirmOrder = useCallback(async () => {
    try {
      const response = await fetch('/api/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setOrderCode(data.order_code);
        setState(data.already_confirmed ? 'already_confirmed' : 'confirmed');
      } else if (response.status === 410) {
        setState('expired');
      } else {
        setErrorMsg(data.error || 'Error al confirmar');
        setState('error');
      }
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.');
      setState('error');
    }
  }, [token]);

  useEffect(() => {
    confirmOrder();
  }, [confirmOrder]);

  const formattedCode = orderCode
    ? `${orderCode.slice(0, 3)}-${orderCode.slice(3)}`
    : '';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Loading */}
        {state === 'loading' && (
          <div className="text-center py-12 space-y-4">
            <LoadingAnimation />
            <motion.p
              className="text-gray-600 dark:text-gray-400 text-lg font-medium"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Confirmando tu pedido...
            </motion.p>
          </div>
        )}

        {/* Confirmed */}
        {(state === 'confirmed' || state === 'already_confirmed') && (
          <div className="text-center space-y-5">
            <AnimatedCheck />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.4 }}
            >
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                ¡Pedido enviado!
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {state === 'already_confirmed'
                  ? 'Tu pedido ya fue confirmado anteriormente'
                  : 'Tu pedido fue enviado al restaurante'}
              </p>
            </motion.div>

            {orderCode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4, duration: 0.4 }}
                className="py-3 px-6 rounded-xl bg-gray-100 dark:bg-gray-800 inline-block"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Código de pedido</p>
                <p className="text-2xl font-bold tracking-widest text-gray-900 dark:text-white tabular-nums">
                  {formattedCode}
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.4 }}
              className="space-y-3 pt-2"
            >
              {orderCode && (
                <Link
                  href={`/pedido/${orderCode}`}
                  className="block w-full py-3.5 rounded-xl font-semibold text-white text-center shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                  style={{ backgroundColor: colors.brand.primary }}
                >
                  📍 Seguir mi pedido
                </Link>
              )}
              <Link
                href="/"
                className="block w-full py-3 rounded-xl font-medium text-gray-700 dark:text-gray-300 text-center border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Volver al inicio
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.5 }}
              className="text-xs text-gray-400 dark:text-gray-500 pt-2"
            >
              Te notificaremos por WhatsApp cuando el restaurante confirme tu pedido
            </motion.p>
          </div>
        )}

        {/* Expired */}
        {state === 'expired' && (
          <div className="text-center space-y-5">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30"
            >
              <span className="text-4xl">⏰</span>
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Link expirado
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Este enlace de confirmación ya no es válido. Los links expiran a los 15 minutos.
              </p>
            </div>
            <Link
              href="/"
              className="block w-full py-3 rounded-xl font-semibold text-white text-center shadow-md transition-all"
              style={{ backgroundColor: colors.brand.primary }}
            >
              Volver a pedir
            </Link>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="text-center space-y-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30"
            >
              <span className="text-4xl">❌</span>
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Error
              </h1>
              <p className="text-gray-500 dark:text-gray-400">{errorMsg}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setState('loading');
                  confirmOrder();
                }}
                className="block w-full py-3 rounded-xl font-semibold text-white text-center shadow-md transition-all"
                style={{ backgroundColor: colors.brand.primary }}
              >
                Intentar de nuevo
              </button>
              <Link
                href="/"
                className="block w-full py-3 rounded-xl font-medium text-gray-700 dark:text-gray-300 text-center border-2 border-gray-200 dark:border-gray-700"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
