'use client';

import { useAgent } from '@/components/agent-panel/agent-context';
import { MapPin, ShoppingBag, AlertTriangle, Clock } from 'lucide-react';

export default function AgentDashboardPage() {
  const { agent, activeCityId, cities, loading } = useAgent();
  const activeCity = cities.find((c) => c.city_id === activeCityId);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
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
          Usa el selector en la barra superior para elegir la ciudad que deseas gestionar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Panel Agente
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {activeCity?.city_name} · {agent?.name}
        </p>
      </div>

      {/* Placeholder KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pedidos activos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">—</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Se implementará en AGENTE-2</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Escalaciones pendientes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">—</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Se implementará en AGENTE-2</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Entregados hoy</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">—</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Se implementará en AGENTE-2</p>
        </div>
      </div>

      {/* Construction notice */}
      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6 text-center">
        <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
          🚧 Dashboard con KPIs en tiempo real se implementará en AGENTE-2
        </p>
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
          Las APIs ya están activas. Usa las secciones de Pedidos y Escalaciones para gestionar.
        </p>
      </div>
    </div>
  );
}
