'use client';

// ============================================================
// Restaurant Context — provides restaurant data to all panel components
// Chat 5 — Fragment 1/7
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { Restaurant } from '@/types/restaurant-panel';

interface CityInfo {
  id: string;
  name: string;
  slug: string;
}

interface UserInfo {
  id: string;
  name: string;
  role: string;
}

interface RestaurantContextValue {
  restaurant: Restaurant | null;
  city: CityInfo | null;
  user: UserInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextValue>({
  restaurant: null,
  city: null,
  user: null,
  isLoading: true,
  error: null,
  refetch: async () => {},
});

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) {
    throw new Error('useRestaurant must be used within RestaurantProvider');
  }
  return ctx;
}

interface RestaurantProviderProps {
  children: ReactNode;
}

export function RestaurantProvider({ children }: RestaurantProviderProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [city, setCity] = useState<CityInfo | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurant = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/restaurant/me');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar restaurante');
        return;
      }

      setRestaurant(data.restaurant);
      setCity(data.city);
      setUser(data.user);
    } catch (err) {
      console.error('[RestaurantProvider] Error:', err);
      setError('Error de conexión. Verifica tu internet.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  return (
    <RestaurantContext.Provider
      value={{
        restaurant,
        city,
        user,
        isLoading,
        error,
        refetch: fetchRestaurant,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}
