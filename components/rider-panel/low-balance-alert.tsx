'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useRider } from './rider-context';
import { useRiderCredits } from '@/hooks/use-rider-credits';
import { creditThresholds } from '@/config/tokens';

export function LowBalanceAlert() {
  const router = useRouter();
  const { rider } = useRider();
  const [dismissed, setDismissed] = useState(false);

  // #117: fixed_salary → nada
  if (!rider || rider.pay_type === 'fixed_salary') return null;

  const { data, isLoading } = useRiderCredits(rider.id, rider.pay_type === 'commission');

  if (isLoading || !data || dismissed) return null;

  const balance = data.balance_cents;

  // ≥ S/150 → no mostrar
  if (balance >= creditThresholds.healthy_cents) return null;

  // #118: < S/100 → rojo
  const isCritical = balance < creditThresholds.minimum_cents;

  return (
    <AnimatePresence>
      {true ? (
        <motion.div
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`mx-4 mb-3 rounded-xl border px-3 py-2.5 ${
            isCritical
              ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-sm mt-0.5">{isCritical ? '🚫' : '💰'}</span>
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs font-bold ${
                  isCritical
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {isCritical
                  ? 'No puedes recibir pedidos en efectivo'
                  : 'Saldo bajo — recarga pronto'}
              </p>
              <p
                className={`text-[11px] mt-0.5 ${
                  isCritical
                    ? 'text-red-600/80 dark:text-red-400/70'
                    : 'text-amber-600/80 dark:text-amber-400/70'
                }`}
              >
                {isCritical
                  ? 'Recarga para volver a recibir pedidos en efectivo.'
                  : 'Evita interrupciones recargando créditos.'}
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={() => setDismissed(true)}
              className="p-1 -m-1 rounded-md active:bg-black/5 dark:active:bg-white/5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Recharge CTA */}
          <button
            onClick={() => router.push('/rider/recargar')}
            className={`mt-2 w-full py-2 rounded-lg text-xs font-bold text-white active:scale-[0.98] transition-transform ${
              isCritical ? 'bg-red-500' : 'bg-amber-500'
            }`}
          >
            Recargar ahora →
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
