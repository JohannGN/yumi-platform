'use client';

// ============================================================
// OrderCardPanel — Tarjeta de pedido para el panel restaurante
// SEGURIDAD: NO muestra datos del cliente (nombre, teléfono,
//            dirección, delivery fee, total, descuentos)
// Solo muestra: código, items, subtotal (valor comida), pago, rider
// ============================================================

import { motion } from 'framer-motion';
import { formatCurrency, orderStatusLabels} from '@/config/tokens';
import { colors } from '@/config/tokens';

// Tipo para los items dentro del JSONB del pedido
interface OrderItem {
  item_id: string;
  variant_id?: string | null;
  name: string;
  variant_name?: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  weight_kg?: number | null;
  modifiers?: Array<{
    group_name: string;
    selections: Array<{
      name: string;
      price_cents: number;
    }>;
  }>;
}

// Tipo de pedido sanitizado (sin datos sensibles del cliente)
export interface SanitizedOrder {
  id: string;
  code: string;
  restaurant_id: string;
  rider_id?: string | null;
  rider_name?: string | null;
  items: OrderItem[];
  subtotal_cents: number;
  status: string;
  rejection_reason?: string | null;
  rejection_notes?: string | null;
  payment_method: string;
  payment_status: string;
  source: string;
  created_at: string;
  confirmed_at?: string | null;
  restaurant_confirmed_at?: string | null;
  ready_at?: string | null;
  assigned_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  estimated_prep_time_minutes?: number | null;
  customer_rating?: number | null;
  customer_comment?: string | null;
  updated_at: string;
}

interface OrderCardPanelProps {
  order: SanitizedOrder;
  onAccept?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
  onMarkReady?: (orderId: string) => void;
  onViewDetail?: (order: SanitizedOrder) => void;
}

function formatOrderCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }
  return code;
}

function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export default function OrderCardPanel({
  order,
  onAccept,
  onReject,
  onMarkReady,
  onViewDetail,
}: OrderCardPanelProps) {
  const items = (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) as OrderItem[];
  const statusColor = colors.orderStatus[order.status as keyof typeof colors.orderStatus] || '#9CA3AF';
  const statusLabel = orderStatusLabels[order.status] || order.status;

  // Determinar si mostrar botones de acción
  const showAcceptReject = order.status === 'pending_confirmation';
  const showMarkReady = order.status === 'confirmed' || order.status === 'preparing';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onViewDetail?.(order)}
    >
      {/* Header: Código + Estado + Tiempo */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold font-mono tracking-wider text-gray-900 dark:text-gray-100">
            {formatOrderCode(order.code)}
          </span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${statusColor}20`,
              color: statusColor,
            }}
          >
            {statusLabel}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getTimeSince(order.created_at)}
        </span>
      </div>

      {/* Items resumidos */}
      <div className="px-4 py-3 space-y-1.5">
        {items.slice(0, 4).map((item, idx) => (
          <div key={idx} className="text-sm">
            <div className="flex items-start gap-1">
              <span className="font-medium text-gray-900 dark:text-gray-100 shrink-0">
                {item.quantity}x
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-800 dark:text-gray-200">
                  {item.name}
                </span>
                {item.variant_name && (
                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                    ({item.variant_name})
                  </span>
                )}
                {/* Modifiers */}
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 pl-1">
                    {item.modifiers.map((group, gIdx) => (
                      <span key={gIdx}>
                        {group.selections.map(s => s.name).join(', ')}
                        {gIdx < item.modifiers!.length - 1 && ' · '}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {items.length > 4 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            +{items.length - 4} item{items.length - 4 > 1 ? 's' : ''} más
          </span>
        )}
      </div>

      {/* Footer: Subtotal + Pago + Rider */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 space-y-2">
        {/* Subtotal (valor comida) y método de pago */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Total comida: {formatCurrency(order.subtotal_cents)}
          </span>
        </div>

        {/* Rider asignado (si existe) */}
        {order.rider_name && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span>🏍️</span>
            <span>Rider: {order.rider_name}</span>
          </div>
        )}

        {/* Botones de acción */}
        {showAcceptReject && (
          <div className="flex gap-2 pt-1">
        <button
              onClick={(e) => { e.stopPropagation(); onAccept?.(order.id); }}
              className="flex-[2] py-2 text-sm font-semibold rounded-lg text-white bg-green-500 hover:bg-green-600 active:bg-green-700 transition-colors"
            >
              Aceptar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReject?.(order.id); }}
              className="flex-[1] py-2 text-sm font-semibold rounded-lg text-white bg-red-500 hover:bg-red-600 active:bg-red-700 transition-colors"
            >
              Rechazar
            </button>
          </div>
        )}

        {showMarkReady && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkReady?.(order.id); }}
            className="w-full py-2 text-sm font-semibold rounded-lg text-white bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 transition-colors"
          >
            Marcar listo ✓
          </button>
        )}
      </div>
    </motion.div>
  );
}
