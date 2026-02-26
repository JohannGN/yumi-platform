'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, MapPin, Phone, User, Store, Clock, Bike, CreditCard, ChevronDown, AlertTriangle } from 'lucide-react';
import {
  colors,
  orderStatusLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  rejectionReasonLabels,
  formatCurrency,
  formatDate,
  formatPhone,
  formatOrderCode,
} from '@/config/tokens';
import { OrderTimeline } from './order-timeline';
import { EvidenceViewer } from './evidence-viewer';
import { AssignRiderModal } from './assign-rider-modal';
import type { AdminOrder, OrderStatusHistory } from '@/types/admin-panel';

// Extiende AdminOrder con campos de auditoría de tarifa (migración fee-audit)
type AdminOrderWithFee = AdminOrder & {
  fee_is_manual?: boolean;
  fee_calculated_cents?: number;
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  cart:                   ['awaiting_confirmation', 'cancelled'],
  awaiting_confirmation:  ['pending_confirmation', 'cancelled'],
  pending_confirmation:   ['confirmed', 'rejected', 'cancelled'],
  confirmed:              ['preparing', 'cancelled'],
  rejected:               ['cancelled'],
  preparing:              ['ready', 'cancelled'],
  ready:                  ['assigned_rider', 'cancelled'],
  assigned_rider:         ['picked_up', 'cancelled'],
  picked_up:              ['in_transit', 'cancelled'],
  in_transit:             ['delivered', 'cancelled'],
  delivered:              [],
  cancelled:              [],
};

