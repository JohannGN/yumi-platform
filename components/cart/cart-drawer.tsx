'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, ShoppingCart, Pencil } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useCartStore, generateCartItemKey } from '@/stores/cart-store';
import type { CartItem } from '@/stores/cart-store';
import { formatCurrency } from '@/config/tokens';

// ============================================================
// MODIFIER DISPLAY HELPERS
// ============================================================

function formatItemModifiers(item: CartItem): {
  freeText: string | null;
  paidLines: { name: string; price_cents: number }[];
} {
  const paidLines: { name: string; price_cents: number }[] = [];
  const freeByGroup: string[] = [];

  for (const group of item.modifiers) {
    const free = group.selections.filter((s) => s.price_cents === 0);
    if (free.length > 0) {
      freeByGroup.push(`${group.group_name}: ${free.map((s) => s.name).join(', ')}`);
    }
    for (const sel of group.selections) {
      if (sel.price_cents > 0) {
        paidLines.push({ name: sel.name, price_cents: sel.price_cents });
      }
    }
  }

  return {
    freeText: freeByGroup.length > 0 ? freeByGroup.join(' · ') : null,
    paidLines,
  };
}

// ============================================================
// CONFIRM CLEAR DIALOG
// ============================================================

function ConfirmClearBanner({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800"
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <Trash2 className="w-5 h-5 text-red-500" />
        <p className="text-sm text-red-700 dark:text-red-400 font-medium">
          ¿Vaciar todo el carrito?
        </p>
      </div>
      <div className="flex gap-2 justify-center">
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
        >
          No, mantener
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-1.5 text-xs font-medium rounded-lg bg-red-500 text-white"
        >
          Sí, vaciar
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================
// CART ITEM ROW
// ============================================================

function CartItemRow({
  item,
  themeColor,
  onEdit,
}: {
  item: CartItem;
  themeColor: string;
  onEdit: () => void;
}) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const itemKey = generateCartItemKey(item);
  const { freeText, paidLines } = useMemo(() => formatItemModifiers(item), [item]);
  const hasOptions = item.modifiers.length > 0 || !!item.variant_name;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="flex gap-3 py-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {item.name}
          </p>
          {hasOptions && (
            <button
              onClick={onEdit}
              className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Editar opciones"
            >
              <Pencil className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>

        {item.variant_name && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {item.variant_name}
          </p>
        )}

        {freeText && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">
            {freeText}
          </p>
        )}

        {paidLines.map((line, i) => (
          <p key={i} className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            + {line.name}{'  '}
            <span className="font-medium">+{formatCurrency(line.price_cents)}</span>
          </p>
        ))}

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => updateQuantity(itemKey, item.quantity - 1)}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600"
          >
            {item.quantity === 1 ? (
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
          </button>

          <motion.span
            key={item.quantity}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-sm font-bold w-5 text-center tabular-nums"
          >
            {item.quantity}
          </motion.span>

          <button
            onClick={() => updateQuantity(itemKey, item.quantity + 1)}
            disabled={item.quantity >= 50}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600 disabled:opacity-30"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold" style={{ color: themeColor }}>
          {formatCurrency(item.line_total_cents)}
        </p>
        {item.quantity > 1 && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            c/u {formatCurrency(item.unit_total_cents)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// CART DRAWER
// ============================================================

export function CartDrawer({ themeColor }: { themeColor: string }) {
  const {
    items,
    isOpen,
    restaurantName,
    setDrawerOpen,
    getSubtotalCents,
    getItemCount,
    clearCart,
  } = useCartStore();

  const removeItem = useCartStore((s) => s.removeItem);
  const setEditingItemId = useCartStore((s) => s.setEditingItemId);

  const router = useRouter();
  const citySlug = useCartStore((s) => s.citySlug);
  const restaurantSlug = useCartStore((s) => s.restaurantSlug);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const subtotal = getSubtotalCents();
  const itemCount = getItemCount();

  const handleEdit = (item: CartItem) => {
    const itemKey = generateCartItemKey(item);
    removeItem(itemKey);
    setDrawerOpen(false);
    setEditingItemId(item.menu_item_id);
  };

  const handleConfirmClear = () => {
    clearCart();
    setShowConfirmClear(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      setDrawerOpen(open);
      if (!open) setShowConfirmClear(false);
    }}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-0 max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        <SheetTitle className="sr-only">Tu pedido</SheetTitle>

        {/* Header — single row */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {/* Animated cart icon */}
            <div className="w-8 h-8 relative overflow-hidden flex-shrink-0">
              <motion.div
                animate={{
                  x: [0, 40, -20, 0],
                  opacity: [1, 0, 0, 1],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: 'easeInOut',
                  times: [0, 0.4, 0.5, 1],
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <ShoppingCart className="w-5 h-5 text-gray-900 dark:text-gray-100" />
              </motion.div>
              {/* Wind trail */}
              <motion.div
                animate={{
                  x: [-4, 30],
                  opacity: [0, 0.6, 0],
                  scaleX: [0.5, 1.5],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  repeatDelay: 4.7,
                  delay: 0.1,
                  ease: 'easeOut',
                }}
                className="absolute top-1/2 -translate-y-1/2 left-0"
              >
                <div className="flex gap-[2px]">
                  <div className="w-3 h-[1.5px] rounded-full bg-gray-300 dark:bg-gray-500" />
                  <div className="w-2 h-[1.5px] rounded-full bg-gray-200 dark:bg-gray-600" />
                  <div className="w-1 h-[1.5px] rounded-full bg-gray-100 dark:bg-gray-700" />
                </div>
              </motion.div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Tu pedido
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {restaurantName} · {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
              </p>
            </div>
          </div>

          {/* Minimize button — top right */}
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
            title="Minimizar"
          >
            <div className="w-3.5 h-0.5 rounded-full bg-gray-500 dark:bg-gray-400" />
          </button>
        </div>

        {/* Confirm clear banner */}
        <AnimatePresence>
          {showConfirmClear && (
            <ConfirmClearBanner
              onConfirm={handleConfirmClear}
              onCancel={() => setShowConfirmClear(false)}
            />
          )}
        </AnimatePresence>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 divide-y divide-gray-100 dark:divide-gray-800">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <CartItemRow
                key={generateCartItemKey(item)}
                item={item}
                themeColor={themeColor}
                onEdit={() => handleEdit(item)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-4 pb-4 pt-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(subtotal)}
              </span>
            </div>

            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mb-3">
              Delivery se calcula al confirmar tu dirección
            </p>

<motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                useCartStore.getState().setIsGoingToCheckout(true);
                setDrawerOpen(false);
                router.push(`/${citySlug}/${restaurantSlug}/checkout`);
              }}
              className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-white font-semibold text-base"
              style={{ backgroundColor: themeColor }}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Ir a pagar — {formatCurrency(subtotal)}</span>
            </motion.button>

            <button
              onClick={() => setShowConfirmClear(true)}
              className="w-full mt-2 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors text-center py-1"
            >
              Vaciar carrito
            </button>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
            <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Tu carrito está vacío
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Agrega platos del menú para empezar
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}