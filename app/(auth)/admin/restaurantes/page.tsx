'use client';

import { useState } from 'react';
import { useAdmin } from '@/components/admin-panel/admin-context';
import RestaurantsList from '@/components/admin-panel/restaurants-list';
import RestaurantDetailAdmin from '@/components/admin-panel/restaurant-detail-admin';
import CreateRestaurantForm from '@/components/admin-panel/create-restaurant-form';

export default function AdminRestaurantesPage() {
  const { user } = useAdmin();
  const isOwner     = user?.role === 'owner';
  const isCityAdmin = user?.role === 'city_admin';

  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey]         = useState(0);

  const handleCreated = () => { setShowCreateForm(false); setRefreshKey(k => k + 1); };
  const handleUpdated = () => { setRefreshKey(k => k + 1); };

  return (
    /*
     * -m-4 lg:-m-6 cancela el padding del <main> en layout-client.tsx
     * para que esta página ocupe todo el espacio edge-to-edge.
     */
    <div className="-m-4 lg:-m-6 h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)] flex overflow-hidden bg-white dark:bg-gray-900">

      {/* ── Lista ────────────────────────────────────────────── */}
      <div
        className={`flex flex-col transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 ${
          selectedId ? 'w-1/2' : 'w-full'
        }`}
      >
        <RestaurantsList
          key={refreshKey}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreateClick={() => setShowCreateForm(true)}
          isOwner={isOwner}
          userCityId={user?.city_id ?? null}
        />
      </div>

      {/* ── Panel detalle ────────────────────────────────────── */}
      {selectedId && (
        <div className="w-1/2 flex flex-col overflow-hidden">
          <RestaurantDetailAdmin
            restaurantId={selectedId}
            onClose={() => setSelectedId(null)}
            onUpdated={handleUpdated}
            isOwner={isOwner || isCityAdmin}
          />
        </div>
      )}

      {/* ── Modal crear ──────────────────────────────────────── */}
      {showCreateForm && (
        <CreateRestaurantForm
          onClose={() => setShowCreateForm(false)}
          onCreated={handleCreated}
          isOwner={isOwner}
          userCityId={user?.city_id ?? null}
        />
      )}
    </div>
  );
}
