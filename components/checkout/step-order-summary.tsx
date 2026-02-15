'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatPrice, roundUpCents } from '@/lib/utils/rounding';
import { paymentMethodLabels, colors, business } from '@/config/tokens';
import { useCartStore, generateCartItemKey } from '@/stores/cart-store';
import type { CustomerInfo, DeliveryAddress, DeliveryFeeResponse, PaymentMethod } from '@/types/checkout';

// Format order code with hyphen: P3V6H2 → P3V-6H2
function formatOrderCode(code: string): string {
  if (code.length === 6) return `${code.slice(0, 3)}-${code.slice(3)}`;
  return code;
}

// Save order to local history so user can return to tracking
function saveOrderToHistory(order: {
  code: string;
  restaurantName: string;
  totalCents: number;
  createdAt: string;
}) {
  if (typeof window === 'undefined') return;
  try {
    const KEY = 'yumi_order_history';
    const existing = JSON.parse(localStorage.getItem(KEY) || '[]');
    const updated = [order, ...existing.filter((o: { code: string }) => o.code !== order.code)].slice(0, 10);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // Silent fail — not critical
  }
}

// Full cleanup of cart-related localStorage
function cleanupCartLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('yumi_cart');
    localStorage.removeItem('yumi_last_activity');
  } catch {
    // Silent fail
  }
}

interface StepOrderSummaryProps {
  customerInfo: CustomerInfo;
  deliveryAddress: DeliveryAddress;
  deliveryFee: DeliveryFeeResponse;
  paymentMethod: PaymentMethod;
  cashAmountCents?: number;
  restaurantId: string;           // ✅ FIX: added — needed by API
  restaurantName: string;
  restaurantSlug: string;
  citySlug: string;
  onBack: () => void;
}

