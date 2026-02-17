'use client';

import { useRouter } from 'next/navigation';
import { useRider } from './rider-context';
import { WhatsAppStatusRider } from './whatsapp-status-rider';
import { formatCurrency, colors } from '@/config/tokens';
import { motion } from 'framer-motion';
import type { RiderStats } from '@/types/rider-panel';
import { useEffect, useState } from 'react';

export function WaitingState() {
  const router = useRouter();
  const { rider } = useRider();
  const [stats, setStats] = useState<RiderStats | null>(null);

  const isOnShift = rider?.is_online ?? false;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/rider/stats');
        if (res.ok) setStats(await res.json());
      } catch { /* silent */ }
    };
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      {/* Hero */}
      <div className="flex flex-col items-center text-center py-6">
        <motion.div
          animate={isOnShift ? { y: [0, -8, 0] } : {}}
          transition={isOnShift ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
          className="relative"
        >
          <span className="text-6xl">
            {isOnShift ? '🏍️' : '😴'}
          </span>
          {isOnShift && (
            <motion.div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full bg-gray-200 dark:bg-gray-700"
              animate={{ scaleX: [1, 0.7, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </motion.div>

        {isOnShift ? (
          <>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mt-4">
              Esperando pedidos...
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Te notificaremos cuando haya un pedido
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mt-4">
              Fuera de turno
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Inicia tu turno para recibir pedidos
            </p>
            <button
              onClick={() => router.push('/rider/perfil')}
              className="mt-4 px-6 py-3 rounded-xl text-sm font-bold text-white active:scale-[0.97] transition-transform shadow-lg shadow-green-500/20"
              style={{ backgroundColor: colors.semantic.success }}
            >
              ▶️ Ir a iniciar turno
            </button>
          </>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 text-center"
        >
          <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
            {stats?.deliveries_today ?? 0}
          </p>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
            Entregas hoy
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 text-center"
        >
          <div className="flex items-center justify-center gap-1">
            <span className="text-lg">⭐</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
              {stats?.avg_rating ? stats.avg_rating.toFixed(1) : '—'}
            </span>
          </div>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
            Calificación
          </p>
        </motion.div>
      </div>

      {/* Earnings (conditional) */}
      {rider?.show_earnings && stats?.earnings_today_cents !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-100 dark:border-orange-900/40 p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              Ganancias hoy
            </p>
            <p className="text-lg font-black text-orange-700 dark:text-orange-300 tabular-nums">
              {formatCurrency(stats.earnings_today_cents)}
            </p>
          </div>
        </motion.div>
      )}

      {/* WhatsApp status */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <WhatsAppStatusRider lastMessageAt={rider?.whatsapp_last_message_at ?? null} />
      </motion.div>
    </div>
  );
}
