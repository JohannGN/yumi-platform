'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Pencil, Trash2, Loader2, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { AdminZone } from '@/types/admin-panel';
import { formatCurrency } from '@/config/tokens';

interface ZonesListProps {
  cityId: string;
  selectedZoneId: string | null;
  onSelectZone: (zone: AdminZone | null) => void;
  onCreateClick: () => void;
  onEditClick: (zone: AdminZone) => void;
  onZonesChange: (zones: AdminZone[]) => void;
}

export default function ZonesList({
  cityId,
  selectedZoneId,
  onSelectZone,
  onCreateClick,
  onEditClick,
  onZonesChange,
}: ZonesListProps) {
  const [zones, setZones] = useState<AdminZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchZones = useCallback(async () => {
    if (!cityId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/zones?city_id=${cityId}`);
    if (res.ok) {
      const data = await res.json();
      const z = data.zones ?? [];
      setZones(z);
      onZonesChange(z);
    }
    setLoading(false);
  }, [cityId, onZonesChange]);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const handleToggleActive = async (zone: AdminZone) => {
    setTogglingId(zone.id);
    await fetch(`/api/admin/zones/${zone.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !zone.is_active }),
    });
    const updated = zones.map(z => z.id === zone.id ? { ...z, is_active: !z.is_active } : z);
    setZones(updated);
    onZonesChange(updated);
    setTogglingId(null);
  };

  const handleDelete = async (zone: AdminZone) => {
    if (!confirm(`¿Eliminar la zona "${zone.name}"?\n\nSi tiene pedidos asociados se desactivará. De lo contrario se eliminará permanentemente.`)) return;
    setDeletingId(zone.id);
    const res = await fetch(`/api/admin/zones/${zone.id}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      if (data.soft_deleted) {
        const updated = zones.map(z => z.id === zone.id ? { ...z, is_active: false } : z);
        setZones(updated);
        onZonesChange(updated);
      } else {
        const updated = zones.filter(z => z.id !== zone.id);
        setZones(updated);
        onZonesChange(updated);
        if (selectedZoneId === zone.id) onSelectZone(null);
      }
    }
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Zonas</h3>
          <p className="text-xs text-gray-400">{zones.filter(z => z.is_active).length} activas</p>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse">
                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MapPin className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Sin zonas</p>
            <p className="text-xs text-gray-400 mt-1">Dibuja una en el mapa</p>
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className={`group relative rounded-xl border transition-all cursor-pointer ${
                  selectedZoneId === zone.id
                    ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                    : zone.is_active
                    ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                    : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                }`}
                onClick={() => onSelectZone(zone)}
              >
                <div className="p-3">
                  <div className="flex items-start gap-2.5">
                    {/* Color swatch */}
                    <div
                      className="w-5 h-5 rounded-full shrink-0 mt-0.5 ring-2 ring-white dark:ring-gray-800"
                      style={{ backgroundColor: zone.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{zone.name}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-y-0.5">
                        <p>Base: {formatCurrency(zone.base_fee_cents)}</p>
                        <p>+{formatCurrency(zone.per_km_fee_cents)}/km · máx {formatCurrency(zone.max_fee_cents)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover actions */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(zone); }}
                    disabled={togglingId === zone.id}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title={zone.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {togglingId === zone.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : zone.is_active ? (
                      <ToggleRight className="w-3.5 h-3.5 text-orange-500" />
                    ) : (
                      <ToggleLeft className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditClick(zone); }}
                    className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(zone); }}
                    disabled={deletingId === zone.id}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Eliminar"
                  >
                    {deletingId === zone.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
