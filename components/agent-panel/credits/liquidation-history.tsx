'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgent } from '@/components/agent-panel/agent-context';
import {
  liquidationPaymentMethodLabels,
  formatCurrency,
  formatDate,
} from '@/config/design-tokens';

interface LiquidationRow {
  id: string;
  restaurant_id: string;
  restaurant_name?: string;
  date: string;
  amount_cents: number;
  payment_method: 'yape' | 'plin' | 'transfer' | 'cash';
  proof_url: string | null;
  notes: string | null;
  created_at: string;
}

interface RestaurantOption {
  id: string;
  name: string;
}

export function LiquidationHistory({ refreshKey }: { refreshKey?: number }) {
  const { activeCityId } = useAgent();

  const [liquidations, setLiquidations] = useState<LiquidationRow[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [filterRestaurantId, setFilterRestaurantId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Fetch restaurants for filter dropdown
  useEffect(() => {
    if (!activeCityId) return;
    fetch(`/api/agent/restaurants?city_id=${activeCityId}`)
      .then(r => r.json())
      .then(json => {
        const list = (json.data || json || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: r.name as string,
        }));
        setRestaurants(list);
      })
      .catch(() => setRestaurants([]));
  }, [activeCityId]);

  // Fetch liquidations
  const fetchLiquidations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterRestaurantId) params.set('restaurant_id', filterRestaurantId);

      const res = await fetch(`/api/agent/liquidations?${params}`);
      if (!res.ok) throw new Error('Error');
      const json = await res.json();
      setLiquidations(json.data || json || []);
      setTotalPages(json.total_pages || 1);
    } catch {
      setLiquidations([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterRestaurantId]);

  useEffect(() => { fetchLiquidations(); }, [fetchLiquidations, refreshKey]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filterRestaurantId]);

  const getRestaurantName = (rid: string) =>
    restaurants.find(r => r.id === rid)?.name || 'Restaurante';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header + filtro */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Historial de liquidaciones
        </h3>
        <select
          value={filterRestaurantId}
          onChange={e => setFilterRestaurantId(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 max-w-xs"
        >
          <option value="">Todos los restaurantes</option>
          {restaurants.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Restaurante</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Fecha</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Monto</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Método</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : liquidations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                  No hay liquidaciones registradas
                </td>
              </tr>
            ) : (
              liquidations.map(liq => (
                <tr key={liq.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                    {liq.restaurant_name || getRestaurantName(liq.restaurant_id)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {formatDate(liq.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-semibold tabular-nums text-right">
                    {formatCurrency(liq.amount_cents)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {liquidationPaymentMethodLabels[liq.payment_method] || liq.payment_method}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {liq.proof_url ? (
                      <a
                        href={liq.proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-500 hover:text-orange-600 dark:text-orange-400 text-xs font-medium"
                      >
                        Ver foto
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