export function StepOrderSummary({
  customerInfo,
  deliveryAddress,
  deliveryFee,
  paymentMethod,
  cashAmountCents,
  restaurantId,
  restaurantName,
  restaurantSlug,
  citySlug,
  onBack,
}: StepOrderSummaryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { items, clearCart } = useCartStore();

  // ✅ FIX: CartItem uses snake_case (line_total_cents)
  const subtotalCents = useMemo(() => {
    return items.reduce((sum, item) => sum + item.line_total_cents, 0);
  }, [items]);

  const deliveryFeeCents = roundUpCents(deliveryFee.fee_cents);
  const totalCents = roundUpCents(subtotalCents + deliveryFeeCents);

  const changeCents = useMemo(() => {
    if (paymentMethod !== 'cash' || !cashAmountCents) return 0;
    return Math.max(0, cashAmountCents - totalCents);
  }, [paymentMethod, cashAmountCents, totalCents]);

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // ✅ FIX: CartItem fields are snake_case — map directly
      const orderItems = items.map((item) => ({
        menu_item_id: item.menu_item_id,
        name: item.name,
        variant_id: item.variant_id || null,
        variant_name: item.variant_name || null,
        base_price_cents: item.base_price_cents,
        quantity: item.quantity,
        modifiers: item.modifiers.map((mod) => ({
          group_name: mod.group_name,
          selections: mod.selections.map((sel) => ({
            name: sel.name,
            price_cents: sel.price_cents,
          })),
        })),
        unit_total_cents: item.unit_total_cents,
        line_total_cents: item.line_total_cents,
      }));

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // ✅ FIX: send restaurant_id (not just slug)
          restaurant_id: restaurantId,
          customer_name: customerInfo.name,
          customer_phone: `+51${customerInfo.phone.replace(/\D/g, '').replace(/^51/, '')}`,
          delivery_address: deliveryAddress.address,
          delivery_lat: deliveryAddress.lat,
          delivery_lng: deliveryAddress.lng,
          delivery_instructions: deliveryAddress.reference || null,
          delivery_zone_id: deliveryFee.zone_id,
          items: orderItems,
          subtotal_cents: subtotalCents,
          delivery_fee_cents: deliveryFeeCents,
          total_cents: totalCents,
          payment_method: paymentMethod,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear el pedido');
      }

      const { code, confirmation_token } = await response.json();

      const formattedCode = formatOrderCode(code);

      saveOrderToHistory({
        code,
        restaurantName,
        totalCents,
        createdAt: new Date().toISOString(),
      });

      const message = `CONFIRMAR ${formattedCode}`;
      const waUrl = `https://wa.me/${business.yumiWhatsApp.replace('+', '')}?text=${encodeURIComponent(message)}`;

      clearCart();
      cleanupCartLocalStorage();

      window.open(waUrl, '_blank');
      window.location.href = `/confirmar/${confirmation_token}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Restaurant info */}
      <div className="flex items-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-lg">🏪</span>
        <h3 className="font-semibold text-gray-900 dark:text-white">{restaurantName}</h3>
      </div>

      {/* Order items with modifiers */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Tu pedido
        </p>
        {items.map((item) => (
          <div key={generateCartItemKey(item)} className="py-2 space-y-1">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  🍽️ {item.name}
                  {item.variant_name && (
                    <span className="text-gray-500 dark:text-gray-400"> — {item.variant_name}</span>
                  )}
                </p>
                {item.modifiers.length > 0 && (
                  <div className="mt-0.5">
                    {item.modifiers.map((mod, idx) => {
                      const selectionNames = mod.selections.map((s) => {
                        if (s.price_cents > 0) return `${s.name} (+${formatPrice(s.price_cents)})`;
                        return s.name;
                      });
                      return (
                        <p key={idx} className="text-xs text-gray-500 dark:text-gray-400">
                          {mod.group_name}: {selectionNames.join(', ')}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatPrice(item.line_total_cents)}
                </p>
                {item.quantity > 1 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                    x{item.quantity} · {formatPrice(item.unit_total_cents)} c/u
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
          <span className="tabular-nums text-gray-700 dark:text-gray-300">{formatPrice(subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Delivery {deliveryFee.zone_name && `(${deliveryFee.zone_name})`}
          </span>
          <span className="tabular-nums text-gray-700 dark:text-gray-300">{formatPrice(deliveryFeeCents)}</span>
        </div>
        <div className="flex justify-between text-base font-bold pt-2 border-t border-dashed border-gray-300 dark:border-gray-600">
          <span className="text-gray-900 dark:text-white">Total</span>
          <span className="tabular-nums" style={{ color: colors.brand.primary }}>
            {formatPrice(totalCents)}
          </span>
        </div>
      </div>

      {/* Payment info */}
      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Método de pago</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {paymentMethodLabels[paymentMethod]}
          </span>
        </div>
        {paymentMethod === 'cash' && cashAmountCents && cashAmountCents > 0 && (
          <>
            {cashAmountCents === totalCents ? (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Pago</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  Monto exacto ✓
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Pagas con</span>
                  <span className="tabular-nums text-gray-700 dark:text-gray-300">
                    {formatPrice(cashAmountCents)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Tu vuelto</span>
                  <span className="tabular-nums font-medium text-green-600 dark:text-green-400">
                    {formatPrice(changeCents)}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Delivery info */}
      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Cliente</span>
          <span className="font-medium text-gray-900 dark:text-white">{customerInfo.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Teléfono</span>
          <span className="tabular-nums text-gray-700 dark:text-gray-300">{customerInfo.phone}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Dirección</span>
          <span className="text-gray-700 dark:text-gray-300 text-xs">
            📍 {deliveryAddress.address}
          </span>
          {deliveryAddress.reference && (
            <span className="text-gray-500 dark:text-gray-400 text-xs block">
              Ref: {deliveryAddress.reference}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
        >
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Atrás
        </button>
        <motion.button
          whileTap={!isSubmitting ? { scale: 0.97 } : undefined}
          onClick={handleConfirmOrder}
          disabled={isSubmitting}
          className="flex-[2] py-3.5 rounded-xl font-bold text-white shadow-lg transition-all duration-200 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 disabled:shadow-none"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creando pedido...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              📱 Confirmar por WhatsApp
            </span>
          )}
        </motion.button>
      </div>

      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
        Al confirmar, se abrirá WhatsApp para validar tu pedido
      </p>
    </motion.div>
  );
}
