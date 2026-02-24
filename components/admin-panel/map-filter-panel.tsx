'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal, ChevronRight, Bike, Store, Package, Flame, X,
} from 'lucide-react';
import type { MapFilters } from '@/types/admin-panel-additions';

interface MapFilterPanelProps {
  filters: MapFilters;
  onChange: (filters: MapFilters) => void;
  counts: {
    riders: number;
    restaurants: number;
    orders: number;
    heatmap: number;
  };
}

const RIDER_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'available', label: 'Disponibles' },
  { value: 'busy', label: 'Ocupados' },
  { value: 'offline', label: 'Offline' },
] as const;

const ORDER_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending_confirmation', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'ready', label: 'Listo' },
  { value: 'assigned_rider', label: 'Asignado' },
  { value: 'picked_up', label: 'Recogido' },
  { value: 'in_transit', label: 'En camino' },
] as const;

const HEATMAP_DAYS_OPTIONS = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
] as const;

export function MapFilterPanel({ filters, onChange, counts }: MapFilterPanelProps) {
  const [open, setOpen] = useState(true);

  const toggle = (key: keyof MapFilters, value: unknown) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <>
      {/* Toggle button when collapsed */}
      <AnimatePresence>
        {!open ? (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setOpen(true)}
            className="absolute top-4 left-4 z-20 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </motion.button>
        ) : null}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-4 left-4 z-20 bg-white dark:bg-gray-800 shadow-xl rounded-xl w-72 max-h-[calc(100vh-120px)] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Filtros del mapa
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* ── Layer toggles ─────────────────────────────────────────── */}
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Capas
                </p>

                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <Bike className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Riders</span>
                    <span className="text-xs text-gray-400 tabular-nums">({counts.riders})</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.showRiders}
                    onChange={(e) => toggle('showRiders', e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <Store className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Restaurantes</span>
                    <span className="text-xs text-gray-400 tabular-nums">({counts.restaurants})</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.showRestaurants}
                    onChange={(e) => toggle('showRestaurants', e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Pedidos</span>
                    <span className="text-xs text-gray-400 tabular-nums">({counts.orders})</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.showOrders}
                    onChange={(e) => toggle('showOrders', e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <Flame className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Heatmap</span>
                    <span className="text-xs text-gray-400 tabular-nums">({counts.heatmap} entregas)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.showHeatmap}
                    onChange={(e) => toggle('showHeatmap', e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                  />
                </label>
              </div>

              {/* ── Rider status filter ───────────────────────────────────── */}
              {filters.showRiders && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status rider
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {RIDER_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => toggle('riderStatus', opt.value)}
                        className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                          filters.riderStatus === opt.value
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Order status filter ───────────────────────────────────── */}
              {filters.showOrders && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status pedido
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ORDER_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => toggle('orderStatus', opt.value)}
                        className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                          filters.orderStatus === opt.value
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Heatmap period ────────────────────────────────────────── */}
              {filters.showHeatmap && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Período heatmap
                  </p>
                  <div className="flex gap-1.5">
                    {HEATMAP_DAYS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => toggle('heatmapDays', opt.value)}
                        className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                          filters.heatmapDays === opt.value
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
