'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { AgentProfile, AgentCity } from '@/types/agent-panel';

interface AgentContextValue {
  agent: AgentProfile | null;
  activeCityId: string | null;
  setActiveCityId: (id: string) => void;
  cities: AgentCity[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const AgentContext = createContext<AgentContextValue>({
  agent: null,
  activeCityId: null,
  setActiveCityId: () => {},
  cities: [],
  loading: true,
  error: null,
  refetch: async () => {},
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
        // Only one city → auto-select
        setActiveCityIdState(cities[0].city_id);
        localStorage.setItem(STORAGE_KEY, cities[0].city_id);
      } else if (storedCity && cities.some((c) => c.city_id === storedCity)) {
        // Stored city still valid
        setActiveCityIdState(storedCity);
      } else if (cities.length > 0) {
        // Multiple cities, no valid stored → leave null (force selection)
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
