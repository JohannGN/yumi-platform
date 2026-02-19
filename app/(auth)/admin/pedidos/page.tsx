'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { OrderFilters } from '@/components/admin-panel/order-filters';
import { OrdersTable } from '@/components/admin-panel/orders-table';
import { OrderDetailAdmin } from '@/components/admin-panel/order-detail-admin';
import type { AdminOrder, AdminOrderFilters, OrdersListResponse } from '@/types/admin-panel';

interface FilterOption { id: string; name: string }

export default function AdminPedidosPage() {
  const [orders, setOrders]               = useState<AdminOrder[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [restaurants, setRestaurants]     = useState<FilterOption[]>([]);
  const [riders, setRiders]               = useState<FilterOption[]>([]);

  const [filters, setFilters] = useState<AdminOrderFilters>({
    status:        [],
    restaurant_id: '',
    rider_id:      '',
    date_from:     '',
    date_to:       '',
    search:        '',
    page:          1,
    limit:         50,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status.length) params.set('status', filters.status.join(','));
      if (filters.restaurant_id) params.set('restaurant_id', filters.restaurant_id);
      if (filters.rider_id)      params.set('rider_id',      filters.rider_id);
      if (filters.date_from)     params.set('date_from',     filters.date_from);
      if (filters.date_to)       params.set('date_to',       filters.date_to);
      if (filters.search)        params.set('search',        filters.search);
      params.set('page',  filters.page.toString());
      params.set('limit', filters.limit.toString());

      const res  = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json() as OrdersListResponse;
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const load = async () => {
      try {
        const [restRes, riderRes] = await Promise.all([
          fetch('/api/admin/restaurants?limit=200').then(r => r.json()),
          fetch('/api/admin/riders').then(r => r.json()),
        ]);
        setRestaurants((restRes.restaurants ?? []).map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })));
        setRiders((riderRes.riders ?? []).map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })));
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (selectedOrder) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(fetchOrders, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchOrders, selectedOrder]);

  return (
    /*
     * -m-4 lg:-m-6 cancela el padding del <main> en layout-client.tsx
     * para que esta página ocupe todo el espacio edge-to-edge.
     * h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)] restaura la altura
     * correcta después de los márgenes negativos.
     */
    <div className="-m-4 lg:-m-6 h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)] flex flex-col overflow-hidden">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Gestión de Pedidos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total > 0
              ? `${total} pedido${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`
              : 'Vista de operaciones diarias'}
          </p>
        </div>
        <button
          onClick={() => fetchOrders()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* ── Filtros ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <OrderFilters
          filters={filters}
          onChange={setFilters}
          restaurants={restaurants}
          riders={riders}
        />
      </div>

      {/* ── Tabla + panel detalle ────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex bg-white dark:bg-gray-900">
        {/* Tabla */}
        <div className={`flex flex-col transition-all duration-300 overflow-hidden ${selectedOrder ? 'hidden lg:flex lg:w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full'}`}>
          <OrdersTable
            orders={orders}
            total={total}
            page={filters.page}
            limit={filters.limit}
            loading={loading}
            onPageChange={(page) => setFilters(f => ({ ...f, page }))}
            onOrderClick={setSelectedOrder}
          />
        </div>

        {/* Panel detalle inline (desktop) */}
        {selectedOrder && (
          <div className="w-full lg:w-1/2 flex flex-col overflow-hidden">
            <OrderDetailAdmin
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              onRefresh={fetchOrders}
            />
          </div>
        )}
      </div>
    </div>
  );
}
