'use client';

import { useState } from 'react';
import { useRider } from './rider-context';
import { motion, AnimatePresence } from 'framer-motion';
import { colors } from '@/config/tokens';

export function RiderHeader() {
  const { rider, refetchRider } = useRider();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleOnline = async () => {
    if (!rider) return;
    if (isToggling) return;

    // Block going offline with active order
    if (rider.is_online && rider.current_order_id) {
      alert('Completa tu entrega antes de desconectarte');
      return;
    }

    setIsToggling(true);
    try {
      const res = await fetch('/api/rider/toggle-online', { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error al cambiar estado');
        return;
      }
      await refetchRider();
    } catch {
      alert('Error de conexión');
    } finally {
      setIsToggling(false);
    }
  };

  const isOnline = rider?.is_online ?? false;
  const hasActiveOrder = !!rider?.current_order_id;

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: YUMI logo + rider name */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <span className="text-lg font-black tracking-tight" style={{ color: colors.brand.primary }}>
              YUMI
            </span>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Rider
            </span>
          </div>
          {rider && (
            <div className="flex items-center gap-1.5 ml-1">
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                {rider.name.split(' ')[0]}
              </span>
            </div>
          )}
        </div>

        {/* Right: Online/Offline toggle */}
        <button
          onClick={handleToggleOnline}
          disabled={isToggling}
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 active:scale-95"
          style={{
            backgroundColor: isOnline
              ? hasActiveOrder
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(34, 197, 94, 0.1)'
              : 'rgba(107, 114, 128, 0.1)',
          }}
        >
          {/* Animated dot */}
          <div className="relative">
            <motion.div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: isOnline
                  ? hasActiveOrder
                    ? colors.semantic.warning
                    : colors.semantic.success
                  : '#9CA3AF',
              }}
              animate={isOnline ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {isOnline && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: hasActiveOrder
                    ? colors.semantic.warning
                    : colors.semantic.success,
                }}
                animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.span
              key={isOnline ? (hasActiveOrder ? 'busy' : 'online') : 'offline'}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="text-xs font-bold uppercase tracking-wide"
              style={{
                color: isOnline
                  ? hasActiveOrder
                    ? colors.semantic.warning
                    : colors.semantic.success
                  : '#9CA3AF',
              }}
            >
              {isOnline
                ? hasActiveOrder
                  ? 'En entrega'
                  : 'En línea'
                : 'Desconectado'}
            </motion.span>
          </AnimatePresence>

          {isToggling && (
            <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          )}
        </button>
      </div>
    </header>
  );
}
