'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RiderProfile, RiderCurrentOrder } from '@/types/rider-panel';

interface RiderContextValue {
  rider: RiderProfile | null;
  currentOrder: RiderCurrentOrder | null;
  isLoading: boolean;
  isOrderLoading: boolean;
  refetchRider: () => Promise<void>;
  refetchOrder: () => Promise<void>;
  setCurrentOrder: (order: RiderCurrentOrder | null) => void;
}

const RiderContext = createContext<RiderContextValue | null>(null);

export function useRider(): RiderContextValue {
  const ctx = useContext(RiderContext);
  if (!ctx) throw new Error('useRider must be used within RiderContextProvider');
  return ctx;
}

export function RiderContextProvider({ children }: { children: ReactNode }) {
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [currentOrder, setCurrentOrder] = useState<RiderCurrentOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof createClient>['channel'] extends (name: string) => infer R ? R : never>(null);

  // Fetch rider profile
  const refetchRider = useCallback(async () => {
    try {
      const res = await fetch('/api/rider/me');
      if (!res.ok) throw new Error('Failed to fetch rider');
      const data = await res.json();
      setRider(data);
    } catch (err) {
      console.error('Error fetching rider:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch current order
  const refetchOrder = useCallback(async () => {
    if (!rider?.id) return;
    setIsOrderLoading(true);
    try {
      const res = await fetch('/api/rider/current-order');
      if (!res.ok) {
        if (res.status === 404) {
          setCurrentOrder(null);
          return;
        }
        throw new Error('Failed to fetch order');
      }
      const data = await res.json();
      setCurrentOrder(data);
    } catch (err) {
      console.error('Error fetching current order:', err);
    } finally {
      setIsOrderLoading(false);
    }
  }, [rider?.id]);

  // Initial load
  useEffect(() => {
    refetchRider();
  }, [refetchRider]);

  // Fetch order when rider loads
  useEffect(() => {
    if (rider?.id) {
      refetchOrder();
    }
  }, [rider?.id, refetchOrder]);

  // Realtime: listen for rider assignment changes
  useEffect(() => {
    if (!rider?.id) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`rider-assignment-${rider.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'riders',
          filter: `id=eq.${rider.id}`,
        },
        (payload) => {
          const newData = payload.new as Record<string, unknown>;
          const oldData = payload.old as Record<string, unknown>;

          // New order assigned
          if (newData.current_order_id && !oldData.current_order_id) {
            refetchOrder();
            playAssignmentSound();
            // Vibrate if supported
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 200]);
            }
          }

          // Order completed/unassigned
          if (!newData.current_order_id && oldData.current_order_id) {
            setCurrentOrder(null);
          }

          // Update rider state
          setRider((prev) =>
            prev
              ? {
                  ...prev,
                  is_online: newData.is_online as boolean,
                  is_available: newData.is_available as boolean,
                  current_order_id: newData.current_order_id as string | null,
                }
              : null
          );
        }
      )
      .subscribe();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channelRef.current = channel as any;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rider?.id, refetchOrder]);

  // Also listen to order status changes if we have an active order
  useEffect(() => {
    if (!currentOrder?.id) return;

    const supabase = createClient();

    const orderChannel = supabase
      .channel(`rider-order-${currentOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${currentOrder.id}`,
        },
        (payload) => {
          const newData = payload.new as Record<string, unknown>;
          setCurrentOrder((prev) =>
            prev
              ? {
                  ...prev,
                  status: newData.status as RiderCurrentOrder['status'],
                  actual_payment_method: newData.actual_payment_method as RiderCurrentOrder['actual_payment_method'],
                  delivery_proof_url: newData.delivery_proof_url as string | null,
                  payment_proof_url: newData.payment_proof_url as string | null,
                }
              : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [currentOrder?.id]);

  // Polling fallback 15s
  useEffect(() => {
    if (!rider?.id) return;

    pollingRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refetchOrder();
      }
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refetchOrder();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [rider?.id, refetchOrder]);

  return (
    <RiderContext.Provider
      value={{
        rider,
        currentOrder,
        isLoading,
        isOrderLoading,
        refetchRider,
        refetchOrder,
        setCurrentOrder,
      }}
    >
      {children}
    </RiderContext.Provider>
  );
}

// === Sound notification for new assignment ===
function playAssignmentSound() {
  try {
    const audioCtx = new AudioContext();

    // Two-tone alert: ascending
    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioCtx.currentTime;
    playTone(587, now, 0.2);        // D5
    playTone(784, now + 0.2, 0.2);  // G5
    playTone(988, now + 0.4, 0.3);  // B5

    setTimeout(() => audioCtx.close(), 2000);
  } catch {
    // Silently fail if audio isn't available
  }
}
