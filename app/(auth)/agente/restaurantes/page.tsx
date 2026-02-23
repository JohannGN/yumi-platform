'use client';

import { useState } from 'react';
import { Store } from 'lucide-react';
import { useAgent } from '@/components/agent-panel/agent-context';
import { AgentRestaurantMonitor } from '@/components/agent-panel/agent-restaurant-monitor';
import { AgentMenuManager } from '@/components/agent-panel/agent-menu-manager';
import type { AgentRestaurant } from '@/types/agent-panel';

export default function AgentRestaurantesPage() {
  const { activeCityId, loading } = useAgent();
  const [selectedRestaurant, setSelectedRestaurant] = useState<AgentRestaurant | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!activeCityId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Store className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-sm">Selecciona una ciudad para ver restaurantes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Monitor de Restaurantes</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Estado en tiempo real y gestión de menú
        </p>
      </div>

      <AgentRestaurantMonitor onSelectRestaurant={setSelectedRestaurant} />

      {/* Menu manager modal */}
      {selectedRestaurant ? (
        <AgentMenuManager
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
        />
      ) : null}
    </div>
  );
}
