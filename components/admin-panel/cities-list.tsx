'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, ShoppingBag, MapPin, Cloud, CloudRain,
  CheckCircle2, XCircle, RefreshCw, TrendingUp,
} from 'lucide-react';
import { AdminCity } from '@/types/admin-panel';
import { formatCurrency } from '@/config/tokens';

interface CitiesListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  isOwner: boolean;
}

export default function CitiesList({ selectedId, onSelect, isOwner }: CitiesListProps) {
  const [cities, setCities] = useState<AdminCity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCities = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/cities');
    if (res.ok) {
      const data = await res.json();
      setCities(data.cities ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCities(); }, [fetchCities]);

  // Si es city_admin y hay solo una ciudad, auto-seleccionar
  useEffect(() => {
    if (!isOwner && cities.length === 1 && !selectedId) {
      onSelect(cities[0].id);
    }
  }, [cities, isOwner, selectedId, onSelect]);

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse h-52" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Ciudades</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {cities.filter(c => c.is_active).length} activas de {cities.length} total
          </p>
        </div>
        <button
          onClick={fetchCities}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className={`grid gap-4 ${selectedId ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {cities.map((city) => (
            <button
              key={city.id}
              onClick={() => onSelect(city.id)}
              className={`text-left p-6 rounded-2xl border-2 transition-all group ${
                selectedId === city.id
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md'
              }`}
            >
              {/* City header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{city.name}</h2>
                    {city.is_active ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{city.slug} · {city.country}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {city.settings.rain_surcharge_active && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs">
                      <CloudRain className="w-3 h-3" />
                      +{formatCurrency(city.settings.rain_surcharge_cents)}
                    </div>
                  )}
                  {city.settings.alcohol_sales_enabled && (
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-xs">
                      Alcohol ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Restaurantes</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{city.restaurant_count}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Riders</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{city.rider_count}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Pedidos mes</span>
                  </div>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{city.order_count_month.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Zonas delivery</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{city.zone_count}</p>
                </div>
              </div>

              {/* Config summary */}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{city.settings.currency_symbol} {city.timezone}</span>
                {city.settings.min_order_cents > 0 && (
                  <span>· Mínimo {formatCurrency(city.settings.min_order_cents)}</span>
                )}
                {city.settings.service_fee_cents > 0 && (
                  <span>· Fee {formatCurrency(city.settings.service_fee_cents)}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
