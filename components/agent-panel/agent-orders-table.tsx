'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useAgent } from '@/components/agent-panel/agent-context';
import { ExportCSVButton } from '@/components/shared/export-csv-button';
import {
  orderStatusLabels,
  paymentMethodLabels,
  formatCurrency,
  formatDate,
  formatTime,
  formatOrderCode,
  formatPhone,
  colors,
} from '@/config/design-tokens';
import { formatCentsForExport, formatDateForExport } from '@/lib/utils/export-csv';
import type { AgentOrder, PaginatedResponse } from '@/types/agent-panel';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  FileText,
  User,
  Loader2,
  Ban, // AGENTE-3
} from 'lucide-react';
import { AgentOrderCancelDialog } from '@/components/agent-panel/agent-order-cancel-dialog'; // AGENTE-3

// ─── Status config ───────────────────────────────────────────────────────────

const ALL_STATUSES = [
  'awaiting_confirmation',
  'pending_confirmation',
  'confirmed',
  'preparing',
  'ready',
  'assigned_rider',
  'picked_up',
  'in_transit',
  'delivered',
  'rejected',
  'cancelled',
] as const;

// AGENTE-3: Estados en los que un pedido puede ser cancelado por agente
const CANCELLABLE_STATUSES = [
  'awaiting_confirmation',
  'pending_confirmation',
  'confirmed',
  'preparing',
  'ready',
  'assigned_rider',
];

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color = colors.orderStatus[status as keyof typeof colors.orderStatus] ?? '#6B7280';
  const label = orderStatusLabels[status] ?? status;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

// ─── PaymentBadge ────────────────────────────────────────────────────────────

function PaymentBadge({ method, actual }: { method: string; actual: string | null }) {
  const display = actual && actual !== method ? actual : method;
  const changed = actual && actual !== method;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {paymentMethodLabels[display] ?? display}
      </span>
      {changed && (
        <span className="text-[10px] text-gray-400 line-through">
          {paymentMethodLabels[method] ?? method}
        </span>
      )}
    </div>
  );
}

// ─── TimestampPill ───────────────────────────────────────────────────────────

function TimestampPill({ label, time }: { label: string; time: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-500 dark:text-gray-400">
      <Clock className="w-3 h-3" />
      <strong>{label}</strong> {formatTime(time)}
    </span>
  );
}

// ─── OrderDetailRow ──────────────────────────────────────────────────────────

