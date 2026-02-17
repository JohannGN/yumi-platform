'use client';

// ============================================================
// OrdersKanban — Panel de pedidos del restaurante
// FIX 2: Realtime escucha INSERT + UPDATE (antes solo UPDATE)
// FIX 4: Polling fallback 15s, pausa cuando tab no visible
// SEGURIDAD: Sanitiza datos de Realtime con sanitizeOrderForRestaurant
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { sanitizeOrderForRestaurant } from '@/lib/utils/sanitize-order';
import OrderCardPanel, { type SanitizedOrder } from './order-card-panel';
import OrderDetailSheet from './order-detail-sheet';
import { RejectOrderModal } from './reject-order-modal';
import { ConfirmModal } from './confirm-modal';
import { useRestaurant } from './restaurant-context';

// Columnas del kanban para desktop
const KANBAN_COLUMNS = [
  {
    key: 'pending',
    label: 'Nuevos',
    statuses: ['pending_confirmation', 'awaiting_confirmation'],
    color: '#8B5CF6',
  },
  {
    key: 'active',
    label: 'En preparación',
    statuses: ['confirmed', 'preparing'],
    color: '#F59E0B',
  },
  {
    key: 'ready',
    label: 'Listos',
    statuses: ['ready', 'assigned_rider', 'picked_up', 'in_transit'],
    color: '#06B6D4',
  },
] as const;

// Tabs para mobile (mismas columnas)
const MOBILE_TABS = KANBAN_COLUMNS.map(col => ({
  key: col.key,
  label: col.label,
  statuses: col.statuses,
  color: col.color,
}));

// Sonido de notificación usando Web Audio API
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1); // ~C#6
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch {
    // Silently fail if audio not supported
  }
}

