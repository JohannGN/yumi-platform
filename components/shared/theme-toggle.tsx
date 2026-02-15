'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';

const icons = {
  light: Sun,
  dark: Moon,
  auto: Monitor,
} as const;

const nextMode = {
  light: 'dark',
  dark: 'auto',
  auto: 'light',
} as const;

const tooltips = {
  light: 'Modo claro (clic → oscuro)',
  dark: 'Modo oscuro (clic → automático)',
  auto: 'Automático según hora (clic → claro)',
} as const;

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const Icon = icons[mode];
  const next = nextMode[mode];

  return (
    <button
      onClick={() => setMode(next)}
      title={tooltips[mode]}
      className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <Icon className="h-4 w-4" />
      {mode === 'auto' && (
        <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-yumi-primary" />
      )}
    </button>
  );
}