interface OrderDetailAdminProps {
  order: AdminOrder | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function OrderDetailAdmin({ order, onClose, onRefresh }: OrderDetailAdminProps) {
  const [detail, setDetail]     = useState<AdminOrder & { restaurant_address?: string; restaurant_phone?: string } | null>(null);
  const [history, setHistory]   = useState<OrderStatusHistory[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [changing, setChanging] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'items' | 'timeline' | 'evidence'>('info');

  const fetchDetail = useCallback(async () => {
    if (!order) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/orders/${order.id}`);
      // BUG 3 FIX: La API ahora devuelve { order, history, valid_next_statuses }
      // en lugar de devolver el order directamente
      const data = await res.json();

      // Compatibilidad: si la respuesta tiene .order úsalo, si no asume que ES el order
      if (data.order) {
        setDetail(data.order);
        setHistory(data.history ?? []);
      } else {
        // Respuesta vieja (retrocompatibilidad)
        setDetail(data);
        setHistory(data.status_history ?? data.order_status_history ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [order]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleCancel = async () => {
    if (!detail || !confirm('¿Confirmar cancelación de este pedido?')) return;
    setCancelling(true);
    try {
      await fetch(`/api/admin/orders/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      await fetchDetail();
      onRefresh();
    } finally {
      setCancelling(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!detail) return;
    setChanging(true);
    try {
      await fetch(`/api/admin/orders/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchDetail();
      onRefresh();
    } finally {
      setChanging(false);
    }
  };

  if (!order) return null;

  const d = detail ?? order;
  const statusColor = colors.orderStatus[d.status as keyof typeof colors.orderStatus] ?? '#6B7280';
  const allowedTransitions = VALID_TRANSITIONS[d.status] ?? [];
  const canAssign = ['ready', 'confirmed', 'preparing'].includes(d.status) && !d.rider_id;
  const canCancel = !['delivered', 'cancelled'].includes(d.status);

  const TABS = [
    { id: 'info',     label: 'Info' },
    { id: 'items',    label: `Items (${d.items?.length ?? 0})` },
    { id: 'timeline', label: 'Timeline' },
    { id: 'evidence', label: 'Evidencia' },
  ] as const;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
                {formatOrderCode(d.code)}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                {orderStatusLabels[d.status] ?? d.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(d.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* TAB: Info */}
              {activeTab === 'info' && (
                <div className="p-6 space-y-6">
                  {/* Cliente */}
                  <Section title="Cliente" icon={<User className="w-4 h-4" />}>
                    <InfoRow label="Nombre" value={d.customer_name} />
                    <InfoRow label="Teléfono" value={formatPhone(d.customer_phone)} mono />
                    <InfoRow label="Origen" value={d.source} />
                    {d.customer_rating && (
                      <InfoRow label="Calificación" value={`${'⭐'.repeat(d.customer_rating)} ${d.customer_rating}/5`} />
                    )}
                    {d.customer_comment && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Comentario</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{d.customer_comment}"</p>
                      </div>
                    )}
                  </Section>

                  {/* Entrega */}
                  <Section title="Entrega" icon={<MapPin className="w-4 h-4" />}>
                    <InfoRow label="Dirección" value={d.delivery_address} />
                    {d.delivery_instructions && (
                      <InfoRow label="Instrucciones" value={d.delivery_instructions} />
                    )}
                  </Section>

                  {/* Restaurante */}
                  <Section title="Restaurante" icon={<Store className="w-4 h-4" />}>
                    <InfoRow label="Nombre" value={d.restaurant_name} />
                    {(d as AdminOrder & { restaurant_address?: string }).restaurant_address && (
                      <InfoRow label="Dirección" value={(d as AdminOrder & { restaurant_address?: string }).restaurant_address!} />
                    )}
                  </Section>

                  {/* Rider */}
                  <Section title="Rider" icon={<Bike className="w-4 h-4" />}>
                    {d.rider_name ? (
                      <InfoRow label="Asignado" value={d.rider_name} />
                    ) : (
                      <p className="text-sm text-gray-400 italic">Sin rider asignado</p>
                    )}
                  </Section>

                  {/* Pago */}
                  <Section title="Pago" icon={<CreditCard className="w-4 h-4" />}>
                    <InfoRow label="Método solicitado" value={paymentMethodLabels[d.payment_method] ?? d.payment_method} />
                    {d.actual_payment_method && d.actual_payment_method !== d.payment_method && (
                      <InfoRow label="Método real" value={paymentMethodLabels[d.actual_payment_method] ?? d.actual_payment_method} highlight />
                    )}
                    <InfoRow label="Estado pago" value={paymentStatusLabels[d.payment_status] ?? d.payment_status} />
                  </Section>

                  {/* Financiero */}
                  <Section title="Desglose financiero" icon={<Clock className="w-4 h-4" />}>
                    <div className="space-y-1.5">
                      <FinRow label="Subtotal" value={d.subtotal_cents} />
                      {/* Delivery fee con auditoría */}
                      <div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Delivery fee</span>
                            {(d as AdminOrderWithFee).fee_is_manual && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}
                              >
                                ✏️ MANUAL
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                            {formatCurrency(d.delivery_fee_cents)}
                          </span>
                        </div>

                        {/* Bloque auditoría — solo cuando hay fee manual y datos para comparar */}
                        {(d as AdminOrderWithFee).fee_is_manual &&
                         (d as AdminOrderWithFee).fee_calculated_cents != null && (
                          <div
                            className="mt-2 rounded-lg p-2.5 text-xs space-y-1"
                            style={{
                              background: (d as AdminOrderWithFee).fee_calculated_cents! > d.delivery_fee_cents
                                ? 'rgba(239,68,68,0.07)'
                                : 'rgba(245,158,11,0.07)',
                              border: `1px solid ${
                                (d as AdminOrderWithFee).fee_calculated_cents! > d.delivery_fee_cents
                                  ? 'rgba(239,68,68,0.25)'
                                  : 'rgba(245,158,11,0.25)'
                              }`,
                            }}
                          >
                            <p className="font-semibold text-amber-800 dark:text-amber-400">
                              Auditoría de tarifa
                            </p>
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                              <span>Calculado por zona:</span>
                              <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                                {formatCurrency((d as AdminOrderWithFee).fee_calculated_cents!)}
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                              <span>Cobrado al cliente:</span>
                              <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                                {formatCurrency(d.delivery_fee_cents)}
                              </span>
                            </div>
                            {(d as AdminOrderWithFee).fee_calculated_cents! > d.delivery_fee_cents && (
                              <div
                                className="flex justify-between font-bold pt-1.5 border-t"
                                style={{ borderColor: 'rgba(239,68,68,0.25)', color: '#dc2626' }}
                              >
                                <span>⚡ Pérdida para YUMI:</span>
                                <span className="tabular-nums">
                                  -{formatCurrency(
                                    (d as AdminOrderWithFee).fee_calculated_cents! - d.delivery_fee_cents
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {d.service_fee_cents > 0 && <FinRow label="Cargo de servicio" value={d.service_fee_cents} />}
                      {d.rider_bonus_cents > 0 && <FinRow label="Bonus rider" value={d.rider_bonus_cents} />}
                      {d.discount_cents > 0 && <FinRow label="Descuento" value={-d.discount_cents} negative />}
                      <div className="pt-1.5 mt-1.5 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                        <span className="font-bold text-gray-900 dark:text-gray-100">Total</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{formatCurrency(d.total_cents)}</span>
                      </div>
                    </div>
                  </Section>

                  {/* Rechazo */}
                  {d.rejection_reason && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-700 dark:text-red-400">Pedido rechazado</span>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {rejectionReasonLabels[d.rejection_reason] ?? d.rejection_reason}
                      </p>
                      {d.rejection_notes && (
                        <p className="text-xs text-red-500 mt-1 italic">"{d.rejection_notes}"</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Items */}
              {activeTab === 'items' && (
                <div className="p-6 space-y-3">
                  {(d.items ?? []).map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {item.quantity}
                          </span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                        </div>
                        {item.variant_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-8 mt-0.5">
                            Variante: {item.variant_name}
                          </p>
                        )}

                        {/* BUG 2 FIX: soporte dual de formato de modificadores
                            - Formato nuevo (admin): modifiers[].name
                            - Formato viejo (checkout cliente): modifiers[].option_name o modifier_name */}
                        {(() => {
                          const rawItem = item as unknown as Record<string, unknown>;
                          const mods = (
                            (rawItem.modifiers as Array<Record<string, unknown>> | undefined) ??
                            (rawItem.selected_modifiers as Array<Record<string, unknown>> | undefined) ??
                            []
                          );
                          if (mods.length === 0) return null;
                          return (
                            <ul className="ml-8 mt-1 space-y-0.5">
                              {mods.map((mod, mi) => {
                                const modName =
                                  (mod.name as string | undefined) ??
                                  (mod.option_name as string | undefined) ??
                                  (mod.modifier_name as string | undefined) ??
                                  '';
                                const modPrice = (mod.price_cents as number | undefined) ?? 0;
                                if (!modName) return null;
                                return (
                                  <li key={mi} className="text-xs text-gray-400 dark:text-gray-500 flex justify-between">
                                    <span>+ {modName}</span>
                                    {modPrice > 0 && (
                                      <span className="tabular-nums ml-2">+{formatCurrency(modPrice)}</span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          );
                        })()}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                          {formatCurrency(itemTotal(item as unknown as Record<string, unknown>))}
                        </p>
                        {((item.quantity as number) ?? 1) > 1 && (
                          <p className="text-xs text-gray-400 tabular-nums">
                            {formatCurrency(itemUnitPrice(item as unknown as Record<string, unknown>))} c/u
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: Timeline — BUG 3 FIX: pasar history desde estado local */}
              {activeTab === 'timeline' && (
                <div className="p-6">
                  <OrderTimeline history={history} />
                </div>
              )}

              {/* TAB: Evidencia */}
              {activeTab === 'evidence' && (
                <div className="p-6">
                  <EvidenceViewer
                    orderId={d.id}
                    hasDeliveryProof={!!d.delivery_proof_url}
                    hasPaymentProof={!!d.payment_proof_url}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer acciones */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-wrap gap-2">
          {/* Asignar rider */}
          {canAssign && (
            <button
              onClick={() => setShowAssign(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white transition"
            >
              <Bike className="w-4 h-4" />
              Asignar Rider
            </button>
          )}

          {/* Cambiar estado */}
          {allowedTransitions.filter((s) => s !== 'cancelled').length > 0 && (
            <div className="relative">
              <select
                onChange={(e) => { if (e.target.value) handleStatusChange(e.target.value); }}
                disabled={changing}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
              >
                <option value="">Cambiar estado…</option>
                {allowedTransitions.filter((s) => s !== 'cancelled').map((s) => (
                  <option key={s} value={s}>{orderStatusLabels[s] ?? s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Cancelar */}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 transition ml-auto"
            >
              Cancelar pedido
            </button>
          )}
        </div>
      </div>

      {/* Modal asignar */}
      {showAssign && detail && (
        <AssignRiderModal
          order={detail}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { fetchDetail(); onRefresh(); }}
        />
      )}
    </>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-orange-500">{icon}</span>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h4>
      </div>
      <div className="space-y-2 pl-6">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? 'font-mono' : ''} ${highlight ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </span>
    </div>
  );
}

function FinRow({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`tabular-nums font-medium ${negative ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {negative ? '-' : ''}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

// BUG 2 FIX: helpers con fallback dual para naming del JSONB
// cart-store usa unit_total_cents / line_total_cents
// schema usa unit_price_cents / total_cents
function itemTotal(item: Record<string, unknown>): number {
  const total = (item.total_cents ?? item.line_total_cents) as number | undefined;
  if (total !== undefined && !isNaN(total)) return total;
  const unit = (item.unit_price_cents ?? item.unit_total_cents ?? 0) as number;
  const qty  = (item.quantity ?? 1) as number;
  return unit * qty;
}

function itemUnitPrice(item: Record<string, unknown>): number {
  return ((item.unit_price_cents ?? item.unit_total_cents ?? 0) as number);
}
