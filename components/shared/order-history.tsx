'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Package, ChevronRight, Clock, Minus } from 'lucide-react';
import { colors } from '@/config/tokens';
import { formatPrice } from '@/lib/utils/restaurant';

// ─── Types ───────────────────────────────────────────────

interface LocalOrder {
  code: string;
  restaurantName: string;
  totalCents: number;
  createdAt: string;
  status?: string;
}

const STORAGE_KEY = 'yumi_order_history';

// ─── Helpers (exportados para uso desde step-order-summary) ─

export function getOrderHistory(): LocalOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOrderToHistory(order: LocalOrder): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getOrderHistory();
    const filtered = history.filter((o) => o.code !== order.code);
    const updated = [order, ...filtered].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silent fail
  }
}

export function updateOrderStatus(code: string, status: string): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getOrderHistory();
    const updated = history.map((o) =>
      o.code === code ? { ...o, status } : o
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silent fail
  }
}

const TERMINAL_STATUSES = ['delivered', 'cancelled', 'rejected'];

export function formatCode(code: string): string {
  return code.length === 6
    ? `${code.slice(0, 3)}-${code.slice(3)}`
    : code;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

// ─── Active Order Banner ─────────────────────────────────
// Floating banner when user has recent orders (< 2h old)
// Usage: <ActiveOrderBanner /> in public layout

export function ActiveOrderBanner() {
  const [recentOrder, setRecentOrder] = useState<LocalOrder | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  // ✅ FIX: Don't show banner if already on tracking or confirmation page
  const isOnTrackingPage = pathname?.startsWith('/pedido/') || pathname?.startsWith('/confirmar/');

  useEffect(() => {
    if (isOnTrackingPage) return; // Skip loading if we're already tracking

    const history = getOrderHistory();
    if (history.length === 0) return;

  // Show banner for orders less than 2 hours old AND not in terminal status
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const recent = history.find(
      (o) =>
        new Date(o.createdAt).getTime() > twoHoursAgo &&
        !TERMINAL_STATUSES.includes(o.status ?? '')
    );

    if (recent) {
      setRecentOrder(recent);
    }
  }, [isOnTrackingPage]);

  // ✅ Auto-hide after 8 seconds
  useEffect(() => {
    if (!recentOrder || dismissed || isOnTrackingPage) return;
    const timer = setTimeout(() => setDismissed(true), 8000);
    return () => clearTimeout(timer);
  }, [recentOrder, dismissed, isOnTrackingPage]);

  if (!recentOrder || dismissed || isOnTrackingPage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-4 left-4 right-4 z-40 max-w-[400px] mx-auto"
      >
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Accent bar */}
          <div
            className="h-1 w-full"
            style={{ backgroundColor: colors.brand.primary }}
          />

          <div className="p-3.5 flex items-center gap-3">
            {/* Animated dot */}
            <div className="relative shrink-0">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors.brand.primary }}
              />
              <div
                className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-75"
                style={{ backgroundColor: colors.brand.primary }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                Pedido {formatCode(recentOrder.code)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {recentOrder.restaurantName} · {timeAgo(recentOrder.createdAt)}
              </p>
            </div>

            {/* CTA */}
            <Link
              href={`/pedido/${recentOrder.code}`}
              className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-transform active:scale-95"
              style={{ backgroundColor: colors.brand.primary }}
            >
              Seguir
            </Link>

            {/* Dismiss */}
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Order History Section ───────────────────────────────
// Inline section for landing page showing recent orders
// Only renders if there are orders in localStorage

export function OrderHistorySection() {
  const [orders, setOrders] = useState<LocalOrder[]>([]);

  useEffect(() => {
    setOrders(getOrderHistory());
  }, []);

  if (orders.length === 0) return null;

  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const activeOrders = orders.filter(
    (o) =>
      new Date(o.createdAt).getTime() > twoHoursAgo &&
      !TERMINAL_STATUSES.includes(o.status ?? '')
  );
  const pastOrders = orders.filter(
    (o) =>
      new Date(o.createdAt).getTime() <= twoHoursAgo ||
      TERMINAL_STATUSES.includes(o.status ?? '')
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3 }}
      className="mt-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Package className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Mis pedidos
        </h3>
      </div>

      <div className="space-y-2">
        {/* Active orders (< 2h) */}
        {activeOrders.map((order) => (
          <Link
            key={order.code}
            href={`/pedido/${order.code}`}
            className="block"
          >
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 p-3 transition-colors"
            >
              {/* Animated dot = active */}
              <div className="relative shrink-0">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: colors.brand.primary }}
                />
                <div
                  className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-60"
                  style={{ backgroundColor: colors.brand.primary }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {order.restaurantName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-xs font-mono font-bold"
                    style={{ color: colors.brand.primary }}
                  >
                    {formatCode(order.code)}
                  </span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {timeAgo(order.createdAt)}
                  </span>
                </div>
              </div>

              {/* Price + arrow */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatPrice(order.totalCents)}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </motion.div>
          </Link>
        ))}

        {/* Past orders */}
        {pastOrders.map((order) => (
          <Link
            key={order.code}
            href={`/pedido/${order.code}`}
            className="block"
          >
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 transition-colors"
            >
              {/* Clock icon = past */}
              <Clock className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {order.restaurantName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {formatCode(order.code)}
                  </span>
                  <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {timeAgo(order.createdAt)}
                  </span>
                </div>
              </div>

              {/* Price + arrow */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {formatPrice(order.totalCents)}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Orders Header Button ────────────────────────────────
// Always-visible button in header with bottom sheet (portaled to body)
// Shows badge with active order count + pulsing indicator

export function OrdersHeaderButton() {
  const router = useRouter();
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Need mounted check for createPortal (SSR safety)
  useEffect(() => {
    setMounted(true);
  }, []);

  const loadOrders = useCallback(() => {
    setOrders(getOrderHistory());
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  useEffect(() => {
    if (isOpen) loadOrders();
  }, [isOpen, loadOrders]);

  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const activeOrders = orders.filter(
    (o) => new Date(o.createdAt).getTime() > twoHoursAgo
  );
  const pastOrders = orders.filter(
    (o) => new Date(o.createdAt).getTime() <= twoHoursAgo
  );
  const activeCount = activeOrders.length;
  const hasOrders = orders.length > 0;

  const handleOrderClick = (code: string) => {
    setIsOpen(false);
    router.push(`/pedido/${code}`);
  };

  return (
    <>
      {/* Button — always visible in header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Mis pedidos"
      >
        <Package
          className="h-[18px] w-[18px]"
          style={{ color: hasOrders ? colors.brand.primary : undefined }}
          strokeWidth={hasOrders ? 2.2 : 1.8}
        />
        <AnimatePresence>
          {activeCount > 0 && (
            <motion.span
              key="orders-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ backgroundColor: colors.brand.primary }}
            >
              {activeCount}
            </motion.span>
          )}
        </AnimatePresence>
        {activeCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: colors.brand.primary }}
          />
        )}
      </button>

      {/* Bottom sheet — portaled to document.body to escape header stacking context */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Overlay — click outside to close */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                  className="fixed inset-0 z-50 bg-black/50"
                />

                {/* Sheet — slides up from bottom, full width */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-gray-900"
                >
                  {/* Drag handle */}
                  <div className="flex justify-center pt-2 pb-1">
                    <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" style={{ color: colors.brand.primary }} />
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">
                        Mis pedidos
                      </h2>
                      {hasOrders && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          ({orders.length})
                        </span>
                      )}
                    </div>
                    {/* Minimize — green soft */}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                      aria-label="Minimizar"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Order list */}
                  <div className="overflow-y-auto max-h-[calc(85vh-80px)] px-4 py-3 space-y-2">
                    {!hasOrders ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Package className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
                          Aún no tienes pedidos
                        </p>
                        <p className="text-xs text-gray-300 dark:text-gray-600 text-center mt-1">
                          Tus pedidos aparecerán aquí
                        </p>
                      </div>
                    ) : (
                      <>
                        {activeOrders.length > 0 && (
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1 pt-1">
                            En curso
                          </p>
                        )}
                        {activeOrders.map((order) => (
                          <button
                            key={order.code}
                            onClick={() => handleOrderClick(order.code)}
                            className="flex w-full items-center gap-3 rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 p-3.5 text-left transition-colors active:scale-[0.98]"
                          >
                            <div className="relative shrink-0">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.brand.primary }} />
                              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-60" style={{ backgroundColor: colors.brand.primary }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{order.restaurantName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-mono font-bold" style={{ color: colors.brand.primary }}>{formatCode(order.code)}</span>
                                <span className="text-xs text-gray-400">·</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(order.createdAt)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(order.totalCents)}</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </button>
                        ))}

                        {pastOrders.length > 0 && (
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1 pt-2">
                            Anteriores
                          </p>
                        )}
                        {pastOrders.map((order) => (
                          <button
                            key={order.code}
                            onClick={() => handleOrderClick(order.code)}
                            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3.5 text-left transition-colors active:scale-[0.98]"
                          >
                            <Clock className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{order.restaurantName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{formatCode(order.code)}</span>
                                <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(order.createdAt)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{formatPrice(order.totalCents)}</span>
                              <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
