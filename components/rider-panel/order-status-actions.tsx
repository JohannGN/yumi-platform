'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRider } from './rider-context';
import { colors } from '@/config/tokens';
import type { RiderCurrentOrder } from '@/types/rider-panel';

interface OrderStatusActionsProps {
  order: RiderCurrentOrder;
  onStartDeliveryFlow: () => void;
}

export function OrderStatusActions({ order, onStartDeliveryFlow }: OrderStatusActionsProps) {
  const { refetchOrder, refetchRider } = useRider();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (newStatus: 'picked_up' | 'in_transit') => {
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch('/api/rider/current-order/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al actualizar estado');
        return;
      }

      await refetchOrder();
      await refetchRider();
    } catch {
      setError('Error de conexión');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="sticky bottom-20 z-40 px-4 pb-4">
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mb-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50"
          >
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action button based on current status */}
      {order.status === 'assigned_rider' && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => updateStatus('picked_up')}
          disabled={isUpdating}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white shadow-lg shadow-purple-500/25 disabled:opacity-60 transition-all"
          style={{ backgroundColor: '#8B5CF6' }}
        >
          {isUpdating ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-lg">📦</span>
              Recogí el pedido
            </>
          )}
        </motion.button>
      )}

      {order.status === 'picked_up' && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => updateStatus('in_transit')}
          disabled={isUpdating}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white shadow-lg shadow-orange-500/25 disabled:opacity-60 transition-all"
          style={{ backgroundColor: colors.brand.primary }}
        >
          {isUpdating ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-lg">🏍️</span>
              En camino al cliente
            </>
          )}
        </motion.button>
      )}

      {order.status === 'in_transit' && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStartDeliveryFlow}
          disabled={isUpdating}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white shadow-lg shadow-green-500/25 disabled:opacity-60 transition-all"
          style={{ backgroundColor: colors.semantic.success }}
        >
          <span className="text-lg">🏁</span>
          Entregar pedido
        </motion.button>
      )}
    </div>
  );
}
