'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRider } from './rider-context';
import { WhatsAppStatusRider } from './whatsapp-status-rider';
import { formatCurrency } from '@/config/tokens';
import type { RiderStats } from '@/types/rider-panel';

export function WaitingState() {
  const { rider } = useRider();
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/rider/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (!rider) return null;

  const isOnline = rider.is_online;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Status hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6"
      >
        {/* Subtle gradient background */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            background: isOnline
              ? 'radial-gradient(circle at 50% 30%, #22C55E 0%, transparent 70%)'
              : 'radial-gradient(circle at 50% 30%, #9CA3AF 0%, transparent 70%)',
          }}
        />

        <div className="relative flex flex-col items-center text-center gap-3">
          {/* Animated icon */}
          <div className="relative">
            <motion.div
              className="text-5xl"
              animate={isOnline ? { y: [0, -4, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {isOnline ? '🏍️' : '😴'}
            </motion.div>
            {isOnline && (
              <motion.div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-gray-200 dark:bg-gray-700"
                animate={{ scaleX: [0.8, 1, 0.8], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isOnline ? 'Esperando pedidos...' : 'Estás desconectado'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isOnline
                ? 'Te notificaremos cuando tengas un pedido'
                : 'Conéctate para recibir pedidos'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4"
        >
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 w-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                {stats?.deliveries_today ?? 0}
              </p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                Entregas hoy
              </p>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4"
        >
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 w-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                  {stats?.avg_rating ? stats.avg_rating.toFixed(1) : '—'}
                </p>
                {stats?.avg_rating ? (
                  <span className="text-sm">⭐</span>
                ) : null}
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                Rating{stats?.total_ratings ? ` (${stats.total_ratings})` : ''}
              </p>
            </>
          )}
        </motion.div>

        {/* Earnings card - only if show_earnings */}
        {rider.show_earnings && stats?.earnings_today_cents !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-2 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-100 dark:border-orange-900/40 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                  Ganancia hoy
                </p>
                <p className="text-xl font-black text-orange-700 dark:text-orange-300 tabular-nums mt-0.5">
                  {formatCurrency(stats.earnings_today_cents)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Esta semana
                </p>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                  {formatCurrency(stats.earnings_week_cents ?? 0)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* WhatsApp status */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <WhatsAppStatusRider lastMessageAt={rider.whatsapp_last_message_at} />
      </motion.div>
    </div>
  );
}
