'use client';

import { useState } from 'react';
import { useAgent } from '@/components/agent-panel/agent-context';
import { AgentOrdersTable } from '@/components/agent-panel/agent-orders-table';
import { AgentCreateOrderForm } from '@/components/agent-panel/agent-create-order-form';
import { MapPin, Plus } from 'lucide-react';

export default function AgentOrdersPage() {
  const { activeCityId, cities, loading } = useAgent();
  const activeCity = cities.find((c) => c.city_id === activeCityId);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Crear pedido
        </button>
      </div>

      <AgentOrdersTable key={refreshKey} />

      <AgentCreateOrderForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
