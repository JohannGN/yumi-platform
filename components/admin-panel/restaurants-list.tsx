'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Store, Star, TrendingUp, Circle, RefreshCw } from 'lucide-react';
import { AdminRestaurant } from '@/types/admin-panel';
import { formatCurrency } from '@/config/tokens';

interface RestaurantsListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateClick: () => void;
  isOwner: boolean;
  userCityId: string | null;
}

interface FilterState {
  search: string;
  city_id: string;
  category_id: string;
  is_active: string;
}

interface CityOption { id: string; name: string }
interface CategoryOption { id: string; name: string; emoji: string | null }

export default function RestaurantsList({
  selectedId,
  onSelect,
  onCreateClick,
  isOwner,
  userCityId,
}: RestaurantsListProps) {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    city_id: '',
    category_id: '',
    is_active: '',
  });

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.city_id) params.set('city_id', filters.city_id);
    if (filters.category_id) params.set('category_id', filters.category_id);
    if (filters.is_active !== '') params.set('is_active', filters.is_active);

    const res = await fetch(`/api/admin/restaurants?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRestaurants(data.restaurants ?? []);
    }
    setLoading(false);
  }, [filters]);

  // Cargar filtros dinámicos
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/cities').then(r => r.json()),
      fetch('/api/admin/categories').then(r => r.json()),
    ]).then(([citiesData, catsData]) => {
      setCities(citiesData.cities ?? []);
      setCategories(catsData.categories ?? []);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchRestaurants, 300);
    return () => clearTimeout(timer);
  }, [fetchRestaurants]);

  const activeCount = restaurants.filter(r => r.is_active).length;
  const openCount = restaurants.filter(r => r.is_open).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Restaurantes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {restaurants.length} total · {activeCount} activos · {openCount} abiertos ahora
          </p>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo restaurante
        </button>
      </div>

      {/* Filtros */}
      <div className="px-6 py-3 flex flex-wrap gap-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o slug..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {isOwner && (
          <select
            value={filters.city_id}
            onChange={e => setFilters(f => ({ ...f, city_id: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Todas las ciudades</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <select
          value={filters.category_id}
          onChange={e => setFilters(f => ({ ...f, category_id: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>

        <select
          value={filters.is_active}
          onChange={e => setFilters(f => ({ ...f, is_active: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>

        <button
          onClick={fetchRestaurants}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              </div>
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Store className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No hay restaurantes</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Ajusta los filtros o crea el primero</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Restaurante</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoría</th>
                {isOwner && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ciudad</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pedidos</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rating</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {restaurants.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  className={`cursor-pointer transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/10 ${
                    selectedId === r.id ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Logo thumbnail */}
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0 overflow-hidden flex items-center justify-center">
                        {r.logo_url ? (
                          <img src={r.logo_url} alt={r.name} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.name}</p>
                        <p className="text-xs text-gray-400 font-mono">/{r.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {r.category_emoji} {r.category_name ?? '—'}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {r.city_name ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                        r.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        {r.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      {r.is_active && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                          r.is_open
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          <Circle className="w-1.5 h-1.5 fill-current" />
                          {r.is_open ? 'Abierto' : 'Cerrado'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 text-sm text-gray-600 dark:text-gray-300">
                      <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                      {r.total_orders.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {r.total_ratings > 0 ? (
                      <div className="flex items-center justify-end gap-1 text-sm">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          {r.avg_rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">({r.total_ratings})</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-semibold ${
                      r.commission_percentage > 0
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-400'
                    }`}>
                      {r.commission_percentage > 0 ? `${r.commission_percentage}%` : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