export default function OrdersKanban() {
  const { restaurant } = useRestaurant();
  const restaurantId = restaurant?.id;
  const [orders, setOrders] = useState<SanitizedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [selectedOrder, setSelectedOrder] = useState<SanitizedOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    orderId: string;
    action: string;
    title: string;
    message: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(true);

  // ═══════════════════════════════════════════════════
  // Fetch initial orders
  // ═══════════════════════════════════════════════════
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/restaurant/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════
  // Initial load
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ═══════════════════════════════════════════════════
  // FIX 2: Supabase Realtime — INSERT + UPDATE
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (!restaurantId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`restaurant-orders-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT + UPDATE + DELETE
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // 🔒 Sanitizar antes de guardar en estado
            const sanitized = sanitizeOrderForRestaurant(
              payload.new as Record<string, unknown>
            ) as unknown as SanitizedOrder;

            setOrders((prev) => {
              // Evitar duplicados
              if (prev.some((o) => o.id === sanitized.id)) return prev;
              return [sanitized, ...prev];
            });

            // 🔔 Notificación sonora
            playNotificationSound();
          } else if (payload.eventType === 'UPDATE') {
            const sanitized = sanitizeOrderForRestaurant(
              payload.new as Record<string, unknown>
            ) as unknown as SanitizedOrder;

            setOrders((prev) =>
              prev.map((o) => (o.id === sanitized.id ? sanitized : o))
            );

            // Actualizar detalle si está abierto
            setSelectedOrder((prev) =>
              prev?.id === sanitized.id ? sanitized : prev
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setOrders((prev) => prev.filter((o) => o.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  // ═══════════════════════════════════════════════════
  // FIX 4: Polling fallback (15s), pausa cuando tab oculta
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === 'visible';

      if (isVisibleRef.current) {
        // Tab visible de nuevo → fetch inmediato + reiniciar polling
        fetchOrders();
        startPolling();
      } else {
        // Tab oculta → pausar polling
        stopPolling();
      }
    };

    const startPolling = () => {
      stopPolling();
      pollingRef.current = setInterval(() => {
        if (isVisibleRef.current) {
          fetchOrders();
        }
      }, 15000); // 15 segundos
    };

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    startPolling();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopPolling();
    };
  }, [fetchOrders]);

  // ═══════════════════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════════════════
  const updateOrderStatus = async (orderId: string, newStatus: string, extra?: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/restaurant/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar');
      }

      // Realtime se encargará de actualizar el estado,
      // pero hacemos un update optimista también
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );

      // Cerrar modales
      setConfirmAction(null);
      setRejectOrderId(null);
      setDetailOpen(false);
    } catch (error) {
      console.error('Error updating order:', error);
      alert(error instanceof Error ? error.message : 'Error al actualizar pedido');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = (orderId: string) => {
    setConfirmAction({
      orderId,
      action: 'confirmed',
      title: 'Aceptar pedido',
      message: '¿Confirmar que aceptas este pedido? Comenzará la preparación.',
    });
  };

  const handleReject = (orderId: string) => {
    setRejectOrderId(orderId);
  };

  const handleRejectConfirm = (reason: string, notes?: string) => {
    if (!rejectOrderId) return;
    updateOrderStatus(rejectOrderId, 'rejected', {
      rejection_reason: reason,
      rejection_notes: notes,
    });
  };

  const handleMarkPreparing = (orderId: string) => {
    updateOrderStatus(orderId, 'preparing');
  };

  const handleMarkReady = (orderId: string) => {
    setConfirmAction({
      orderId,
      action: 'ready',
      title: 'Marcar como listo',
      message: '¿El pedido está listo para que el rider lo recoja?',
    });
  };

  const handleViewDetail = (order: SanitizedOrder) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  // ═══════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════
  const getOrdersForColumn = (statuses: readonly string[]) =>
    orders.filter((o) => statuses.includes(o.status));

  const getCountForColumn = (statuses: readonly string[]) =>
    orders.filter((o) => statuses.includes(o.status)).length;

  // ═══════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════
  if (loading || !restaurantId) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* ═══ MOBILE: Tabs ═══ */}
      <div className="md:hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-10">
          {MOBILE_TABS.map((tab) => {
            const count = getCountForColumn(tab.statuses);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 px-2 text-sm font-medium text-center relative transition-colors ${
                  isActive
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: tab.color }}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: tab.color }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-4 space-y-3">
          {MOBILE_TABS.filter((tab) => tab.key === activeTab).map((tab) => {
            const columnOrders = getOrdersForColumn(tab.statuses);
            return (
              <div key={tab.key}>
                {columnOrders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    <p className="text-lg">Sin pedidos</p>
                    <p className="text-sm mt-1">Los pedidos nuevos aparecerán aquí</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {columnOrders.map((order) => (
                      <div key={order.id} className="mb-3">
                        <OrderCardPanel
                          order={order}
                          onAccept={handleAccept}
                          onReject={handleReject}
                          onMarkReady={handleMarkReady}
                          onViewDetail={handleViewDetail}
                        />
                      </div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ DESKTOP: Grid 3 columnas ═══ */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 p-4">
        {KANBAN_COLUMNS.map((col) => {
          const columnOrders = getOrdersForColumn(col.statuses);
          return (
            <div key={col.key} className="min-h-[200px]">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {col.label}
                </h3>
                {columnOrders.length > 0 && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: col.color }}
                  >
                    {columnOrders.length}
                  </span>
                )}
              </div>

              {/* Column content */}
              <div className="space-y-3">
                {columnOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    Sin pedidos
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {columnOrders.map((order) => (
                      <OrderCardPanel
                        key={order.id}
                        order={order}
                        onAccept={handleAccept}
                        onReject={handleReject}
                        onMarkReady={handleMarkReady}
                        onViewDetail={handleViewDetail}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Modals ═══ */}

      {/* Order detail sheet */}
      <OrderDetailSheet
        order={selectedOrder}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onAccept={handleAccept}
        onReject={handleReject}
        onMarkReady={handleMarkReady}
        onMarkPreparing={handleMarkPreparing}
      />

 {rejectOrderId && (
        <RejectOrderModal
          isOpen={!!rejectOrderId}
          orderCode={orders.find(o => o.id === rejectOrderId)?.code || ''}
          onCancel={() => setRejectOrderId(null)}
          onConfirm={handleRejectConfirm}
          isLoading={actionLoading}
        />
      )}

      {/* Confirm action modal */}
      {confirmAction && (
        <ConfirmModal
          isOpen={!!confirmAction}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel="Confirmar"
          onConfirm={() => updateOrderStatus(confirmAction.orderId, confirmAction.action)}
          onCancel={() => setConfirmAction(null)}
          isLoading={actionLoading}
        />
      )}
    </>
  );
}
