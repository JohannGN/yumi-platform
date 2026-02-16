'use client';

// ============================================================
// Order Card — Kanban card showing order details
// Chat 5 — Fragment 3/7
// ============================================================

import { motion } from 'framer-motion';
import { formatPrice } from '@/lib/utils/rounding';
import { paymentMethodLabels } from '@/config/tokens';
import type { PanelOrder, OrderItem } from '@/types/restaurant-panel';

interface OrderCardPanelProps {
  order: PanelOrder;
  onAccept?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
  onPreparing?: (orderId: string) => void;
  onReady?: (orderId: string) => void;
  onViewDetail?: (order: PanelOrder) => void;
  isActioning?: boolean;
}

export function OrderCardPanel({
  order,
  onAccept,
  onReject,
  onPreparing,
  onReady,
  onViewDetail,
  isActioning,
}: OrderCardPanelProps) {
  const codeFormatted = `${order.code.slice(0, 3)}-${order.code.slice(3)}`;
  const payLabel = paymentMethodLabels[order.payment_method] || order.payment_method;
  const timeAgo = getTimeAgo(order.created_at);
  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];

  const payIcons: Record<string, string> = {
    cash: '💵',
    pos: '💳',
    yape: '📱',
    plin: '📱',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div
        className="px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => onViewDetail?.(order)}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">
            {codeFormatted}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            {timeAgo}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {order.customer_name}
          </span>
          <span className="text-[10px] text-gray-400">·</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {payIcons[order.payment_method] || ''} {payLabel}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="px-3.5 py-2.5 space-y-2 max-h-[200px] overflow-y-auto">
        {items.map((item, idx) => (
          <OrderItemRow key={idx} item={item} />
        ))}
      </div>

      {/* Footer: total + delivery address */}
      <div className="px-3.5 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[60%]">
            📍 {order.delivery_address}
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
            {formatPrice(order.total_cents)}
          </span>
        </div>
        {order.delivery_instructions && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 truncate">
            📝 {order.delivery_instructions}
          </p>
        )}
      </div>

      {/* Actions */}
      <OrderActions
        status={order.status}
        orderId={order.id}
        onAccept={onAccept}
        onReject={onReject}
        onPreparing={onPreparing}
        onReady={onReady}
        isActioning={isActioning}
      />
    </motion.div>
  );
}

// ─── Order Item Row (with modifiers) ────────────────────────

function OrderItemRow({ item }: { item: OrderItem }) {
  const paidModifiers = item.modifiers
    ?.flatMap((m) => m.selections)
    .filter((s) => s.price_cents > 0) || [];

  return (
    <div className="text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900 dark:text-white">
            {item.quantity}x {item.name}
          </span>
          {item.variant_name && (
            <span className="text-gray-500 dark:text-gray-400">
              {' '}({item.variant_name})
            </span>
          )}
        </div>
        <span className="text-gray-600 dark:text-gray-400 tabular-nums whitespace-nowrap">
          {formatPrice(item.line_total_cents)}
        </span>
      </div>

      {/* Modifiers */}
      {item.modifiers && item.modifiers.length > 0 && (
        <div className="ml-4 mt-0.5 space-y-0.5">
          {item.modifiers.map((mod, i) => (
            <div key={i} className="text-gray-500 dark:text-gray-400">
              <span className="text-gray-400 dark:text-gray-500">+ </span>
              {mod.selections.map((s) => s.name).join(', ')}
              {mod.selections.some((s) => s.price_cents > 0) && (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  (+{formatPrice(
                    mod.selections.reduce((sum, s) => sum + s.price_cents, 0)
                  )})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Action Buttons ─────────────────────────────────────────

function OrderActions({
  status,
  orderId,
  onAccept,
  onReject,
  onPreparing,
  onReady,
  isActioning,
}: {
  status: string;
  orderId: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onPreparing?: (id: string) => void;
  onReady?: (id: string) => void;
  isActioning?: boolean;
}) {
  if (status === 'ready') return null; // No actions for ready orders

  return (
    <div className="px-3.5 py-2.5 border-t border-gray-100 dark:border-gray-800 flex gap-2">
      {status === 'pending_confirmation' && (
        <>
          <button
            onClick={() => onAccept?.(orderId)}
            disabled={isActioning}
            className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            ✅ Aceptar
          </button>
          <button
            onClick={() => onReject?.(orderId)}
            disabled={isActioning}
            className="py-2 px-3 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </>
      )}

      {status === 'confirmed' && (
        <button
          onClick={() => onPreparing?.(orderId)}
          disabled={isActioning}
          className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          🍳 Preparando
        </button>
      )}

      {status === 'preparing' && (
        <button
          onClick={() => onReady?.(orderId)}
          disabled={isActioning}
          className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          🎉 ¡Listo!
        </button>
      )}
    </div>
  );
}

// ─── Helper ─────────────────────────────────────────────────

function getTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
