'use client';

import { useState, useEffect } from 'react';
import { useAdmin } from '@/components/admin-panel/admin-context';
import ZonesMap from '@/components/admin-panel/zones-map';
import ZonesList from '@/components/admin-panel/zones-list';
import ZoneForm from '@/components/admin-panel/zone-form';
import { AdminZone } from '@/types/admin-panel';

interface CityOption { id: string; name: string; slug: string }

export default function AdminZonasPage() {
  const { user } = useAdmin();
  const isOwner = user?.role === 'owner';

  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>(user?.city_id ?? '');
  const [zones, setZones] = useState<AdminZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState<AdminZone | null>(null);
  const [pendingGeoJson, setPendingGeoJson] = useState<string | null>(null);
  const [zonesKey, setZonesKey] = useState(0);

  // Cargar ciudades para selector (solo owner)
  useEffect(() => {
    if (isOwner) {
      fetch('/api/admin/cities').then(r => r.json()).then(data => {
        const cityList = data.cities ?? [];
        setCities(cityList);
        if (!selectedCityId && cityList.length > 0) {
          setSelectedCityId(cityList[0].id);
        }
      });
    }
  }, [isOwner, selectedCityId]);

  const handlePolygonComplete = (geojson: string) => {
    setPendingGeoJson(geojson);
    setEditingZone(null);
    setShowForm(true);
  };

  const handleEditZone = (zone: AdminZone) => {
    setEditingZone(zone);
    setPendingGeoJson(null);
    setShowForm(true);
  };

  const handleFormSaved = () => {
    setShowForm(false);
    setEditingZone(null);
    setPendingGeoJson(null);
    setZonesKey(k => k + 1);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingZone(null);
    setPendingGeoJson(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* City selector (owner only) */}
      {isOwner && cities.length > 1 && (
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Ciudad:</span>
          <select
            value={selectedCityId}
            onChange={e => { setSelectedCityId(e.target.value); setSelectedZoneId(null); }}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">Selecciona la ciudad para gestionar sus zonas de delivery</span>
        </div>
      )}

      {/* Main content: Map (70%) + Zones list (30%) */}
      {selectedCityId ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Mapa */}
          <div className="flex-1 p-4 min-h-0">
            <ZonesMap
              zones={zones}
              selectedZoneId={selectedZoneId}
              onZoneSelect={(zone) => setSelectedZoneId(zone?.id ?? null)}
              onPolygonComplete={handlePolygonComplete}
            />
          </div>

          {/* Lista lateral */}
          <div className="w-72 shrink-0 border-l border-gray-200 dark:border-gray-700 overflow-hidden">
            <ZonesList
              key={zonesKey}
              cityId={selectedCityId}
              selectedZoneId={selectedZoneId}
              onSelectZone={(zone) => setSelectedZoneId(zone?.id ?? null)}
              onCreateClick={() => { setEditingZone(null); setPendingGeoJson(null); setShowForm(true); }}
              onEditClick={handleEditZone}
              onZonesChange={setZones}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 dark:text-gray-500">Selecciona una ciudad para gestionar sus zonas</p>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <ZoneForm
          cityId={selectedCityId}
          zone={editingZone}
          pendingGeoJson={pendingGeoJson}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
        />
      )}
    </div>
  );
}
