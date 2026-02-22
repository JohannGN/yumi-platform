'use client';

import { useAgent } from '@/components/agent-panel/agent-context';
import { MapPin, ShoppingBag } from 'lucide-react';

export default function AgentOrdersPage() {
  const { activeCityId, cities, loading } = useAgent();
  const activeCity = cities.find((c) => c.city_id === activeCityId);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
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
          Usa el selector en la barra superior para ver los pedidos de una ciudad.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Gestión de Pedidos
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeCity?.city_name}
          </p>
        </div>
      </div>

      {/* Skeleton table structure */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          {['Código', 'Estado', 'Cliente', 'Restaurante', 'Total', 'Hora'].map((h) => (
            <div key={h} className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {h}
            </div>
          ))}
        </div>
        {/* Placeholder rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-gray-50 dark:border-gray-800/50">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div key={j} className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>

      {/* Construction notice */}
      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6 text-center">
        <ShoppingBag className="w-8 h-8 text-orange-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
          🚧 Tabla de pedidos, crear pedido manual y polling 30s se implementarán en AGENTE-2
        </p>
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
          API <code className="bg-orange-100 dark:bg-orange-900/40 px-1 rounded">/api/agent/orders?city_id={activeCityId}</code> ya está activa
        </p>
      </div>
    </div>
  );
}
