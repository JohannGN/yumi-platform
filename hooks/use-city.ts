// ============================================================
// YUMI — City selection hook (persists to localStorage)
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { storageKeys } from '@/config/tokens';

interface CitySelection {
  slug: string;
  name: string;
}

export function useCity() {
  const [city, setCity] = useState<CitySelection | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKeys.city);
      if (stored) setCity(JSON.parse(stored));
    } catch {
      // Ignore parse errors
    }
  }, []);

  const selectCity = useCallback((slug: string, name: string) => {
    const value = { slug, name };
    setCity(value);
    localStorage.setItem(storageKeys.city, JSON.stringify(value));
  }, []);

  return { city, selectCity };
}
