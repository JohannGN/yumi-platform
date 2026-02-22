'use client';

import { useAgent } from '@/components/agent-panel/agent-context';
import { MapPin, AlertTriangle } from 'lucide-react';

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

      {/* Skeleton escalation cards */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
              <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Construction notice */}
      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
          🚧 Lista de escalaciones, detalle, resolución y link Chatwoot se implementarán en AGENTE-2
        </p>
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
          API <code className="bg-orange-100 dark:bg-orange-900/40 px-1 rounded">/api/agent/escalations?city_id={activeCityId}</code> ya está activa
        </p>
      </div>
    </div>
  );
}
