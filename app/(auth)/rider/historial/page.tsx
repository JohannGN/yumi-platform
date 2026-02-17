'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRider } from '@/components/rider-panel/rider-context';
import { DeliveryHistoryList } from '@/components/rider-panel/delivery-history-list';
import { formatCurrency, colors } from '@/config/tokens';
import { motion } from 'framer-motion';
import type { RiderHistoryOrder, HistoryPeriod } from '@/types/rider-panel';

const periodTabs: { key: HistoryPeriod; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

export default function RiderHistoryPage() {
  const { rider } = useRider();
  const [period, setPeriod] = useState<HistoryPeriod>('today');
  const [orders, setOrders] = useState<RiderHistoryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async (p: HistoryPeriod) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/rider/history?period=${p}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(period);
  }, [period, fetchHistory]);

  const totalCobrado = orders.reduce((sum, o) => sum + o.total_cents, 0);
  const totalEarnings = orders.reduce((sum, o) => sum + (o.earnings_cents ?? 0), 0);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">
          Historial
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Tus entregas completadas
        </p>
      </div>

      {/* Period tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
        {periodTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className="relative flex-1 py-2 rounded-lg text-xs font-bold transition-colors"
          >
            {period === tab.key && (
              <motion.div
                layoutId="history-tab"
                className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 ${
                period === tab.key
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Summary card */}
      {!isLoading && orders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Entregas
              </p>
              <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                {orders.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Total cobrado
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                {formatCurrency(totalCobrado)}
              </p>
            </div>
          </div>

          {rider?.show_earnings && totalEarnings > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Tu ganancia
                </p>
                <p className="text-sm font-bold tabular-nums" style={{ color: colors.semantic.success }}>
                  {formatCurrency(totalEarnings)}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* List */}
      {isLoading ? (
        <HistorySkeleton />
      ) : (
        <DeliveryHistoryList
          orders={orders}
          showEarnings={rider?.show_earnings ?? false}
        />
      )}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3.5"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="w-32 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              <div className="w-24 h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              <div className="w-16 h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="w-16 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
