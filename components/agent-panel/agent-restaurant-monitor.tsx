'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  AlertTriangle,
  Phone,
  RefreshCw,
  Loader2,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { useAgent } from '@/components/agent-panel/agent-context';
import type { AgentRestaurant } from '@/types/agent-panel';

interface Props {
  onSelectRestaurant: (restaurant: AgentRestaurant) => void;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Abiertos' },
  { value: 'closed', label: 'Cerrados' },
  { value: 'alert', label: 'Con alerta' },
];

export function AgentRestaurantMonitor({ onSelectRestaurant }: Props) {
  const { activeCityId, hasPermission } = useAgent();
  const [restaurants, setRestaurants] = useState<AgentRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const canToggle = hasPermission('can_toggle_restaurants');

  const fetchRestaurants = useCallback(async () => {
    if (!activeCityId) return;
    try {
      const res = await fetch(
        `/api/agent/restaurants?city_id=${activeCityId}&status=${statusFilter}`
      );
      if (res.ok) {
        const data: AgentRestaurant[] = await res.json();
        setRestaurants(data);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [activeCityId, statusFilter]);

  // Initial + polling 60s
  useEffect(() => {
    setLoading(true);
    fetchRestaurants();
    const interval = setInterval(fetchRestaurants, 60000);
    return () => clearInterval(interval);
  }, [fetchRestaurants]);

  async function handleToggle(restaurant: AgentRestaurant) {
    if (!canToggle) return;
    setToggling(restaurant.id);
    try {
      const res = await fetch(`/api/agent/restaurants/${restaurant.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: !restaurant.is_open }),
      });
      if (res.ok) {
        setRestaurants((prev) =>
          prev.map((r) =>
            r.id === restaurant.id
              ? { ...r, is_open: !r.is_open, alert: r.should_be_open && r.is_open }
              : r
          )
        );
      }
    } catch {
      /* silent */
    } finally {
      setToggling(null);
    }
  }

  const alertCount = restaurants.filter((r) => r.alert).length;

  if (loading && restaurants.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                statusFilter === f.value
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
              ].join(' ')}
            >
              {f.label}
              {f.value === 'alert' && alertCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {alertCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {restaurants.length} restaurante{restaurants.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => { setLoading(true); fetchRestaurants(); }}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {restaurants.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <Store className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            No hay restaurantes que coincidan
          </div>
        ) : (
          restaurants.map((r) => (
            <div
              key={r.id}
              className={[
                'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                r.alert
                  ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
              ].join(' ')}
            >
              {/* Alert indicator */}
              <div className="flex-shrink-0">
                {r.alert ? (
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center animate-pulse">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                ) : (
                  <div className={[
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    r.is_open
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-gray-100 dark:bg-gray-800',
                  ].join(' ')}>
                    <Store className={[
                      'w-5 h-5',
                      r.is_open ? 'text-green-600' : 'text-gray-400',
                    ].join(' ')} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{r.name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{r.category_name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={[
                    'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                    r.is_open
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500',
                  ].join(' ')}>
                    {r.is_open ? 'Abierto' : 'Cerrado'}
                  </span>
                  {r.alert && (
                    <span className="text-[10px] font-medium text-red-600 dark:text-red-400">
                      Debería estar abierto
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">{r.total_orders} pedidos</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* WhatsApp */}
                {r.whatsapp && (
                  <a
                    href={`https://wa.me/${r.whatsapp.replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    title="WhatsApp"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}

                {/* Toggle */}
                {canToggle && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggle(r); }}
                    disabled={toggling === r.id}
                    className="h-8 flex items-center gap-1 px-2 rounded-lg text-xs font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                    title={r.is_open ? 'Cerrar restaurante' : 'Abrir restaurante'}
                  >
                    {toggling === r.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : r.is_open ? (
                      <ToggleRight className="w-5 h-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                )}

                {/* View menu */}
                <button
                  onClick={() => onSelectRestaurant(r)}
                  className="h-8 flex items-center gap-1 px-2 rounded-lg text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                  title="Ver menú"
                >
                  <span className="hidden sm:inline">Menú</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
