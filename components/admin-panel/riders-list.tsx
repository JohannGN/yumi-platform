'use client';

import { useState } from 'react';
import { Clock, Plus, CheckCircle } from 'lucide-react';
import { formatDate } from '@/config/tokens';
import type { AdminRider } from '@/types/admin-panel';

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

// Clases de columna — flex en lugar de table para respetar overflow del padre
// Rider: flex-1 (crece) | Estado: w-32 | Pedido: w-24 | Entregas: w-20 | Turno: w-36
const COL_RIDER    = 'flex-1 min-w-0 px-4';
const COL_ESTADO   = 'w-32 shrink-0 px-3';
const COL_PEDIDO   = 'w-24 shrink-0 px-3';
const COL_ENTREGAS = 'w-20 shrink-0 px-3';
const COL_TURNO    = 'w-36 shrink-0 px-3';

function SkeletonRow() {
  return (
    <div className="flex items-center py-3 border-b border-gray-100 dark:border-gray-800 animate-pulse">
      <div className={COL_RIDER}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
      <div className={COL_ESTADO}>   <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20" /></div>
      <div className={COL_PEDIDO}>   <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" /></div>
      <div className={COL_ENTREGAS}> <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-6" /></div>
      <div className={COL_TURNO}>    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28" /></div>
    </div>
  );
}

// Formatea solo hora:minutos para ahorrar espacio
function formatShiftTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return formatDate(dateStr);
  }
}

export function RidersList({ riders, loading, onRiderClick, onCreateClick }: RidersListProps) {
  const [onlineOnly, setOnlineOnly] = useState(false);

  const filtered    = onlineOnly ? riders.filter((r) => r.is_online) : riders;
  const onlineCount = riders.filter((r) => r.is_online).length;

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
            Riders
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({onlineCount} online / {riders.length} total)
            </span>
          </h3>
          <button
            onClick={() => setOnlineOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 ${
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
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition shrink-0 ml-3"
        >
          <Plus className="w-4 h-4" />
          Nuevo Rider
        </button>
      </div>

      {/* Header row */}
      <div className="flex items-center bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 shrink-0">
        {[
          { label: 'Rider',       cls: COL_RIDER    },
          { label: 'Estado',      cls: COL_ESTADO   },
          { label: 'Pedido',      cls: COL_PEDIDO   },
          { label: 'Entregas',    cls: COL_ENTREGAS },
          { label: 'Turno desde', cls: COL_TURNO    },
        ].map(({ label, cls }) => (
          <div key={label} className={`${cls} py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400`}>
            {label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400 dark:text-gray-500">
            <span className="text-4xl">🏍️</span>
            <p className="font-medium text-sm">
              {onlineOnly ? 'No hay riders online ahora' : 'No hay riders registrados'}
            </p>
            {onlineOnly && (
              <button
                onClick={() => setOnlineOnly(false)}
                className="text-sm text-orange-500 hover:underline"
              >
                Ver todos los riders
              </button>
            )}
          </div>
        ) : (
          filtered.map((rider) => (
            <div
              key={rider.id}
              onClick={() => onRiderClick(rider)}
              className={`flex items-center py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors ${
                !rider.is_active ? 'opacity-50' : ''
              }`}
            >
              {/* Rider — nombre + placa + teléfono */}
              <div className={COL_RIDER}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    rider.is_online
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {rider.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">{rider.name}</p>
                      {!rider.is_active && (
                        <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {rider.vehicle_plate && (
                      <p className="text-xs font-mono font-semibold text-gray-600 dark:text-gray-300 leading-tight truncate">
                        {rider.vehicle_plate}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">{rider.phone}</p>
                  </div>
                </div>
              </div>

              {/* Estado */}
              <div className={COL_ESTADO}>
                <StatusBadge
                  is_online={rider.is_online}
                  is_available={rider.is_available}
                  current_order_id={rider.current_order_id}
                />
              </div>

              {/* Pedido actual */}
              <div className={COL_PEDIDO}>
                {rider.current_order_code ? (
                  <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded">
                    {rider.current_order_code}
                  </span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">—</span>
                )}
              </div>

              {/* Entregas */}
              <div className={COL_ENTREGAS}>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {rider.total_deliveries}
                </span>
              </div>

              {/* Turno desde */}
              <div className={COL_TURNO}>
                {rider.shift_started_at ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{formatShiftTime(rider.shift_started_at)}</span>
                  </div>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600 text-xs">Sin turno</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
