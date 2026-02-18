'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Star, Loader2, UserCheck } from 'lucide-react';
import { formatDistance } from '@/config/tokens';
import type { AdminOrder, ClosestRider } from '@/types/admin-panel';

interface AssignRiderModalProps {
  order: AdminOrder;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignRiderModal({ order, onClose, onAssigned }: AssignRiderModalProps) {
  const [riders, setRiders]     = useState<ClosestRider[]>([]);
  const [loading, setLoading]   = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError]       = useState('');

  useEffect(() => {
    // Cargar riders más cercanos al restaurante usando la función find_closest_rider via API
    fetch(`/api/admin/riders?only_available=true`)
      .then((r) => r.json())
      .then((data) => {
        // Mapeamos a ClosestRider con distancia calculada si tenemos lat/lng
        const available = (data.riders ?? [])
          .filter((r: { is_online: boolean; is_available: boolean; current_lat: number | null }) => r.is_online && r.is_available && r.current_lat)
          .slice(0, 5)
          .map((r: { id: string; name: string; current_lat: number; current_lng: number }) => ({
            rider_id:    r.id,
            rider_name:  r.name,
            distance_km: haversine(
              order.delivery_lat, order.delivery_lng,
              r.current_lat,      r.current_lng,
            ),
            current_lat: r.current_lat,
            current_lng: r.current_lng,
          }))
          .sort((a: ClosestRider, b: ClosestRider) => a.distance_km - b.distance_km);
        setRiders(available);
      })
      .catch(() => setError('Error al cargar riders disponibles'))
      .finally(() => setLoading(false));
  }, [order.delivery_lat, order.delivery_lng]);

  const handleAssign = async (riderId: string) => {
    setAssigning(riderId);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/assign-rider`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_id: riderId }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Error al asignar rider');
      }
      onAssigned();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Asignar Rider</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Riders disponibles cerca al restaurante
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : riders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-2">🏍️</p>
              <p className="font-medium text-gray-700 dark:text-gray-300">Sin riders disponibles</p>
              <p className="text-sm text-gray-400 mt-1">No hay riders online y libres en este momento</p>
            </div>
          ) : (
            riders.map((rider) => (
              <div
                key={rider.rider_id}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-sm">
                    {rider.rider_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{rider.rider_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {formatDistance(rider.distance_km)}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                      <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                        <Star className="w-3 h-3 fill-current" />
                        Disponible
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleAssign(rider.rider_id)}
                  disabled={assigning !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigning === rider.rider_id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  Asignar
                </button>
              </div>
            ))
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Fórmula Haversine para distancia en km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
