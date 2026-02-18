'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Map, List, RefreshCw } from 'lucide-react';
import { RidersMap } from '@/components/admin-panel/riders-map';
import { RidersList } from '@/components/admin-panel/riders-list';
import { RiderDetailAdmin } from '@/components/admin-panel/rider-detail-admin';
import { CreateRiderForm } from '@/components/admin-panel/create-rider-form';
import { useAdmin } from '@/components/admin-panel/admin-context';
import type { AdminRider, RidersListResponse } from '@/types/admin-panel';

type ViewMode = 'split' | 'map' | 'list';

export default function AdminRidersPage() {
  const { user }  = useAdmin();
  const [riders, setRiders]           = useState<AdminRider[]>([]);
  const [loading, setLoading]         = useState(true);
  const [viewMode, setViewMode]       = useState<ViewMode>('split');
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);

  // Auto-refresh posiciones GPS cada 15s
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRiders = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/riders');
      const data = await res.json() as RidersListResponse;
      setRiders(data.riders ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRiders();
    intervalRef.current = setInterval(fetchRiders, 15_000); // cada 15s
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchRiders]);

  const onlineCount    = riders.filter((r) => r.is_online).length;
  const availableCount = riders.filter((r) => r.is_online && r.is_available && !r.current_order_id).length;
  const busyCount      = riders.filter((r) => r.is_online && r.current_order_id).length;

  const defaultCityId = user?.city_id ?? '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Gestión de Riders</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatPill color="green"  label={`${onlineCount} online`} />
            <StatPill color="yellow" label={`${busyCount} con pedido`} />
            <StatPill color="emerald" label={`${availableCount} disponibles`} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {([
              { id: 'split', icon: <span className="text-xs font-bold">⊞</span>, label: 'Dividir' },
              { id: 'map',   icon: <Map className="w-4 h-4" />,  label: 'Mapa' },
              { id: 'list',  icon: <List className="w-4 h-4" />, label: 'Lista' },
            ] as const).map((v) => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
                  viewMode === v.id
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                title={v.label}
              >
                {v.icon}
              </button>
            ))}
          </div>

          <button
            onClick={fetchRiders}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'split' && (
          <div className="flex h-full gap-0">
            {/* Mapa 50% */}
            <div className="w-1/2 h-full p-4 border-r border-gray-200 dark:border-gray-700">
              <RidersMap
                riders={riders}
                onRefresh={fetchRiders}
                loading={loading}
              />
            </div>

            {/* Lista 50% */}
            <div className="w-1/2 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
              <RidersList
                riders={riders}
                loading={loading}
                onRiderClick={(r) => setSelectedRiderId(r.id)}
                onCreateClick={() => setShowCreate(true)}
              />
            </div>
          </div>
        )}

        {viewMode === 'map' && (
          <div className="h-full p-4">
            <RidersMap
              riders={riders}
              onRefresh={fetchRiders}
              loading={loading}
            />
          </div>
        )}

        {viewMode === 'list' && (
          <div className="h-full flex flex-col bg-white dark:bg-gray-900">
            <RidersList
              riders={riders}
              loading={loading}
              onRiderClick={(r) => setSelectedRiderId(r.id)}
              onCreateClick={() => setShowCreate(true)}
            />
          </div>
        )}
      </div>

      {/* Panel detalle rider */}
      <RiderDetailAdmin
        riderId={selectedRiderId}
        onClose={() => setSelectedRiderId(null)}
        onRefresh={fetchRiders}
      />

      {/* Modal crear rider */}
      {showCreate && (
        <CreateRiderForm
          defaultCityId={defaultCityId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchRiders(); }}
        />
      )}
    </div>
  );
}

function StatPill({ color, label }: { color: string; label: string }) {
  const styles: Record<string, string> = {
    green:   'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    yellow:  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    gray:    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[color] ?? styles.gray}`}>
      {label}
    </span>
  );
}
