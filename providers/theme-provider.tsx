'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initialize = useThemeStore((s) => s.initialize);

  useEffect(() => {
    initialize();

    // Re-check auto theme every minute
    const interval = setInterval(() => {
      const mode = useThemeStore.getState().mode;
      if (mode === 'auto') {
        useThemeStore.getState().setMode('auto');
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [initialize]);

  return <>{children}</>;
}
