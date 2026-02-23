'use client';

import { Banknote, ExternalLink, FileCheck } from 'lucide-react';
import {
  liquidationPaymentMethodLabels,
  formatCurrency,
  formatDateShort,
} from '@/config/tokens';

interface Liquidation {
  id: string;
  date: string;
  amount_cents: number;
  payment_method: string;
  proof_url: string | null;
  created_at: string;
}

interface RestaurantLiquidationHistoryProps {
  liquidations: Liquidation[] | null;
}

export function RestaurantLiquidationHistory({ liquidations }: RestaurantLiquidationHistoryProps) {
  if (!liquidations || liquidations.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
        <Banknote className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Aún no has recibido liquidaciones.
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
          Las liquidaciones se realizan periódicamente por tu agente YUMI.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {liquidations.map((liq) => {
        const methodLabel =
          liquidationPaymentMethodLabels[liq.payment_method] || liq.payment_method;

        return (
          <div
            key={liq.id}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDateShort(liq.date)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Vía {methodLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">
                  +{formatCurrency(liq.amount_cents)}
                </p>
                {liq.proof_url && (
                  <a
                    href={liq.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Ver comprobante"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
