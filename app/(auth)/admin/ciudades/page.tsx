'use client';

import { useState } from 'react';
import { useAdmin } from '@/components/admin-panel/admin-context';
import CitiesList from '@/components/admin-panel/cities-list';
import CitySettingsForm from '@/components/admin-panel/city-settings-form';

export default function AdminCiudadesPage() {
  const { user } = useAdmin();
  const isOwner = user?.role === 'owner';

  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey]         = useState(0);

  const handleSaved = () => { setRefreshKey(k => k + 1); };

  return (
    <div className="-m-4 lg:-m-6 h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)] flex overflow-hidden bg-white dark:bg-gray-900">

      {/* Lista de ciudades */}
      <div
        className={`flex flex-col transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 ${
          selectedCityId ? 'w-1/2' : 'w-full'
        }`}
      >
        <CitiesList
          key={refreshKey}
          selectedId={selectedCityId}
          onSelect={setSelectedCityId}
          isOwner={isOwner}
        />
      </div>

      {/* Editor de settings */}
      {selectedCityId && (
        <div className="w-1/2 flex flex-col overflow-hidden">
          <CitySettingsForm
            key={selectedCityId}
            cityId={selectedCityId}
            onClose={() => setSelectedCityId(null)}
            onSaved={handleSaved}
            isOwner={isOwner}
          />
        </div>
      )}
    </div>
  );
}
