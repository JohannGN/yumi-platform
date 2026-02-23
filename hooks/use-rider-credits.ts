'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CreditTransaction, CreditHealthStatus } from '@/types/credit-types';

// === Response shape from GET /api/rider/credits ===
export interface RiderCreditsData {
  balance_cents: number;
  status: CreditHealthStatus;
  can_receive_cash_orders: boolean;
  shift_summary: {
    deliveries: number;
    total_food_debit_cents: number;
    total_commission_debit_cents: number;
    total_earned_delivery_cents: number;
    cash_collected_cents: number;
    digital_collected_cents: number;
  };
  recent_transactions: CreditTransaction[];
}

interface UseRiderCreditsReturn {
  data: RiderCreditsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook centralizado para créditos del rider.
 * - Fetch inicial desde GET /api/rider/credits
 * - Realtime: rider_credits UPDATE → actualiza saldo
 * - Realtime: credit_transactions INSERT → refetch completo
 * - Cleanup: removeChannel en return
 *
 * @param riderId - ID del rider (de riders table, NO user_id)
 * @param enabled - false si rider es fixed_salary → no hace nada
 */
export function useRiderCredits(riderId: string | null, enabled: boolean): UseRiderCreditsReturn {
  const [data, setData] = useState<RiderCreditsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchCredits = useCallback(async () => {
    if (!enabled || !riderId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/rider/credits');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al cargar créditos');
      }
      const json: RiderCreditsData = await res.json();
      if (isMounted.current) {
        setData(json);
        setError(null);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [riderId, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Realtime subscriptions
  useEffect(() => {
    if (!enabled || !riderId) return;

    const supabase = createClient();

    // Canal 1: Cambios en rider_credits (saldo actualizado por processDeliveryCredits)
    const creditsChannel = supabase
      .channel(`rider-credits-${riderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rider_credits',
          filter: `rider_id=eq.${riderId}`,
        },
        (payload) => {
          const newRow = payload.new as { balance_cents: number };
          setData((prev) => {
            if (!prev) return prev;
            // Actualizar saldo + recalcular status
            const balance = newRow.balance_cents;
            let status: CreditHealthStatus;
            if (balance >= 15000) status = 'healthy';
            else if (balance >= 10000) status = 'warning';
            else if (balance > 0) status = 'critical';
            else status = 'blocked';

            return {
              ...prev,
              balance_cents: balance,
              status,
              can_receive_cash_orders: balance >= 10000,
            };
          });
        }
      )
      .subscribe();

    // Canal 2: Nuevas transacciones → refetch completo para actualizar shift_summary
    const txChannel = supabase
      .channel(`rider-credit-tx-${riderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'credit_transactions',
          filter: `entity_id=eq.${riderId}`,
        },
        () => {
          // Refetch para obtener shift_summary actualizado
          fetchCredits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(creditsChannel);
      supabase.removeChannel(txChannel);
    };
  }, [riderId, enabled, fetchCredits]);

  // Cleanup ref on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchCredits,
  };
}
