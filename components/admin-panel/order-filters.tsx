'use client';

import { useState, useCallback } from 'react';
import { Search, X, SlidersHorizontal, CalendarDays } from 'lucide-react';
import { colors, orderStatusLabels } from '@/config/tokens';
import type { AdminOrderFilters } from '@/types/admin-panel';

const ALL_STATUSES = [
  'awaiting_confirmation',
  'pending_confirmation',
  'confirmed',
  'preparing',
  'ready',
  'assigned_rider',
  'picked_up',
  'in_transit',
  'delivered',
  'rejected',
  'cancelled',
] as const;

interface OrderFiltersProps {
  filters: AdminOrderFilters;
  onChange: (filters: AdminOrderFilters) => void;
  restaurants: Array<{ id: string; name: string }>;
  riders: Array<{ id: string; name: string }>;
}

export function OrderFilters({ filters, onChange, restaurants, riders }: OrderFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const update = useCallback(
    (patch: Partial<AdminOrderFilters>) => onChange({ ...filters, ...patch, page: 1 }),
    [filters, onChange]
  );

  const toggleStatus = (status: string) => {
    const current = filters.status;
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    update({ status: next });
  };

  const clearAll = () => {
    onChange({
      status: [],
      restaurant_id: '',
      rider_id: '',
      date_from: '',
      date_to: '',
      search: '',
      page: 1,
      limit: 50,
    });
  };

  const hasFilters =
    filters.status.length > 0 ||
    filters.restaurant_id ||
    filters.rider_id ||
    filters.date_from ||
    filters.date_to ||
    filters.search;

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 space-y-3">
      {/* Row 1: Search + toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código o teléfono…"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder:text-gray-400 transition"
          />
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition ${
            expanded
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-400'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filtros</span>
          {hasFilters && (
            <span className="ml-1 bg-orange-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
              {filters.status.length + (filters.restaurant_id ? 1 : 0) + (filters.rider_id ? 1 : 0) + (filters.date_from ? 1 : 0)}
            </span>
          )}
        </button>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 transition"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {/* Row 2: Status pills */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_STATUSES.map((status) => {
          const active = filters.status.includes(status);
          const color  = colors.orderStatus[status as keyof typeof colors.orderStatus] ?? '#6B7280';
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
              style={{
                borderColor: active ? color : 'transparent',
                backgroundColor: active ? `${color}20` : undefined,
                color: active ? color : undefined,
              }}
              data-inactive={!active}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              {orderStatusLabels[status] ?? status}
            </button>
          );
        })}
      </div>

      {/* Row 3: Expanded filters */}
      {expanded && (
        <div className="flex flex-wrap gap-3 pt-1 border-t border-gray-100 dark:border-gray-800">
          {/* Restaurante */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Restaurante</label>
            <select
              value={filters.restaurant_id}
              onChange={(e) => update({ restaurant_id: e.target.value })}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Todos los restaurantes</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Rider */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Rider</label>
            <select
              value={filters.rider_id}
              onChange={(e) => update({ rider_id: e.target.value })}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Todos los riders</option>
              {riders.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Fecha desde */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> Desde
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => update({ date_from: e.target.value })}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Fecha hasta */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> Hasta
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => update({ date_to: e.target.value })}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}
