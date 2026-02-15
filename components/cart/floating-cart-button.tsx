'use client';

import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { formatPrice } from '@/lib/utils/restaurant';
import { colors } from '@/config/tokens';

interface FloatingCartButtonProps {
  count: number;
}

export function FloatingCartButton({ count }: FloatingCartButtonProps) {
const getSubtotalCents = useCartStore((s) => s.getSubtotalCents);
  const setDrawerOpen = useCartStore((s) => s.setDrawerOpen);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 260 }}
      className="fixed bottom-6 left-4 right-4 z-30 md:hidden"
    >
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setDrawerOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-white shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.primaryDark})`,
        }}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <motion.span
              key={count}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="absolute -right-2.5 -top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold animate-[heartbeat_1.5s_ease-in-out_infinite]"
              style={{ color: colors.brand.primary }}
            >
              {count}
            </motion.span>
          </div>
          <span className="text-sm font-semibold">Ver carrito</span>
        </div>
        <span className="text-sm font-bold">{formatPrice(getSubtotalCents())}</span>
      </motion.button>
    </motion.div>
  );
}