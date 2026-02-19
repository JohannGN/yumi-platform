'use client';

import { useRider } from './rider-context';
import { colors } from '@/config/tokens';
import { motion } from 'framer-motion';

export function RiderHeader() {
  const { rider } = useRider();

  const isOnShift = rider?.is_online ?? false;
  const firstName = rider?.name?.split(' ')[0] || 'Rider';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo + name */}
        <div className="flex items-center gap-2.5">
          {rider?.avatar_url ? (
  <img
    src={rider.avatar_url}
    alt={rider.name}
    className="w-8 h-8 rounded-lg object-cover"
  />
) : (
  <div
    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
    style={{ backgroundColor: colors.brand.primary }}
  >
    {rider?.name?.[0]?.toUpperCase() ?? 'R'}
  </div>
)}
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              YUMI <span className="text-gray-400 font-medium">Rider</span>
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
              {firstName}
            </p>
          </div>
        </div>

        {/* Status indicator (read-only) */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: isOnShift ? colors.riderStatus.available : colors.riderStatus.offline,
              }}
            />
            {isOnShift && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: colors.riderStatus.available }}
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </div>
          <span className={`text-xs font-semibold ${
            isOnShift
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}>
            {isOnShift ? 'En turno' : 'Fuera de turno'}
          </span>
        </div>
      </div>
    </header>
  );
}
