'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown } from 'lucide-react';
import { formatDateShort } from '@/config/design-tokens';

// ── Types ──────────────────────────────────────────────────
export interface DateRange {
  from: string; // ISO date: "2026-02-23"
  to: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

type PresetKey = 'today' | 'week' | 'month' | 'last_month' | 'custom';

interface Preset {
  key: PresetKey;
  label: string;
  getRange: () => DateRange;
}

// ── Helpers ────────────────────────────────────────────────
function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1; // Monday = start
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// ── Presets ────────────────────────────────────────────────
const presets: Preset[] = [
  {
    key: 'today',
    label: 'Hoy',
    getRange: () => {
      const t = toLocalISO(new Date());
      return { from: t, to: t };
    },
  },
  {
    key: 'week',
    label: 'Esta semana',
    getRange: () => ({
      from: toLocalISO(startOfWeek(new Date())),
      to: toLocalISO(new Date()),
    }),
  },
  {
    key: 'month',
    label: 'Este mes',
    getRange: () => ({
      from: toLocalISO(startOfMonth(new Date())),
      to: toLocalISO(new Date()),
    }),
  },
  {
    key: 'last_month',
    label: 'Mes anterior',
    getRange: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toLocalISO(first), to: toLocalISO(last) };
    },
  },
  {
    key: 'custom',
    label: 'Personalizado',
    getRange: () => {
      const t = toLocalISO(new Date());
      return { from: t, to: t };
    },
  },
];

// ── Component ──────────────────────────────────────────────
export function DateRangePicker({ value, onChange, className = '' }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey>('today');

  const displayLabel = useMemo(() => {
    if (activePreset !== 'custom') {
      const p = presets.find((pr) => pr.key === activePreset);
      return p?.label ?? 'Hoy';
    }
    if (value.from === value.to) return formatDateShort(value.from);
    return `${formatDateShort(value.from)} — ${formatDateShort(value.to)}`;
  }, [activePreset, value]);

  const handlePreset = useCallback(
    (preset: Preset) => {
      setActivePreset(preset.key);
      if (preset.key !== 'custom') {
        const range = preset.getRange();
        onChange(range);
        setOpen(false);
      }
    },
    [onChange]
  );

  const handleCustomChange = useCallback(
    (field: 'from' | 'to', val: string) => {
      const next = { ...value, [field]: val };
      // Ensure from <= to
      if (field === 'from' && val > value.to) next.to = val;
      if (field === 'to' && val < value.from) next.from = val;
      onChange(next);
    },
    [value, onChange]
  );

  return (
    <div className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 
                   bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium
                   text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 
                   transition-colors min-w-[160px]"
      >
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-1 w-[280px] rounded-lg border 
                       border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 
                       shadow-lg p-3"
          >
            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    activePreset === p.key
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            <AnimatePresence>
              {activePreset === 'custom' ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Desde
                      </label>
                      <input
                        type="date"
                        value={value.from}
                        max={toLocalISO(new Date())}
                        onChange={(e) => handleCustomChange('from', e.target.value)}
                        className="w-full rounded-md border border-gray-200 dark:border-gray-600 
                                   bg-white dark:bg-gray-700 px-2 py-1.5 text-xs 
                                   text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-orange-500
                                   focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Hasta
                      </label>
                      <input
                        type="date"
                        value={value.to}
                        max={toLocalISO(new Date())}
                        onChange={(e) => handleCustomChange('to', e.target.value)}
                        className="w-full rounded-md border border-gray-200 dark:border-gray-600 
                                   bg-white dark:bg-gray-700 px-2 py-1.5 text-xs 
                                   text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-orange-500
                                   focus:border-orange-500 outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-2 w-full rounded-md bg-orange-500 text-white text-xs font-medium 
                               py-1.5 hover:bg-orange-600 transition-colors"
                  >
                    Aplicar
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Backdrop to close */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
