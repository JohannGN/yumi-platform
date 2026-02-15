'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { MenuItem } from '@/types/database';
import { formatPrice, getRestaurantTheme } from '@/lib/utils/restaurant';

interface MenuItemCardProps {
  item: MenuItem;
  onClick: () => void;
  isMobile: boolean;
  themeColor: string;
  isRestaurantOpen: boolean;
}

const TAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  popular: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', label: '🔥 Popular' },
  nuevo: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', label: '✨ Nuevo' },
  oferta: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', label: '💰 Oferta' },
};

export function MenuItemCard({ item, onClick, isMobile, themeColor, isRestaurantOpen }: MenuItemCardProps) {
  const theme = getRestaurantTheme(themeColor);
  const isAvailable = item.is_available && (item.stock_quantity === null || item.stock_quantity > 0);
  const [showClosedMsg, setShowClosedMsg] = useState(false);

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRestaurantOpen) {
      setShowClosedMsg(true);
      setTimeout(() => setShowClosedMsg(false), 2500);
      return;
    }
    onClick();
  };

  return (
    <div className="relative">
      <motion.div
        whileTap={isMobile ? { scale: 0.98 } : undefined}
        className={`flex w-full gap-3 border-b border-gray-100 py-3.5 dark:border-gray-800 ${
          isAvailable ? '' : 'opacity-50'
        }`}
      >
        {/* Image LEFT */}
        <button
          onClick={onClick}
          disabled={!isAvailable}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
        >
          {item.image_url ? (
            <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-2xl opacity-30">🍽️</span>
            </div>
          )}
          {!isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-[10px] font-bold text-white">Agotado</span>
            </div>
          )}
        </button>

        {/* Info CENTER */}
        <button
          onClick={onClick}
          disabled={!isAvailable}
          className="min-w-0 flex-1 text-left"
        >
          {item.tags && item.tags.length > 0 && (
            <div className="mb-1 flex flex-wrap gap-1">
              {item.tags.map((tag) => {
                const style = TAG_STYLES[tag];
                if (!style) return null;
                return (
                  <span
                    key={tag}
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}
                  >
                    {style.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Título — máximo 2 líneas con ... */}
          <h4 className="line-clamp-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
            {item.name}
          </h4>

          {/* Descripción — máximo 2 líneas con ... */}
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
              {item.description}
            </p>
          )}

          <p
            className="mt-1.5 text-sm font-bold"
            style={{ color: isAvailable ? theme.primary : undefined }}
          >
            {formatPrice(item.base_price_cents)}
          </p>
          {item.variants && item.variants.length > 0 && isAvailable && (
            <span className="mt-0.5 inline-block text-[10px] text-gray-400">
              {item.variants.length} variante{item.variants.length > 1 ? 's' : ''}
            </span>
          )}
        </button>

        {/* Plus button RIGHT */}
        {isAvailable && isMobile && (
          <div className="flex shrink-0 items-center">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handlePlusClick}
              className="flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-colors"
              style={{
                backgroundColor: isRestaurantOpen ? theme.primary : '#9CA3AF',
                color: '#fff',
              }}
            >
              <Plus className="h-4 w-4" />
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Closed restaurant toast */}
      <AnimatePresence>
        {showClosedMsg && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute right-0 top-1 z-10 rounded-xl bg-gray-800 px-3 py-2 shadow-lg dark:bg-gray-700"
          >
            <p className="text-xs font-medium text-white">
              🕐 Restaurante cerrado
            </p>
            <p className="text-[10px] text-gray-300">
              ¡Abrirán pronto!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}