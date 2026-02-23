'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { formatCurrency, colors } from '@/config/tokens';

interface RechargeSuccessProps {
  amountCents: number;
  newBalanceCents: number;
}

export function RechargeSuccess({ amountCents, newBalanceCents }: RechargeSuccessProps) {
  const router = useRouter();

  // Auto-redirect after 5s
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/rider');
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center relative"
    >
      {/* Animated check */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{ backgroundColor: `${colors.semantic.success}15` }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.semantic.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-black text-gray-900 dark:text-white"
      >
        ¡Recarga exitosa!
      </motion.h1>

      {/* Amount */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 px-6 py-3 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/40"
      >
        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
          Recargaste
        </p>
        <p className="text-3xl font-black text-green-700 dark:text-green-300 tabular-nums mt-0.5">
          +{formatCurrency(amountCents)}
        </p>
      </motion.div>

      {/* New balance */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nuevo saldo
        </p>
        <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
          {formatCurrency(newBalanceCents)}
        </p>
      </motion.div>

      {/* Confetti particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: [
                colors.semantic.success,
                colors.brand.accent,
                colors.brand.primary,
                '#8B5CF6',
              ][i % 4],
              left: `${10 + Math.random() * 80}%`,
              top: '-10px',
            }}
            initial={{ y: -10, opacity: 1, rotate: 0 }}
            animate={{
              y: typeof window !== 'undefined' ? window.innerHeight + 20 : 800,
              opacity: 0,
              rotate: Math.random() * 720 - 360,
              x: Math.random() * 160 - 80,
            }}
            transition={{
              duration: 1.5 + Math.random() * 1.5,
              delay: 0.2 + Math.random() * 0.5,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => router.push('/rider')}
        className="mt-8 px-8 py-3.5 rounded-2xl font-bold text-sm text-white active:scale-[0.97] transition-transform"
        style={{ backgroundColor: colors.brand.primary }}
      >
        Volver al inicio
      </motion.button>

      {/* Auto redirect hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-3 text-[11px] text-gray-400 dark:text-gray-500"
      >
        Redirigiendo en 5 segundos...
      </motion.p>
    </motion.div>
  );
}