function OrderDetailRow({ order }: { order: AgentOrder }) {
  return (
    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {/* Cliente */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</p>
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span>{order.customer_name}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span>{formatPhone(order.customer_phone)}</span>
          </div>
          <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
            <span className="text-xs">{order.delivery_address}</span>
          </div>
          {order.delivery_instructions && (
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-5">
              Ref: {order.delivery_instructions}
            </p>
          )}
        </div>

        {/* Items */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Items</p>
          <div className="space-y-1">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                <span>
                  {item.quantity}x {item.name}
                  {item.variant_name ? ` (${item.variant_name})` : ''}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <span className="text-gray-400 ml-1">
                      + {item.modifiers.map((m) => m.name).join(', ')}
                    </span>
                  )}
                </span>
                <span className="font-medium tabular-nums">{formatCurrency(item.total_cents)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Montos + Pago */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Montos</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(order.subtotal_cents)}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Delivery{order.fee_is_manual ? ' (manual)' : ''}</span>
              <span className="tabular-nums">{formatCurrency(order.delivery_fee_cents)}</span>
            </div>
            {order.discount_cents > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento</span>
                <span className="tabular-nums">-{formatCurrency(order.discount_cents)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(order.total_cents)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 pt-2">
            <CreditCard className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs">
              {paymentMethodLabels[order.actual_payment_method ?? order.payment_method] ?? order.payment_method}
            </span>
          </div>

          {order.notes && (
            <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400 pt-1">
              <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
              <span className="text-xs">{order.notes}</span>
            </div>
          )}

          {order.rider_name && (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 pt-1">
              <span className="text-xs">
                Rider: <strong>{order.rider_name}</strong>
              </span>
              {order.rider_phone && (
                <span className="text-xs text-gray-400">({formatPhone(order.rider_phone)})</span>
              )}
            </div>
          )}

          {order.source === 'admin' && (
            <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              Pedido manual
            </span>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {order.created_at && <TimestampPill label="Creado" time={order.created_at} />}
        {order.confirmed_at && <TimestampPill label="Confirmado" time={order.confirmed_at} />}
        {order.restaurant_confirmed_at && <TimestampPill label="Rest. aceptó" time={order.restaurant_confirmed_at} />}
        {order.ready_at && <TimestampPill label="Listo" time={order.ready_at} />}
        {order.assigned_at && <TimestampPill label="Asignado" time={order.assigned_at} />}
        {order.picked_up_at && <TimestampPill label="Recogido" time={order.picked_up_at} />}
        {order.delivered_at && <TimestampPill label="Entregado" time={order.delivered_at} />}
        {order.cancelled_at && <TimestampPill label="Cancelado" time={order.cancelled_at} />}
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex gap-3">
        <div className="h-10 flex-1 max-w-sm bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>
      <div className="px-6 py-3 flex gap-2 border-b border-gray-100 dark:border-gray-800">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-7 w-24 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="px-6 py-3 border-b border-gray-50 dark:border-gray-800/50 flex gap-4">
          {[70, 85, 120, 100, 90, 60, 70, 100].map((w, j) => (
            <div key={j} className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" style={{ width: `${w}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AgentOrdersTable() {
  const { activeCityId, hasPermission } = useAgent(); // AGENTE-3: + hasPermission
  const [allOrders, setAllOrders] = useState<AgentOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date().toISOString());

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const limit = 50;

  // AGENTE-3: Cancel dialog state
  const [cancelOrder, setCancelOrder] = useState<{ id: string; code: string; status: string } | null>(null);
  const canCancel = hasPermission('can_cancel_orders');

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    if (!activeCityId) return;
    try {
      const res = await fetch(
        `/api/agent/orders?city_id=${activeCityId}&page=1&per_page=200`
      );
      const json = await res.json();
      if (res.ok) {
        const data = json as PaginatedResponse<AgentOrder>;
        setAllOrders(data.data ?? []);
        setTotal(data.total ?? 0);
      }
      setLastRefresh(new Date().toISOString());
    } catch {
      /* silently fail on polling */
    } finally {
      setLoading(false);
    }
  }, [activeCityId]);

  // Initial load + polling 30s
  useEffect(() => {
    setLoading(true);
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Reset on filter change
  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [search, selectedStatuses]);

  // ─── Client-side filtering ───────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    let result = allOrders;

    // Status filter (combinable)
    if (selectedStatuses.length > 0) {
      result = result.filter((o) => selectedStatuses.includes(o.status));
    }

    // Search by code or phone
    if (search.trim()) {
      const q = search.trim().toLowerCase().replace(/[-\s]/g, '');
      result = result.filter(
        (o) =>
          o.code.toLowerCase().includes(q) ||
          o.customer_phone.replace(/\D/g, '').includes(q) ||
          o.customer_name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allOrders, selectedStatuses, search]);

  // Pagination
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredOrders.slice(start, start + limit);
  }, [filteredOrders, page, limit]);

  const totalPages = Math.ceil(filteredOrders.length / limit);

  // ─── ADMIN-FIN-2: CSV export rows ───────────────────────────────────────
  const csvHeaders = ['Código', 'Fecha', 'Restaurante', 'Cliente', 'Teléfono', 'Estado', 'Pago', 'Subtotal', 'Delivery', 'Total', 'Rider'];
  const csvRows = useMemo(() =>
    filteredOrders.map((o) => [
      o.code,
      formatDateForExport(o.created_at),
      o.restaurant_name ?? '',
      o.customer_name,
      o.customer_phone,
      orderStatusLabels[o.status] ?? o.status,
      paymentMethodLabels[o.actual_payment_method ?? o.payment_method] ?? o.payment_method,
      formatCentsForExport(o.subtotal_cents),
      formatCentsForExport(o.delivery_fee_cents),
      formatCentsForExport(o.total_cents),
      o.rider_name ?? '',
    ]),
    [filteredOrders]
  );

  // ─── Status toggle ───────────────────────────────────────────────────────

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const hasFilters = selectedStatuses.length > 0 || search.trim().length > 0;

  const clearAll = () => {
    setSelectedStatuses([]);
    setSearch('');
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchOrders();
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading && allOrders.length === 0) {
    return <TableSkeleton />;
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* ── Toolbar: Search + Filters button + Refresh ──────────────────── */}
      <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder:text-gray-400 transition"
            />
          </div>

          {/* Filter count badge */}
          <button
            onClick={() => setSelectedStatuses([])}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition ${
              selectedStatuses.length > 0
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filtros</span>
            {selectedStatuses.length > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
                {selectedStatuses.length}
              </span>
            )}
          </button>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 transition"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}

          {/* Right side: count + export + refresh */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
              {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
            </span>
            {/* ADMIN-FIN-2: Export CSV */}
            {filteredOrders.length > 0 && (
              <ExportCSVButton
                mode="client"
                headers={csvHeaders}
                rows={csvRows}
                filenamePrefix="pedidos_agente"
                label="Exportar"
              />
            )}
            <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden md:inline">
              Actualizado {formatTime(lastRefresh)}
            </span>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              title="Refrescar"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* ── Status pills (combinable) ──────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((status) => {
            const active = selectedStatuses.includes(status);
            const color = colors.orderStatus[status as keyof typeof colors.orderStatus] ?? '#6B7280';
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? ''
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                style={
                  active
                    ? { borderColor: color, backgroundColor: `${color}20`, color }
                    : undefined
                }
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                {orderStatusLabels[status] ?? status}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/80 backdrop-blur-sm">
            <tr>
              {['Código', 'Estado', 'Restaurante', 'Cliente', 'Rider', 'Total', 'Pago', 'Fecha', ''].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-gray-400 dark:text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">📋</span>
                    <p className="font-medium">Sin pedidos</p>
                    <p className="text-xs">
                      {hasFilters ? 'Prueba con otros filtros' : 'No hay pedidos para esta ciudad'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                const isExpanded = expandedId === order.id;
                return (
                  <Fragment key={order.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors cursor-pointer group"
                    >
                      {/* Código */}
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-gray-900 dark:text-gray-100 tracking-wider text-xs">
                          {formatOrderCode(order.code)}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>

                      {/* Restaurante */}
                      <td className="px-4 py-3 max-w-[160px]">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-xs">
                          {order.restaurant_name}
                        </p>
                      </td>

                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-xs">{order.customer_name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                          {formatPhone(order.customer_phone)}
                        </p>
                      </td>

                      {/* Rider */}
                      <td className="px-4 py-3">
                        {order.rider_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                              <User className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <span className="text-gray-900 dark:text-gray-100 font-medium text-xs">
                              {order.rider_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic text-[11px]">Sin asignar</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums text-xs whitespace-nowrap">
                          {formatCurrency(order.total_cents)}
                        </span>
                        {order.fee_is_manual && (
                          <div className="mt-0.5">
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}
                            >
                              FEE MANUAL
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Pago */}
                      <td className="px-4 py-3">
                        <PaymentBadge method={order.payment_method} actual={order.actual_payment_method} />
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(order.created_at)}
                        </span>
                      </td>

                      {/* AGENTE-3: Actions (cancel + expand) */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {canCancel && CANCELLABLE_STATUSES.includes(order.status) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCancelOrder({ id: order.id, code: order.code, status: order.status });
                              }}
                              className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Cancelar pedido"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {isExpanded ? (
                      <tr>
                        <td colSpan={9} className="p-0">
                          <OrderDetailRow order={order} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {(page - 1) * limit + 1}–{Math.min(page * limit, filteredOrders.length)}
            </span>{' '}
            de{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {filteredOrders.length}
            </span>{' '}
            pedidos
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                        p === page
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="text-gray-400 px-1">…</span>}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* AGENTE-3: Cancel dialog */}
      {cancelOrder ? (
        <AgentOrderCancelDialog
          orderId={cancelOrder.id}
          orderCode={formatOrderCode(cancelOrder.code)}
          orderStatus={cancelOrder.status}
          onCancel={() => {
            setCancelOrder(null);
            fetchOrders();
          }}
          onClose={() => setCancelOrder(null)}
        />
      ) : null}
    </div>
  );
}
