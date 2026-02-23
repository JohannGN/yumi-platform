'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { AgentProfile, AgentCity, AgentPermissions } from '@/types/agent-panel';

interface AgentContextValue {
  agent: AgentProfile | null;
  activeCityId: string | null;
  setActiveCityId: (id: string) => void;
  cities: AgentCity[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // AGENTE-3: Permissions
  permissions: AgentPermissions | null;
  hasPermission: (key: keyof AgentPermissions) => boolean;
}

const DEFAULT_PERMISSIONS: AgentPermissions = {
  can_cancel_orders: true,
  can_toggle_restaurants: true,
  can_manage_menu_global: true,
  can_disable_menu_items: true,
  can_view_riders: true,
  can_create_orders: true,
  can_manage_escalations: true,
  can_view_finance_daily: true,
  can_view_finance_weekly: true,
};

const AgentContext = createContext<AgentContextValue>({
  agent: null,
  activeCityId: null,
  setActiveCityId: () => {},
  cities: [],
  loading: true,
  error: null,
  refetch: async () => {},
  permissions: null,
  hasPermission: () => false,
});

const STORAGE_KEY = 'yumi_agent_city';

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [activeCityId, setActiveCityIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/agent/me');
      if (!res.ok) {
        throw new Error('Error al cargar perfil de agente');
      }
      const data: AgentProfile = await res.json();
      setAgent(data);

      // Auto-select city
      const storedCity = localStorage.getItem(STORAGE_KEY);
      const cities = data.assigned_cities;

      if (cities.length === 1) {
        setActiveCityIdState(cities[0].city_id);
        localStorage.setItem(STORAGE_KEY, cities[0].city_id);
      } else if (storedCity && cities.some((c) => c.city_id === storedCity)) {
        setActiveCityIdState(storedCity);
      } else if (cities.length > 0) {
        setActiveCityIdState(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  function setActiveCityId(id: string) {
    setActiveCityIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  // AGENTE-3: Permissions from agent profile
  const permissions = agent?.permissions ?? null;

  const hasPermission = useCallback(
    (key: keyof AgentPermissions): boolean => {
      if (!agent) return false;
      // Owner and city_admin always have all permissions
      if (agent.role === 'owner' || agent.role === 'city_admin') return true;
      const perms = agent.permissions ?? DEFAULT_PERMISSIONS;
      return perms[key] === true;
    },
    [agent]
  );

  return (
    <AgentContext.Provider
      value={{
        agent,
        activeCityId,
        setActiveCityId,
        cities: agent?.assigned_cities ?? [],
        loading,
        error,
        refetch: fetchAgent,
        permissions,
        hasPermission,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error('useAgent debe usarse dentro de AgentProvider');
  }
  return ctx;
}
