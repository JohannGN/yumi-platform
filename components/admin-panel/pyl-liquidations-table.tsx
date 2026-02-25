'use client';

// ============================================================
// PylLiquidationsTable — Tabla de liquidaciones a restaurantes
// Registro detallado de pagos para SUNAT
// Chat: EGRESOS-3 + Vista Contable
// ============================================================

import { Store } from 'lucide-react';
import { formatCurrency, formatDateShort } from '@/config/tokens';
import { liquidationPaymentMethodLabels } from '@/config/design-tokens';
import type { PylSummary } from '@/types/pyl';

interface PylLiquidationsTableProps {
  summary: PylSummary;
}

export function PylLiquidationsTable({ summary }: PylLiquidationsTableProps) {
  const { liquidations_by_restaurant } = summary.accounting;

  if (liquidations_by_restaurant.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Store className="w-5 h-5 text-blue-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Liquidaciones a restaurantes
          </h3>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No hay liquidaciones registradas en el período seleccionado.
        </p>
      </div>
    );
  }

  // Group by restaurant for subtotals
  const byRestaurant = new Map<string, { name: string; total: number; count: number }>();
  for (const liq of liquidations_by_restaurant) {
    const existing = byRestaurant.get(liq.restaurant_id) || { name: liq.restaurant_name, total: 0, count: 0 };
    existing.total += liq.amount_cents;
    existing.count += 1;
    byRestaurant.set(liq.restaurant_id, existing);
  }

  const restaurantTotals = Array.from(byRestaurant.entries())
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Liquidaciones a restaurantes
            </h3>
          </div>
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            Total: {formatCurrency(summary.accounting.restaurant_liquidations_cents)}
          </span>
        </div>

        {/* Summary by restaurant */}
        <div className="mt-3 flex flex-wrap gap-2">
          {restaurantTotals.map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300"
            >
              {r.name}: {formatCurrency(r.total)} ({r.count})
            </span>
          ))}
        </div>
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Restaurante
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Método
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                Monto
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {liquidations_by_restaurant.map((liq, idx) => (
              <tr
                key={`${liq.restaurant_id}-${liq.date}-${idx}`}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {liq.restaurant_name}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {formatDateShort(liq.date)}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {liquidationPaymentMethodLabels[liq.payment_method] || liq.payment_method}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">
                  {formatCurrency(liq.amount_cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
