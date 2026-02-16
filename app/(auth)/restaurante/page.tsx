'use client';

// ============================================================
// Restaurant Dashboard — Real data from /api/restaurant/stats
// Chat 5 — Fragment 2/7
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRestaurant } from '@/components/restaurant-panel';
import { formatPrice } from '@/lib/utils/rounding';
import {
  orderStatusLabels,
  paymentMethodLabels,
} from '@/config/tokens';

interface RecentOrder {
  id: string;
  code: string;
  customer_name: string;
  status: string;
  total_cents: number;
  payment_method: string;
  created_at: string;
}

interface OutOfStockItem {
  id: string;
  name: string;
  base_price_cents: number;
}

interface Stats {
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  activeOrders: number;
  avgRating: number;
  totalRatings: number;
  recentOrders: RecentOrder[];
  outOfStockItems: OutOfStockItem[];
}

export default function RestaurantDashboardPage() {
  const { restaurant } = useRestaurant();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/restaurant/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ¡Hola, {restaurant?.name}! 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Resumen del día
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPICard
          icon="🔔"
          label="Pendientes"
          value={isLoading ? '—' : String(stats?.pendingOrders || 0)}
          color="bg-purple-50 dark:bg-purple-950/30"
          textColor="text-purple-700 dark:text-purple-400"
          href="/restaurante/pedidos"
          pulse={!!stats && stats.pendingOrders > 0}
        />
        <KPICard
          icon="📦"
          label="Pedidos hoy"
          value={isLoading ? '—' : String(stats?.ordersToday || 0)}
          color="bg-blue-50 dark:bg-blue-950/30"
          textColor="text-blue-700 dark:text-blue-400"
        />
        <KPICard
          icon="💰"
          label="Ingresos hoy"
          value={isLoading ? '—' : formatPrice(stats?.revenueToday || 0)}
          color="bg-green-50 dark:bg-green-950/30"
          textColor="text-green-700 dark:text-green-400"
        />
        <KPICard
          icon="⭐"
          label="Rating"
          value={
            isLoading
              ? '—'
              : stats?.avgRating
                ? `${Number(stats.avgRating).toFixed(1)} (${stats.totalRatings})`
                : 'Sin calificar'
          }
          color="bg-amber-50 dark:bg-amber-950/30"
          textColor="text-amber-700 dark:text-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent orders */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Pedidos recientes
            </h2>
            <Link
              href="/restaurante/pedidos"
              className="text-xs font-medium text-[#FF6B35] hover:underline"
            >
              Ver todos →
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="space-y-2">
              {stats.recentOrders.map((order) => (
                <RecentOrderRow key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-600">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">No hay pedidos recientes</p>
            </div>
          )}
        </motion.div>

        {/* Out of stock items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Platos agotados
            </h2>
            <Link
              href="/restaurante/menu"
              className="text-xs font-medium text-[#FF6B35] hover:underline"
            >
              Ir al menú →
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : stats?.outOfStockItems && stats.outOfStockItems.length > 0 ? (
            <div className="space-y-2">
              {stats.outOfStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30"
                >
                  <span className="text-sm text-red-700 dark:text-red-400 font-medium">
                    {item.name}
                  </span>
                  <span className="text-xs text-red-500">
                    {formatPrice(item.base_price_cents)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-600">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-sm">Todos los platos disponibles</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Restaurant status overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Estado del restaurante
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <InfoRow label="Estado" value={restaurant?.is_open ? '🟢 Abierto' : '🔴 Cerrado'} />
          <InfoRow label="Tiempo prep." value={`${restaurant?.estimated_prep_minutes || 30} min`} />
          <InfoRow
            label="Pedido mínimo"
            value={restaurant?.min_order_cents ? formatPrice(restaurant.min_order_cents) : 'Sin mínimo'}
          />
          <InfoRow label="Pedidos totales" value={String(restaurant?.total_orders || 0)} />
        </div>
      </motion.div>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────

function KPICard({
  icon, label, value, color, textColor, href, pulse,
}: {
  icon: string; label: string; value: string; color: string;
  textColor: string; href?: string; pulse?: boolean;
}) {
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${color} rounded-xl p-4 border border-transparent
        ${href ? 'hover:border-gray-200 dark:hover:border-gray-700 cursor-pointer' : ''}
        transition-all duration-200 relative`}
    >
      {pulse && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      )}
      <span className="text-2xl">{icon}</span>
      <p className={`text-xl font-bold mt-2 ${textColor} tabular-nums`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </motion.div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// ─── Recent Order Row ───────────────────────────────────────

function RecentOrderRow({ order }: { order: RecentOrder }) {
  const statusLabel = orderStatusLabels[order.status] || order.status;
  const payLabel = paymentMethodLabels[order.payment_method] || order.payment_method;
  const timeAgo = getTimeAgo(order.created_at);
  const codeFormatted = `${order.code.slice(0, 3)}-${order.code.slice(3)}`;

  const statusColors: Record<string, string> = {
    pending_confirmation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    preparing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    ready: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
            {codeFormatted}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
            {statusLabel}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {order.customer_name} · {payLabel} · {timeAgo}
        </p>
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
        {formatPrice(order.total_cents)}
      </span>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-xs">{label}</p>
      <p className="font-medium text-gray-900 dark:text-white mt-0.5">{value}</p>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return `Hace ${Math.floor(diff / 86400)}d`;
}
