'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/config/design-tokens';
import type { CashInFieldResponse } from '@/types/admin-panel';

export function CashInFieldTable() {
  const [data, setData] = useState<CashInFieldResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/financial/cash-in-field');
      if (!res.ok) throw new Error('Error fetching');
      const json = await res.json() as CashInFieldResponse;
      setData(json);
      setLastUpdated(new Date());
    } catch {
      // Silencioso — mantener datos anteriores
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => { void fetchData(); }, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Efectivo en calle
        </h3>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              {lastUpdated.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => void fetchData()}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Total */}
      {data && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Total en calle</p>
          <p className="text-xl font-bold text-orange-700 dark:text-orange-300 tabular-nums">
            {formatCurrency(data.total_cash_in_field_cents)}
          </p>
        </div>
      )}

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3 py-2">
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded ml-auto" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : !data?.riders.length ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Wifi className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Sin efectivo en calle ahora mismo
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                <th className="text-left pb-2 font-medium">Rider</th>
                <th className="text-center pb-2 font-medium">Activos</th>
                <th className="text-right pb-2 font-medium">Total S/</th>
              </tr>
            </thead>
            <tbody>
              {data.riders.map(rider => (
                <tr
                  key={rider.rider_id}
                  className="border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                >
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          rider.is_online ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[100px]">
                        {rider.rider_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 ml-3.5 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {rider.delivered_today_count} entregados
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-center">
                    {rider.active_orders_count > 0 ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold">
                        {rider.active_orders_count}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                      {formatCurrency(rider.total_cash_cents)}
                    </span>
                    {rider.is_online ? (
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <Wifi className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-600 dark:text-green-400">En turno</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <WifiOff className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">Sin turno</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
        Actualiza automaticamente cada 60 seg
      </p>
    </div>
  );
}
