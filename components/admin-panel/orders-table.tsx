'use client';

import { ChevronLeft, ChevronRight, Eye, User } from 'lucide-react';
import {
  colors,
  orderStatusLabels,
  paymentMethodLabels,
  formatCurrency,
  formatDate,
  formatOrderCode,
  formatPhone,
} from '@/config/tokens';
import type { AdminOrder } from '@/types/admin-panel';

interface OrdersTableProps {
  orders: AdminOrder[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onOrderClick: (order: AdminOrder) => void;
}

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

function PaymentBadge({ method, actual }: { method: string; actual: string | null }) {
  const display = actual && actual !== method ? actual : method;
  const changed  = actual && actual !== method;
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

const SKELETON_WIDTHS = [65, 80, 55, 70, 90, 60, 75, 85, 50];
function SkeletonRow({ idx }: { idx: number }) {
  return (
    <tr>
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            style={{ width: `${SKELETON_WIDTHS[(idx * 9 + i) % SKELETON_WIDTHS.length]}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

export function OrdersTable({
  orders, total, page, limit, loading, onPageChange, onOrderClick,
}: OrdersTableProps) {
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/80 backdrop-blur-sm">
            <tr>
              {[
                'Código', 'Estado', 'Restaurante', 'Cliente',
                'Rider', 'Total', 'Pago', 'Fecha', '',
              ].map((h) => (
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
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : orders.length === 0
              ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-gray-400 dark:text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">📋</span>
                      <p className="font-medium">Sin pedidos</p>
                      <p className="text-xs">Prueba con otros filtros</p>
                    </div>
                  </td>
                </tr>
              )
              : orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors group"
                >
                  {/* Código */}
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-gray-900 dark:text-gray-100 tracking-wider">
                      {formatOrderCode(order.code)}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>

                  {/* Restaurante */}
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {order.restaurant_name}
                    </p>
                  </td>

                  {/* Cliente */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{order.customer_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
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
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{order.rider_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic text-xs">Sin asignar</span>
                    )}
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3">
                    <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                      {formatCurrency(order.total_cents)}
                    </span>
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

                  {/* Acción */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onOrderClick(order)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando <span className="font-medium text-gray-900 dark:text-gray-100">{start}–{end}</span> de{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">{total}</span> pedidos
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
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
                    onClick={() => onPageChange(p)}
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
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
