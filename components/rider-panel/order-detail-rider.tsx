'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  formatCurrency, formatOrderCode, formatTime, formatDate,
  paymentMethodLabels, orderStatusLabels, colors,
} from '@/config/tokens';

interface OrderDetailData {
  id: string;
  code: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_instructions: string | null;
  items: Array<{
    name: string;
    variant_name?: string | null;
    quantity: number;
    unit_price_cents?: number;
    unit_total_cents?: number;
    line_total_cents?: number;
    total_cents?: number;
    modifiers?: Array<{ group_name: string; selections: Array<{ name: string; price_cents: number }> }>;
  }>;
  subtotal_cents: number;
  delivery_fee_cents: number;
  service_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  rider_bonus_cents: number;
  payment_method: string;
  actual_payment_method: string | null;
  payment_status: string;
  delivery_proof_url: string | null;
  payment_proof_url: string | null;
  source: string;
  created_at: string;
  confirmed_at: string | null;
  restaurant_confirmed_at: string | null;
  ready_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  customer_rating: number | null;
  customer_comment: string | null;
  restaurant: { name: string; address: string; phone: string | null } | null;
}

interface OrderDetailRiderProps {
  orderId: string;
  onClose: () => void;
}

export function OrderDetailRider({ orderId, onClose }: OrderDetailRiderProps) {
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/rider/history/${orderId}`);
        if (!res.ok) {
          setError('No se pudo cargar el pedido');
          return;
        }
        const data = await res.json();
        setOrder(data);
      } catch {
        setError('Error de conexión');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const actualMethod = order?.actual_payment_method || order?.payment_method || '';
  const methodLabel = paymentMethodLabels[actualMethod] || actualMethod;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-white dark:bg-gray-900 rounded-t-3xl overflow-hidden flex flex-col"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            {isLoading ? (
              <DetailSkeleton />
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : order ? (
              <div className="flex flex-col gap-4 pb-4">
                {/* Header */}
                <div className="text-center pt-2">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Detalle de entrega
                  </p>
                  <p className="text-xl font-black font-mono text-gray-900 dark:text-white mt-1">
                    {formatOrderCode(order.code)}
                  </p>
                  <span
                    className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: colors.semantic.success }}
                  >
                    {orderStatusLabels[order.status] || order.status}
                  </span>
                </div>

                {/* Restaurant */}
                <Section title="Restaurante">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {order.restaurant?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {order.restaurant?.address}
                  </p>
                </Section>

                {/* Client */}
                <Section title="Cliente">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {order.customer_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    📱 {order.customer_phone}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    📍 {order.delivery_address}
                  </p>
                  {order.delivery_instructions && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">
                      📝 {order.delivery_instructions}
                    </p>
                  )}
                </Section>

                {/* Items */}
                <Section title="Productos">
                  <div className="flex flex-col gap-2">
                    {order.items.map((item, idx) => {
                      const lineTotal = item.line_total_cents || item.total_cents || 0;
                      return (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-xs font-bold text-orange-500 mt-0.5 w-5 text-center flex-shrink-0">
                            {item.quantity}x
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 dark:text-white">
                              {item.name}
                              {item.variant_name && (
                                <span className="text-gray-400"> · {item.variant_name}</span>
                              )}
                            </p>
                            {item.modifiers?.map((mod, mi) => (
                              <p key={mi} className="text-[11px] text-gray-400 dark:text-gray-500 pl-1">
                                {mod.group_name}: {mod.selections.map(s => s.name).join(', ')}
                              </p>
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 tabular-nums flex-shrink-0">
                            {formatCurrency(lineTotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Section>

                {/* Totals */}
                <Section title="Montos">
                  <div className="flex flex-col gap-1.5">
                    <Row label="Subtotal" value={formatCurrency(order.subtotal_cents)} />
                    <Row label="Delivery" value={formatCurrency(order.delivery_fee_cents)} />
                    {order.rider_bonus_cents > 0 && (
                      <Row label="Bono distancia" value={`+${formatCurrency(order.rider_bonus_cents)}`} valueColor={colors.semantic.success} />
                    )}
                    {order.discount_cents > 0 && (
                      <Row label="Descuento" value={`-${formatCurrency(order.discount_cents)}`} valueColor={colors.semantic.error} />
                    )}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-1.5 mt-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Total cobrado</span>
                        <span className="text-base font-black text-gray-900 dark:text-white tabular-nums">
                          {formatCurrency(order.total_cents)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Section>

                {/* Payment */}
                <Section title="Pago">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Método</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {getPaymentIcon(actualMethod)} {methodLabel}
                    </span>
                  </div>
                  {order.actual_payment_method && order.actual_payment_method !== order.payment_method && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                      Original: {paymentMethodLabels[order.payment_method] || order.payment_method}
                    </p>
                  )}
                </Section>

                {/* Timeline */}
                <Section title="Tiempos">
                  <div className="flex flex-col gap-1.5">
                    {order.created_at && <TimeRow label="Creado" time={order.created_at} />}
                    {order.restaurant_confirmed_at && <TimeRow label="Confirmado" time={order.restaurant_confirmed_at} />}
                    {order.ready_at && <TimeRow label="Listo" time={order.ready_at} />}
                    {order.assigned_at && <TimeRow label="Asignado" time={order.assigned_at} />}
                    {order.picked_up_at && <TimeRow label="Recogido" time={order.picked_up_at} />}
                    {order.in_transit_at && <TimeRow label="En camino" time={order.in_transit_at} />}
                    {order.delivered_at && <TimeRow label="Entregado" time={order.delivered_at} highlight />}
                  </div>
                </Section>

                {/* Rating */}
                {order.customer_rating && (
                  <Section title="Calificación">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⭐</span>
                      <span className="text-lg font-black text-gray-900 dark:text-white">
                        {order.customer_rating}
                      </span>
                    </div>
                    {order.customer_comment && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                        &quot;{order.customer_comment}&quot;
                      </p>
                    )}
                  </Section>
                )}

                {/* Source */}
                <div className="text-center pt-2">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    Fuente: {order.source === 'whatsapp' ? '💬 WhatsApp' : '🌐 Web'}
                    {' · '}
                    {formatDate(order.created_at)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Close button */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 active:scale-[0.98] transition-transform"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// === Subcomponents ===

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3.5">
      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className="text-xs font-semibold tabular-nums"
        style={{ color: valueColor || undefined }}
      >
        {value}
      </span>
    </div>
  );
}

function TimeRow({ label, time, highlight }: { label: string; time: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${highlight ? 'font-bold text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
        {label}
      </span>
      <span className={`text-xs font-mono tabular-nums ${highlight ? 'font-bold text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
        {formatTime(time)}
      </span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col items-center gap-2">
        <div className="w-20 h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        <div className="w-28 h-6 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3.5 h-24 animate-pulse" />
      ))}
    </div>
  );
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
