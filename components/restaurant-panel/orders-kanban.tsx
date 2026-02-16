'use client';

// ============================================================
// Orders Kanban — 4 columns with Supabase Realtime
// Columns: Pendientes → Confirmados → Preparando → Listos
// Chat 5 — Fragment 3/7
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { createBrowserClient } from '@supabase/ssr';
import { useRestaurant } from '@/components/restaurant-panel';
import { OrderCardPanel } from './order-card-panel';
import { OrderDetailSheet } from './order-detail-sheet';
import { RejectOrderModal } from './reject-order-modal';
import type { PanelOrder } from '@/types/restaurant-panel';

const KANBAN_STATUSES = [
  'pending_confirmation',
  'confirmed',
  'preparing',
  'ready',
] as const;

const COLUMN_CONFIG: Record<string, { title: string; emoji: string; color: string; bgColor: string }> = {
  pending_confirmation: {
    title: 'Pendientes',
    emoji: '🔔',
    color: 'border-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/10',
  },
  confirmed: {
    title: 'Confirmados',
    emoji: '✅',
    color: 'border-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/10',
  },
  preparing: {
    title: 'Preparando',
    emoji: '🍳',
    color: 'border-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/10',
  },
  ready: {
    title: 'Listos',
    emoji: '🎉',
    color: 'border-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/10',
  },
};

export function OrdersKanban() {
  const { restaurant } = useRestaurant();
  const [orders, setOrders] = useState<PanelOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Detail sheet
  const [detailOrder, setDetailOrder] = useState<PanelOrder | null>(null);

  // Reject modal
  const [rejectingOrder, setRejectingOrder] = useState<PanelOrder | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Sound ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  // ─── Fetch orders ─────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    try {
      const statusParam = KANBAN_STATUSES.join(',');
      const res = await fetch(`/api/restaurant/orders?status=${statusParam}`);
      if (res.ok) {
        const data = await res.json();
        const newOrders: PanelOrder[] = data.orders || [];

        // Check for new pending orders → play sound
        const newPending = newOrders.filter(
          (o) =>
            o.status === 'pending_confirmation' &&
            !prevOrderIdsRef.current.has(o.id)
        );

        if (newPending.length > 0 && prevOrderIdsRef.current.size > 0) {
          playNotificationSound();
        }

        prevOrderIdsRef.current = new Set(newOrders.map((o) => o.id));
        setOrders(newOrders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Initial load ─────────────────────────────────────────

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ─── Supabase Realtime ────────────────────────────────────

  useEffect(() => {
    if (!restaurant?.id) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel('restaurant-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          // Refetch on any order change
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, fetchOrders]);

  // ─── Sound notification ───────────────────────────────────

  function playNotificationSound() {
    try {
      if (!audioRef.current) {
        // Create a simple beep using Web Audio API
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gain.gain.value = 0.3;
        oscillator.start();
        // Double beep
        setTimeout(() => { gain.gain.value = 0; }, 150);
        setTimeout(() => { gain.gain.value = 0.3; }, 250);
        setTimeout(() => {
          oscillator.stop();
          ctx.close();
        }, 400);
      }
    } catch {
      // Audio might not be available
    }
  }

  // ─── Order actions ────────────────────────────────────────

  const updateOrderStatus = useCallback(async (
    orderId: string,
    newStatus: string,
    extra?: { rejection_reason?: string; rejection_notes?: string }
  ) => {
    setActioningId(orderId);
    try {
      const res = await fetch(`/api/restaurant/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });

      if (res.ok) {
        // Optimistic update
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: newStatus } : o
          )
        );
      } else {
        const err = await res.json();
        alert(err.error || 'Error al actualizar');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setActioningId(null);
    }
  }, []);

  const handleAccept = useCallback((orderId: string) => {
    updateOrderStatus(orderId, 'confirmed');
  }, [updateOrderStatus]);

  const handleReject = useCallback((orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) setRejectingOrder(order);
  }, [orders]);

  const handleConfirmReject = useCallback(async (reason: string, notes: string) => {
    if (!rejectingOrder) return;
    setIsRejecting(true);
    await updateOrderStatus(rejectingOrder.id, 'rejected', {
      rejection_reason: reason,
      rejection_notes: notes || undefined,
    });
    setIsRejecting(false);
    setRejectingOrder(null);
  }, [rejectingOrder, updateOrderStatus]);

  const handlePreparing = useCallback((orderId: string) => {
    updateOrderStatus(orderId, 'preparing');
  }, [updateOrderStatus]);

  const handleReady = useCallback((orderId: string) => {
    updateOrderStatus(orderId, 'ready');
  }, [updateOrderStatus]);

  // ─── Group by status ─────────────────────────────────────

  const ordersByStatus = KANBAN_STATUSES.reduce(
    (acc, status) => {
      acc[status] = orders.filter((o) => o.status === status);
      return acc;
    },
    {} as Record<string, PanelOrder[]>
  );

  // ─── Render ───────────────────────────────────────────────

  return (
    <>
      {/* Kanban grid — horizontal scroll on mobile */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none md:grid md:grid-cols-4 md:overflow-x-visible min-h-[calc(100vh-12rem)]">
        {KANBAN_STATUSES.map((status) => {
          const config = COLUMN_CONFIG[status];
          const columnOrders = ordersByStatus[status] || [];

          return (
            <div
              key={status}
              className="flex-shrink-0 w-[80vw] md:w-auto snap-center flex flex-col"
            >
              {/* Column header */}
              <div
                className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl border-t-4 ${config.color} ${config.bgColor}`}
              >
                <span className="text-lg">{config.emoji}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {config.title}
                </span>
                {columnOrders.length > 0 && (
                  <span className="ml-auto text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                    {columnOrders.length}
                  </span>
                )}
              </div>

              {/* Column body */}
              <div className={`flex-1 ${config.bgColor} bg-opacity-30 rounded-b-xl p-2.5 space-y-3 min-h-[200px]`}>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : columnOrders.length > 0 ? (
                  <AnimatePresence mode="popLayout">
                    {columnOrders.map((order) => (
                      <OrderCardPanel
                        key={order.id}
                        order={order}
                        onAccept={handleAccept}
                        onReject={handleReject}
                        onPreparing={handlePreparing}
                        onReady={handleReady}
                        onViewDetail={setDetailOrder}
                        isActioning={actioningId === order.id}
                      />
                    ))}
                  </AnimatePresence>
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-600">
                    <p className="text-xs text-center">Sin pedidos</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Order detail sheet */}
      <OrderDetailSheet
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
      />

      {/* Reject modal */}
      <RejectOrderModal
        isOpen={!!rejectingOrder}
        orderCode={rejectingOrder?.code || ''}
        onConfirm={handleConfirmReject}
        onCancel={() => setRejectingOrder(null)}
        isLoading={isRejecting}
      />
    </>
  );
}
