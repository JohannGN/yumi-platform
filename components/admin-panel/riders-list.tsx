'use client';

import { useState } from 'react';
import { Star, Clock, Bike, Plus, CheckCircle } from 'lucide-react';
import { vehicleTypeLabels, formatDate } from '@/config/tokens';
import type { AdminRider } from '@/types/admin-panel';

// Anchos fijos para evitar hydration mismatch (Math.random prohibido en SSR)
const SKELETON_WIDTHS = [
  ['72%', '55%', '80%', '60%', '45%', '70%', '65%'],
  ['58%', '75%', '50%', '80%', '55%', '60%', '72%'],
  ['80%', '60%', '65%', '50%', '75%', '55%', '68%'],
  ['65%', '80%', '55%', '70%', '60%', '78%', '52%'],
  ['70%', '52%', '75%', '58%', '80%', '65%', '60%'],
  ['55%', '68%', '60%', '75%', '52%', '80%', '70%'],
];

interface RidersListProps {
  riders: AdminRider[];
  loading: boolean;
  onRiderClick: (rider: AdminRider) => void;
  onCreateClick: () => void;
}

function StatusBadge({ is_online, is_available, current_order_id }: {
  is_online: boolean;
  is_available: boolean;
  current_order_id: string | null;
}) {
  if (!is_online) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      Offline
    </span>
  );
  if (current_order_id || !is_available) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
      Con pedido
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Disponible
    </span>
  );
}

function SkeletonRow({ widths }: { widths: string[] }) {
  return (
    <tr>
      {widths.map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  );
}

export function RidersList({ riders, loading, onRiderClick, onCreateClick }: RidersListProps) {
  // Por defecto muestra TODOS los riders (online y offline)
  // El owner necesita ver todo su personal, no solo los activos hoy
  const [onlineOnly, setOnlineOnly] = useState(false);

  const filtered    = onlineOnly ? riders.filter((r) => r.is_online) : riders;
  const onlineCount = riders.filter((r) => r.is_online).length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Riders
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({onlineCount} online / {riders.length} total)
            </span>
          </h3>
          <button
            onClick={() => setOnlineOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              onlineOnly
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Solo online
          </button>
        </div>

        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo Rider
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/80 backdrop-blur-sm">
            <tr>
              {['Rider', 'Estado', 'Pedido actual', 'Vehículo', 'Entregas', 'Rating', 'Turno desde'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading
              ? SKELETON_WIDTHS.map((widths, i) => <SkeletonRow key={i} widths={widths} />)
              : filtered.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400 dark:text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">🏍️</span>
                      <p className="font-medium">
                        {onlineOnly ? 'No hay riders online ahora' : 'No hay riders registrados'}
                      </p>
                      {onlineOnly && (
                        <button
                          onClick={() => setOnlineOnly(false)}
                          className="text-sm text-orange-500 hover:underline mt-1"
                        >
                          Ver todos los riders
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
              : filtered.map((rider) => (
                <tr
                  key={rider.id}
                  onClick={() => onRiderClick(rider)}
                  className={`cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors ${!rider.is_active ? 'opacity-50' : ''}`}
                >
                  {/* Rider */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                        rider.is_online
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}>
                        {rider.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{rider.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{rider.phone}</p>
                      </div>
                      {!rider.is_active && (
                        <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <StatusBadge
                      is_online={rider.is_online}
                      is_available={rider.is_available}
                      current_order_id={rider.current_order_id}
                    />
                  </td>

                  {/* Pedido actual */}
                  <td className="px-4 py-3">
                    {rider.current_order_code ? (
                      <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded">
                        {rider.current_order_code}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>

                  {/* Vehículo */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {vehicleTypeLabels[rider.vehicle_type] ?? rider.vehicle_type}
                      </span>
                      {rider.vehicle_plate && (
                        <span className="text-xs text-gray-400 font-mono">{rider.vehicle_plate}</span>
                      )}
                    </div>
                  </td>

                  {/* Entregas */}
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{rider.total_deliveries}</span>
                  </td>

                  {/* Rating */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {rider.avg_rating > 0 ? rider.avg_rating.toFixed(1) : '—'}
                      </span>
                    </div>
                  </td>

                  {/* Turno desde */}
                  <td className="px-4 py-3">
                    {rider.shift_started_at ? (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(rider.shift_started_at)}
                      </div>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">Sin turno</span>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
