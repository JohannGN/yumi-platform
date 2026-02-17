'use client';

// ============================================================
// OrderDetailSheet — Detalle de pedido para panel restaurante
// SEGURIDAD: NO muestra datos del cliente
// Solo: código, items detallados con modifiers, subtotal, pago, rider, timeline
// ============================================================

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  formatCurrency,
  formatDate,
  orderStatusLabels,
  rejectionReasonLabels,
} from '@/config/tokens';
import { colors } from '@/config/tokens';
import type { SanitizedOrder } from './order-card-panel';

interface OrderItem {
  item_id: string;
  variant_id?: string | null;
  name: string;
  variant_name?: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents?: number;
  total_cents?: number;
  weight_kg?: number | null;
  modifiers?: Array<{
    group_name: string;
    selections: Array<{
      name: string;
      price_cents: number;
    }>;
  }>;
}

interface OrderDetailSheetProps {
  order: SanitizedOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
  onMarkReady?: (orderId: string) => void;
  onMarkPreparing?: (orderId: string) => void;
}

function formatOrderCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }
  return code;
}

export default function OrderDetailSheet({
  order,
  isOpen,
  onClose,
  onAccept,
  onReject,
  onMarkReady,
  onMarkPreparing,
}: OrderDetailSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !order) return null;

  const items = (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) as OrderItem[];
  const statusColor = colors.orderStatus[order.status as keyof typeof colors.orderStatus] || '#9CA3AF';
  const statusLabel = orderStatusLabels[order.status] || order.status;

  // Timeline events
  const timeline: Array<{ label: string; time: string | null; status: string }> = [
    { label: 'Pedido creado', time: order.created_at, status: 'created' },
    { label: 'Cliente confirmó', time: order.confirmed_at || null, status: 'confirmed_client' },
    { label: 'Restaurante aceptó', time: order.restaurant_confirmed_at || null, status: 'confirmed' },
    { label: 'Listo para recoger', time: order.ready_at || null, status: 'ready' },
    { label: 'Rider recogió', time: order.picked_up_at || null, status: 'picked_up' },
    { label: 'Entregado', time: order.delivered_at || null, status: 'delivered' },
  ];

if (order.status === 'rejected') {
    timeline.push({ label: 'Rechazado por restaurante', time: order.updated_at, status: 'rejected' });
  }
  if (order.cancelled_at) {
    timeline.push({ label: 'Cancelado', time: order.cancelled_at, status: 'cancelled' });
  }

  const showAcceptReject = order.status === 'pending_confirmation';
  const showPreparing = order.status === 'confirmed';
  const showMarkReady = order.status === 'confirmed' || order.status === 'preparing';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 z-50 overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold font-mono tracking-wider text-gray-900 dark:text-gray-100">
                      {formatOrderCode(order.code)}
                    </h2>
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
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(order.created_at)}
                </span>
              </div>
            </div>

            <div className="px-4 py-4 space-y-6">
              {/* Items detallados */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Detalle del pedido
                </h3>
                <div className="space-y-3">
                  {items.map((item, idx) => {
                    return (
                      <div
                        key={idx}
                        className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-orange-500 shrink-0">
                                {item.quantity}x
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {item.name}
                              </span>
                            </div>
                            {item.variant_name && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-7">
                                Variante: {item.variant_name}
                              </span>
                            )}
                            {/* Modifier groups */}
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="mt-1.5 ml-7 space-y-1">
                                {item.modifiers.map((group, gIdx) => (
                                  <div key={gIdx}>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                      {group.group_name}:
                                    </span>
                                    {group.selections.map((sel, sIdx) => (
                                      <span key={sIdx} className="text-xs text-gray-600 dark:text-gray-300 ml-1">
                                        {sel.name}
                                        {sel.price_cents > 0 && (
                                          <span className="text-gray-400"> (+{formatCurrency(sel.price_cents)})</span>
                                        )}
                                        {sIdx < group.selections.length - 1 && ','}
                                      </span>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums shrink-0 ml-2">
                            {formatCurrency(item.line_total_cents || item.total_cents || (item.unit_price_cents * item.quantity))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Resumen económico (solo lo que el restaurante puede ver) */}
              <section className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                    Total comida
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {formatCurrency(order.subtotal_cents)}
                  </span>
                </div>
              </section>

              {/* Rider asignado */}
              {order.rider_name && (
                <section className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Rider asignado
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏍️</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {order.rider_name}
                    </span>
                  </div>
                </section>
              )}

              {/* Rechazo (si aplica) */}
              {order.status === 'rejected' && (
                <section className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-2">
                    Motivo de rechazo
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {order.rejection_reason ? rejectionReasonLabels[order.rejection_reason] || order.rejection_reason : 'Sin motivo'}
                  </p>
                  {order.rejection_notes && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {order.rejection_notes}
                    </p>
                  )}
                </section>
              )}

              {/* Rating del cliente (si existe) */}
              {order.customer_rating && (
                <section className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Calificación del cliente
                  </h3>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`text-lg ${i < order.customer_rating! ? 'text-yellow-400' : 'text-gray-300'}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  {order.customer_comment && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                      &ldquo;{order.customer_comment}&rdquo;
                    </p>
                  )}
                </section>
              )}

              {/* Timeline */}
              <section className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Historial
                </h3>
                <div className="space-y-3">
                  {timeline.filter(t => t.time).map((event, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      event.status === 'rejected' || event.status === 'cancelled' ? 'bg-red-500' : 'bg-green-500'
                    }`} />
                      <div className="flex-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {event.label}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                          {formatDate(event.time!)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Action buttons (sticky bottom) */}
            {(showAcceptReject || showPreparing || showMarkReady) && (
              <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-4 space-y-2">
                {showAcceptReject && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => onAccept?.(order.id)}
                      className="flex-1 py-3 text-sm font-bold rounded-xl text-white bg-green-500 hover:bg-green-600 active:bg-green-700 transition-colors"
                    >
                      Aceptar pedido
                    </button>
                    <button
                      onClick={() => onReject?.(order.id)}
                      className="flex-1 py-3 text-sm font-bold rounded-xl text-white bg-red-500 hover:bg-red-600 active:bg-red-700 transition-colors"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
                {showPreparing && (
                  <button
                    onClick={() => onMarkPreparing?.(order.id)}
                    className="w-full py-3 text-sm font-bold rounded-xl text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 transition-colors"
                  >
                    Comenzar preparación 🍳
                  </button>
                )}
                {showMarkReady && (
                  <button
                    onClick={() => onMarkReady?.(order.id)}
                    className="w-full py-3 text-sm font-bold rounded-xl text-white bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 transition-colors"
                  >
                    Marcar como listo ✓
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
