'use client';

import { useAgent } from '@/components/agent-panel/agent-context';
import { AgentEscalationsList } from '@/components/agent-panel/agent-escalations-list';
import { MapPin } from 'lucide-react';

export default function AgentEscalationsPage() {
  const { activeCityId, cities, loading } = useAgent();
  const activeCity = cities.find((c) => c.city_id === activeCityId);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!activeCityId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Selecciona una ciudad
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Usa el selector en la barra superior para ver las escalaciones de una ciudad.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Escalaciones
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {activeCity?.city_name}
        </p>
      </div>

      <AgentEscalationsList />
    </div>
  );
}
