'use client';

import { create } from 'zustand';
import { storageKeys, getAutoTheme } from '@/config/tokens';

type ThemeMode = 'light' | 'dark' | 'auto';
type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  initialize: () => void;
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'auto') return getAutoTheme();
  return mode;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'auto',
  resolved: getAutoTheme(),

  setMode: (mode: ThemeMode) => {
    const resolved = resolveTheme(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKeys.theme, mode);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
    }
    set({ mode, resolved });
  },

  initialize: () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(storageKeys.theme) as ThemeMode | null;
    const mode = stored ?? 'auto';
    const resolved = resolveTheme(mode);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    set({ mode, resolved });
  },
}));
