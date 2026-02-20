'use client';

import { orderStatusLabels } from '@/config/design-tokens';
import { OrderStatusHistory } from '@/types/admin-panel';
import { formatTime } from '@/config/design-tokens';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Package,
  ChefHat,
  MapPin,
  ShoppingCart,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderTimelineProps {
  // Acepta history como prop directa (modo recomendado desde fix-4)
  history?: OrderStatusHistory[];
  // O puede venir embebido en el order (retrocompatibilidad)
  order?: {
    order_status_history?: OrderStatusHistory[];
    status?: string;
  };
}

// ─── Status Icon ─────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  const cls = 'w-4 h-4';
  switch (status) {
    case 'cart':               return <ShoppingCart className={cls} />;
    case 'awaiting_confirmation':
    case 'pending_confirmation': return <Clock className={cls} />;
    case 'confirmed':          return <CheckCircle2 className={cls} />;
    case 'rejected':           return <XCircle className={cls} />;
    case 'preparing':          return <ChefHat className={cls} />;
    case 'ready':              return <Package className={cls} />;
    case 'assigned_rider':     return <Truck className={cls} />;
    case 'picked_up':          return <Truck className={cls} />;
    case 'in_transit':         return <Truck className={cls} />;
    case 'delivered':          return <MapPin className={cls} />;
    case 'cancelled':          return <XCircle className={cls} />;
    default:                   return <Clock className={cls} />;
  }
}

// ─── Status Color ────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  switch (status) {
    case 'delivered':   return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'cancelled':
    case 'rejected':    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    case 'in_transit':
    case 'picked_up':   return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    case 'preparing':
    case 'ready':       return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    default:            return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OrderTimeline({ history, order }: OrderTimelineProps) {
  // Resolver history desde prop directa o desde order embebido
  const entries: OrderStatusHistory[] =
    history ??
    order?.order_status_history ??
    [];

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>Sin historial de estados</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-0 ml-3">
      {entries.map((entry, idx) => {
        const isLast = idx === entries.length - 1;
        return (
          <li key={entry.id} className="relative pl-8 pb-6">
            {/* Línea vertical */}
            {!isLast && (
              <span
                className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-200 dark:bg-gray-700"
                aria-hidden
              />
            )}

            {/* Círculo con ícono */}
            <span
              className={`absolute left-0 flex items-center justify-center w-6 h-6 rounded-full border ${statusColor(entry.to_status)}`}
            >
              <StatusIcon status={entry.to_status} />
            </span>

            {/* Contenido */}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {orderStatusLabels[entry.to_status] ?? entry.to_status}
              </p>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {formatTime(entry.created_at)}
                {(entry as { changed_by_name?: string }).changed_by_name && (
                  <span className="ml-1 text-gray-400 dark:text-gray-500">
                    · {(entry as { changed_by_name?: string }).changed_by_name}
                  </span>
                )}
              </p>

              {entry.notes && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">
                  "{entry.notes}"
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
