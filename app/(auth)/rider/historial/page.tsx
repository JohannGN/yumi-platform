'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRider } from '@/components/rider-panel/rider-context';
import { DeliveryHistoryList } from '@/components/rider-panel/delivery-history-list';
import { OrderDetailRider } from '@/components/rider-panel/order-detail-rider';
import { formatCurrency, colors } from '@/config/tokens';
import { motion, AnimatePresence } from 'framer-motion';
import type { RiderHistoryOrder, HistoryPeriod } from '@/types/rider-panel';

const periodTabs: { key: HistoryPeriod; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

export default function RiderHistoryPage() {
  const { rider } = useRider();
  const [period, setPeriod] = useState<HistoryPeriod>('today');
  const [allOrders, setAllOrders] = useState<RiderHistoryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Fetch month data once (includes today + week)
  const fetchAllHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/rider/history?period=month');
      if (res.ok) {
        const data = await res.json();
        setAllOrders(data);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllHistory();
  }, [fetchAllHistory]);

  // Filter client-side by period
  const filteredOrders = useMemo(() => {
    if (allOrders.length === 0) return [];

    const now = new Date();
    // Lima timezone offset (UTC-5)
    const limaOffset = -5 * 60;
    const limaTime = new Date(now.getTime() + (now.getTimezoneOffset() + limaOffset) * 60000);

    const todayStart = new Date(limaTime);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(limaTime);
    const day = weekStart.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = start of week
    weekStart.setDate(weekStart.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    // Convert back to UTC for comparison
    const toUTC = (d: Date) => new Date(d.getTime() - (now.getTimezoneOffset() + limaOffset) * 60000);

    const todayUTC = toUTC(todayStart);
    const weekUTC = toUTC(weekStart);

    switch (period) {
      case 'today':
        return allOrders.filter(o => new Date(o.delivered_at) >= todayUTC);
      case 'week':
        return allOrders.filter(o => new Date(o.delivered_at) >= weekUTC);
      case 'month':
      default:
        return allOrders;
    }
  }, [allOrders, period]);

  const totalCobrado = filteredOrders.reduce((sum, o) => sum + o.total_cents, 0);
  const totalEarnings = filteredOrders.reduce((sum, o) => sum + (o.earnings_cents ?? 0), 0);

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
      <AnimatePresence mode="wait">
        {!isLoading && filteredOrders.length > 0 && (
          <motion.div
            key={`summary-${period}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Entregas
                </p>
                <motion.p
                  key={`count-${filteredOrders.length}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl font-black text-gray-900 dark:text-white tabular-nums"
                >
                  {filteredOrders.length}
                </motion.p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Total cobrado
                </p>
                <motion.p
                  key={`total-${totalCobrado}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-lg font-bold text-gray-900 dark:text-white tabular-nums"
                >
                  {formatCurrency(totalCobrado)}
                </motion.p>
              </div>
            </div>

            {rider?.show_earnings && totalEarnings > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Tu ganancia
                  </p>
                  <motion.p
                    key={`earn-${totalEarnings}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-sm font-bold tabular-nums"
                    style={{ color: colors.semantic.success }}
                  >
                    {formatCurrency(totalEarnings)}
                  </motion.p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* List with transition */}
      {isLoading ? (
        <HistorySkeleton />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`list-${period}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <DeliveryHistoryList
              orders={filteredOrders}
              showEarnings={rider?.show_earnings ?? false}
              onSelectOrder={(id) => setSelectedOrderId(id)}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Detail sheet */}
      {selectedOrderId && (
        <OrderDetailRider
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
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
