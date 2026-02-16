'use client';

// ============================================================
// Order Detail Sheet — Full order view in a slide-over
// Chat 5 — Fragment 3/7
// ============================================================

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/lib/utils/rounding';
import {
  orderStatusLabels,
  paymentMethodLabels,
} from '@/config/tokens';
import type { PanelOrder, OrderItem } from '@/types/restaurant-panel';

interface OrderDetailSheetProps {
  order: PanelOrder | null;
  onClose: () => void;
}

export function OrderDetailSheet({ order, onClose }: OrderDetailSheetProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!order) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [order, onClose]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {order && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                    {order.code.slice(0, 3)}-{order.code.slice(3)}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={order.status} />
                    <span className="text-xs text-gray-400">
                      {formatDateTime(order.created_at)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Customer info */}
              <Section title="Cliente">
                <InfoLine icon="👤" label="Nombre" value={order.customer_name} />
                <InfoLine icon="📱" label="Teléfono" value={formatPhone(order.customer_phone)} />
              </Section>

              {/* Delivery */}
              <Section title="Entrega">
                <InfoLine icon="📍" label="Dirección" value={order.delivery_address} />
                {order.delivery_instructions && (
                  <InfoLine icon="📝" label="Instrucciones" value={order.delivery_instructions} />
                )}
              </Section>

              {/* Items */}
              <Section title="Productos">
                <div className="space-y-3">
                  {(Array.isArray(order.items) ? order.items : []).map((item: OrderItem, idx: number) => (
                    <DetailItemRow key={idx} item={item} />
                  ))}
                </div>
              </Section>

              {/* Totals */}
              <Section title="Resumen">
                <div className="space-y-1.5">
                  <TotalLine label="Subtotal" cents={order.subtotal_cents} />
                  {order.delivery_fee_cents > 0 && (
                    <TotalLine label="Delivery" cents={order.delivery_fee_cents} />
                  )}
                  {order.service_fee_cents > 0 && (
                    <TotalLine label="Servicio" cents={order.service_fee_cents} />
                  )}
                  {order.discount_cents > 0 && (
                    <TotalLine label="Descuento" cents={-order.discount_cents} isDiscount />
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-2">
                    <TotalLine label="Total" cents={order.total_cents} isBold />
                  </div>
                </div>
              </Section>

              {/* Payment */}
              <Section title="Pago">
                <InfoLine
                  icon={order.payment_method === 'cash' ? '💵' : order.payment_method === 'pos' ? '💳' : '📱'}
                  label="Método"
                  value={paymentMethodLabels[order.payment_method] || order.payment_method}
                />
                <InfoLine
                  icon="📊"
                  label="Estado"
                  value={order.payment_status === 'paid' ? 'Pagado' : order.payment_status === 'refunded' ? 'Reembolsado' : 'Pendiente'}
                />
              </Section>

              {/* Rejection reason if applicable */}
              {order.status === 'rejected' && order.rejection_reason && (
                <Section title="Rechazo">
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2.5 border border-red-100 dark:border-red-900/30">
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                      {rejectionReasonText(order.rejection_reason)}
                    </p>
                    {order.rejection_notes && (
                      <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                        {order.rejection_notes}
                      </p>
                    )}
                  </div>
                </Section>
              )}

              {/* Rating */}
              {order.customer_rating && (
                <Section title="Calificación">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {'⭐'.repeat(order.customer_rating)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({order.customer_rating}/5)
                    </span>
                  </div>
                  {order.customer_comment && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                      &quot;{order.customer_comment}&quot;
                    </p>
                  )}
                </Section>
              )}

              {/* Timestamps */}
              <Section title="Tiempos">
                <div className="space-y-1">
                  <TimeLine label="Creado" time={order.created_at} />
                  {order.confirmed_at && <TimeLine label="Confirmado cliente" time={order.confirmed_at} />}
                  {order.restaurant_confirmed_at && <TimeLine label="Aceptado restaurante" time={order.restaurant_confirmed_at} />}
                  {order.ready_at && <TimeLine label="Listo" time={order.ready_at} />}
                  {order.delivered_at && <TimeLine label="Entregado" time={order.delivered_at} />}
                  {order.cancelled_at && <TimeLine label="Cancelado" time={order.cancelled_at} />}
                </div>
              </Section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Sub-components ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-sm">{icon}</span>
      <div className="min-w-0">
        <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
        <p className="text-sm text-gray-900 dark:text-white break-words">{value}</p>
      </div>
    </div>
  );
}

function DetailItemRow({ item }: { item: OrderItem }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {item.quantity}x {item.name}
          </p>
          {item.variant_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Variante: {item.variant_name}
            </p>
          )}
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
          {formatPrice(item.line_total_cents)}
        </span>
      </div>

      {item.modifiers && item.modifiers.length > 0 && (
        <div className="mt-1.5 space-y-1 border-t border-gray-200 dark:border-gray-700 pt-1.5">
          {item.modifiers.map((mod, i) => (
            <div key={i} className="text-xs">
              <span className="text-gray-400 dark:text-gray-500 font-medium">
                {mod.group_name}:
              </span>{' '}
              <span className="text-gray-600 dark:text-gray-400">
                {mod.selections.map((s) => {
                  const price = s.price_cents > 0 ? ` (+${formatPrice(s.price_cents)})` : '';
                  return `${s.name}${price}`;
                }).join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TotalLine({ label, cents, isBold, isDiscount }: {
  label: string; cents: number; isBold?: boolean; isDiscount?: boolean;
}) {
  return (
    <div className={`flex justify-between text-sm ${isBold ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${isDiscount ? 'text-green-600 dark:text-green-400' : ''}`}>
        {isDiscount ? '-' : ''}{formatPrice(Math.abs(cents))}
      </span>
    </div>
  );
}

function TimeLine({ label, time }: { label: string; time: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-700 dark:text-gray-300 font-mono">
        {formatDateTime(time)}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending_confirmation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    preparing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    ready: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {orderStatusLabels[status] || status}
    </span>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPhone(phone: string): string {
  const clean = phone.replace('+51', '').replace(/\D/g, '');
  return clean.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
}

function rejectionReasonText(reason: string): string {
  const map: Record<string, string> = {
    item_out_of_stock: 'Plato(s) agotado(s)',
    closing_soon: 'Cierra pronto',
    kitchen_issue: 'Problema en cocina',
    other: 'Otro motivo',
  };
  return map[reason] || reason;
}
