'use client';

// ============================================================
// Order History — Paginated table with filters
// Chat 5 — Fragment 6/7
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { formatPrice } from '@/lib/utils/rounding';
import { orderStatusLabels, paymentMethodLabels } from '@/config/tokens';
import { OrderDetailSheet } from '@/components/restaurant-panel/order-detail-sheet';
import type { PanelOrder } from '@/types/restaurant-panel';

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'delivered', label: '✅ Entregados' },
  { value: 'rejected', label: '❌ Rechazados' },
  { value: 'cancelled', label: '🚫 Cancelados' },
];

export default function HistorialPage() {
  const [orders, setOrders] = useState<PanelOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [detailOrder, setDetailOrder] = useState<PanelOrder | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/restaurant/orders/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historial</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {total} pedidos completados
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === f.value
                ? 'bg-[#FF6B35] text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-2">
          {orders.map((order) => (
            <HistoryRow
              key={order.id}
              order={order}
              onClick={() => setDetailOrder(order)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">No hay pedidos en el historial</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-30"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-30"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Detail sheet */}
      <OrderDetailSheet
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
      />
    </div>
  );
}

// ─── History Row ────────────────────────────────────────────

function HistoryRow({ order, onClick }: { order: PanelOrder; onClick: () => void }) {
  const codeFormatted = `${order.code.slice(0, 3)}-${order.code.slice(3)}`;
  const statusLabel = orderStatusLabels[order.status] || order.status;
  const payLabel = paymentMethodLabels[order.payment_method] || order.payment_method;

  const statusColors: Record<string, string> = {
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  const date = new Date(order.created_at).toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">
            {codeFormatted}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[order.status] || ''}`}>
            {statusLabel}
          </span>
          {order.customer_rating && (
            <span className="text-[10px] text-amber-500">
              {'⭐'.repeat(order.customer_rating)}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {order.customer_name} · {payLabel} · {date}
        </p>
      </div>
      <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
        {formatPrice(order.total_cents)}
      </span>
    </motion.div>
  );
}
