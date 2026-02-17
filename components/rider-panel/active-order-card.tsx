'use client';

import { motion } from 'framer-motion';
import { formatCurrency, formatPhone, formatOrderCode } from '@/config/tokens';
import { colors, paymentMethodLabels } from '@/config/tokens';
import type { RiderCurrentOrder, RiderOrderItem } from '@/types/rider-panel';

interface ActiveOrderCardProps {
  order: RiderCurrentOrder;
  onNavigateRestaurant: () => void;
  onNavigateClient: () => void;
}

export function ActiveOrderCard({
  order,
  onNavigateRestaurant,
  onNavigateClient,
}: ActiveOrderCardProps) {
  const statusConfig = getStatusConfig(order.status);
  const paymentLabel = paymentMethodLabels[order.payment_method] || order.payment_method;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 p-4"
    >
      {/* Status badge + order code */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
            style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.textColor,
            }}
          >
            {statusConfig.icon} {statusConfig.label}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {order.source === 'whatsapp' ? '💬 WhatsApp' : '🌐 Web'}
          </span>
        </div>
        <span className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300">
          {formatOrderCode(order.code)}
        </span>
      </div>

      {/* Items section */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-50 dark:border-gray-700/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Pedido
          </h3>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {(order.items as RiderOrderItem[]).map((item, idx) => (
            <div key={idx} className="px-4 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-bold text-orange-500 tabular-nums">
                      {item.quantity}x
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {item.name}
                    </span>
                  </div>
                  {item.variant_name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-5">
                      {item.variant_name}
                    </p>
                  )}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="mt-1 ml-5 space-y-0.5">
                      {item.modifiers.map((mod, mIdx) => (
                        <p key={mIdx} className="text-[11px] text-gray-400 dark:text-gray-500">
                          <span className="text-gray-500 dark:text-gray-400">
                            {mod.group_name}:
                          </span>{' '}
                          {mod.selections.map((s) => s.name).join(', ')}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 tabular-nums flex-shrink-0">
                  {formatCurrency(item.line_total_cents)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Comida</span>
            <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">
              {formatCurrency(order.subtotal_cents)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Delivery</span>
            <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">
              {formatCurrency(order.delivery_fee_cents)}
            </span>
          </div>
          {order.rider_bonus_cents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Bonus distancia</span>
              <span className="font-medium text-green-600 dark:text-green-400 tabular-nums">
                +{formatCurrency(order.rider_bonus_cents)}
              </span>
            </div>
          )}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                Total a cobrar
              </span>
              <span className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
                {formatCurrency(order.total_cents)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <span className="text-sm">{getPaymentIcon(order.payment_method)}</span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Pago: {paymentLabel}
          </span>
        </div>
      </div>

      {/* Restaurant section */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-base">
            🏪
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {order.restaurant_name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {order.restaurant_address}
            </p>
          </div>
        </div>

        {order.restaurant_phone && (
          <a
            href={`tel:${order.restaurant_phone}`}
            className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-3"
          >
            <span>📞</span>
            <span className="underline">{formatPhone(order.restaurant_phone)}</span>
          </a>
        )}

        <button
          onClick={onNavigateRestaurant}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
          style={{
            backgroundColor: `${colors.brand.primary}10`,
            color: colors.brand.primary,
          }}
        >
          <span>🗺️</span>
          Ir al restaurante
        </button>
      </div>

      {/* Client section */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-base">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {order.customer_name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {order.delivery_address}
            </p>
          </div>
        </div>

        {/* Phone + call button */}
        <div className="flex items-center gap-2 mb-3">
          <a
            href={`tel:${order.customer_phone}`}
            className="flex items-center gap-2 flex-1 py-2 px-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-semibold active:scale-[0.98] transition-transform"
          >
            <span>📞</span>
            Llamar ({formatPhone(order.customer_phone)})
          </a>
          <a
            href={`https://wa.me/${order.customer_phone.replace('+', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/30 text-lg active:scale-[0.98] transition-transform"
          >
            💬
          </a>
        </div>

        {/* Delivery instructions */}
        {order.delivery_instructions && (
          <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 mb-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <span className="font-bold">📝 Nota:</span>{' '}
              {order.delivery_instructions}
            </p>
          </div>
        )}

        <button
          onClick={onNavigateClient}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
          style={{
            backgroundColor: `${colors.semantic.info}10`,
            color: colors.semantic.info,
          }}
        >
          <span>🗺️</span>
          Ir al cliente
        </button>
      </div>
    </motion.div>
  );
}

// === Helpers ===

function getStatusConfig(status: string) {
  switch (status) {
    case 'assigned_rider':
      return {
        label: 'Ir a recoger',
        icon: '📦',
        bgColor: 'rgba(139, 92, 246, 0.1)',
        textColor: '#7C3AED',
      };
    case 'picked_up':
      return {
        label: 'Recogido',
        icon: '✅',
        bgColor: 'rgba(236, 72, 153, 0.1)',
        textColor: '#DB2777',
      };
    case 'in_transit':
      return {
        label: 'En camino',
        icon: '🏍️',
        bgColor: 'rgba(249, 115, 22, 0.1)',
        textColor: '#EA580C',
      };
    default:
      return {
        label: status,
        icon: '📋',
        bgColor: 'rgba(107, 114, 128, 0.1)',
        textColor: '#6B7280',
      };
  }
}

function getPaymentIcon(method: string): string {
  switch (method) {
    case 'cash': return '💵';
    case 'pos': return '💳';
    case 'yape':
    case 'plin': return '📱';
    default: return '💰';
  }
}
