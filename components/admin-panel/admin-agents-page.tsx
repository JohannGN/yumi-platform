'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminAgentPermissions } from '@/components/admin-panel/admin-agent-permissions';
import {
  Headset,
  Building2,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Shield
} from 'lucide-react';

interface AgentItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  assigned_cities: Array<{ city_id: string; city_name: string }>;
}

interface CityOption {
  id: string;
  name: string;
}

export function AdminAgentsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null);
  const [permissionsAgent, setPermissionsAgent] = useState<AgentItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/agents');
      if (!res.ok) throw new Error('Error');
      const data: AgentItem[] = await res.json();
      setAgents(data);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCities = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cities');
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setCities(Array.isArray(data) ? data.map((c: Record<string, unknown>) => ({ id: c.id as string, name: c.name as string })) : []);
    } catch {
      setCities([]);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchCities();
  }, [fetchAgents, fetchCities]);

  async function toggleActive(agent: AgentItem) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !agent.is_active }),
      });
      if (!res.ok) throw new Error('Error');
      await fetchAgents();
      setMessage({ type: 'success', text: `Agente ${!agent.is_active ? 'activado' : 'desactivado'}` });
    } catch {
      setMessage({ type: 'error', text: 'Error al actualizar agente' });
    } finally {
      setSaving(false);
    }
  }

  async function toggleCity(agentId: string, cityId: string, isAssigned: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/cities`, {
        method: isAssigned ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city_id: cityId }),
      });
      if (!res.ok) throw new Error('Error');

      // Update local state
      await fetchAgents();
      // Update selected agent if open
      if (selectedAgent && selectedAgent.id === agentId) {
        const updatedAgent = agents.find((a) => a.id === agentId);
        if (updatedAgent) {
          // Refetch agent detail for consistency
          const detailRes = await fetch(`/api/admin/agents/${agentId}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            setSelectedAgent({
              ...detail,
              assigned_cities: detail.assigned_cities ?? [],
            });
          }
        }
      }
      setMessage({ type: 'success', text: isAssigned ? 'Ciudad desasignada' : 'Ciudad asignada' });
    } catch {
      setMessage({ type: 'error', text: 'Error al actualizar ciudades' });
    } finally {
      setSaving(false);
    }
  }

  // Clear messages after 3s
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gestión de Agentes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {agents.length} agente{agents.length !== 1 ? 's' : ''} registrado{agents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchAgents(); }}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Toast */}
      {message ? (
        <div className={[
          'flex items-center gap-2 px-4 py-2.5 rounded-lg border',
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        ].join(' ')}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <span className={[
            'text-sm',
            message.type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
          ].join(' ')}>{message.text}</span>
        </div>
      ) : null}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Ciudades</th>
              <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                  <Headset className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  No hay agentes registrados
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Headset className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white text-xs">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">
                    {agent.email ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    {agent.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {agent.assigned_cities.length === 0 ? (
                        <span className="text-[10px] text-gray-400">Sin ciudades</span>
                      ) : (
                        agent.assigned_cities.map((c) => (
                          <span
                            key={c.city_id}
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                          >
                            <Building2 className="w-2.5 h-2.5" />
                            {c.city_name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(agent)}
                      disabled={saving}
                      className="inline-flex items-center gap-1"
                      title={agent.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {agent.is_active ? (
                        <ToggleRight className="w-6 h-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setPermissionsAgent(agent)}
                        className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        <Shield className="w-3 h-3" />
                        Permisos
                      </button>
                      <button
                        onClick={() => setSelectedAgent(agent)}
                        className="text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        Editar ciudades
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* City assignment modal */}
      {selectedAgent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedAgent(null)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ciudades asignadas</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedAgent.name}</p>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-2 max-h-[400px] overflow-y-auto">
              {cities.map((city) => {
                const isAssigned = selectedAgent.assigned_cities.some((c) => c.city_id === city.id);
                return (
                  <button
                    key={city.id}
                    onClick={() => toggleCity(selectedAgent.id, city.id, isAssigned)}
                    disabled={saving}
                    className={[
                      'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors disabled:opacity-50',
                      isAssigned
                        ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{city.name}</span>
                    </div>
                    {isAssigned ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Plus className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                );
              })}
              {cities.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No hay ciudades disponibles</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {/* Permissions modal */}
      {permissionsAgent ? (
        <AdminAgentPermissions
          agentId={permissionsAgent.id}
          agentName={permissionsAgent.name}
          onClose={() => setPermissionsAgent(null)}
        />
      ) : null}
    </div>
  );
}
