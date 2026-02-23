'use client';

import { MapPin } from 'lucide-react';
import { useAgent } from '@/components/agent-panel/agent-context';
import { AgentRiderMap } from '@/components/agent-panel/agent-rider-map';

export default function AgentRidersPage() {
  const { activeCityId, loading, hasPermission } = useAgent();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-[400px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!hasPermission('can_view_riders')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <MapPin className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-sm font-medium">Sin permiso</p>
        <p className="text-xs mt-1">No tienes acceso para ver riders</p>
      </div>
    );
  }

  if (!activeCityId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <MapPin className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-sm">Selecciona una ciudad para ver riders</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mapa de Riders</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ubicación y estado en tiempo real
        </p>
      </div>

      <AgentRiderMap />
    </div>
  );
}
