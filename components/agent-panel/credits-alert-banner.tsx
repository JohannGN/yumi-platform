'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAgent } from '@/components/agent-panel/agent-context';
import { createClient } from '@/lib/supabase/client';
import { creditThresholds } from '@/config/design-tokens';
import { AnimatePresence, motion } from 'framer-motion';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Banner persistente en layout del agente.
 * Muestra riders commission con saldo < S/100.
 * Solo visible si hasPermission('can_view_finance_daily').
 * Refresh cada 5 min.
 */
export function CreditsAlertBanner() {
  const { hasPermission, loading: agentLoading } = useAgent();
  const router = useRouter();
  const [criticalCount, setCriticalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const fetchLowBalanceRiders = useCallback(async () => {
    try {
      const supabase = createClient();

      // Riders commission
      const { data: commRiders } = await supabase
        .from('riders')
        .select('id')
        .eq('pay_type', 'commission');

      if (!commRiders || commRiders.length === 0) {
        setCriticalCount(0);
        return;
      }

      const commIds = commRiders.map((r) => r.id);

      // Credits bajo mínimo
      const { data: lowCredits } = await supabase
        .from('rider_credits')
        .select('rider_id')
        .in('rider_id', commIds)
        .lt('balance_cents', creditThresholds.minimum_cents);

      setCriticalCount(lowCredits?.length ?? 0);
    } catch (err) {
      console.error('CreditsAlertBanner: error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (agentLoading) return;
    if (!hasPermission('can_view_finance_daily')) {
      setLoading(false);
      return;
    }

    fetchLowBalanceRiders();
    const interval = setInterval(fetchLowBalanceRiders, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [agentLoading, hasPermission, fetchLowBalanceRiders]);

  // No render conditions
  if (!hasPermission('can_view_finance_daily')) return null;
  if (loading || agentLoading) return null;
  if (dismissed || criticalCount === 0) return null;

  return (
    <AnimatePresence>
      {criticalCount > 0 ? (
        <motion.div
          key="credits-alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mx-4 lg:mx-6 mb-3"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 truncate">
                {criticalCount} rider{criticalCount !== 1 ? 's' : ''} con créditos bajos
                <span className="hidden sm:inline">{' '}({'<'} S/100)</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => router.push('/agente/creditos')}
                className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline transition-colors"
              >
                Ver
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 rounded-md text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
                title="Ocultar alerta"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
