// ============================================================
// YUMI — Sticky menu search (filters dishes in real time)
// ============================================================

'use client';

import { Search, X } from 'lucide-react';
import { colors } from '@/config/tokens';

interface MenuSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  placeholder?: string;
}

export function MenuSearch({ query, onQueryChange, placeholder }: MenuSearchProps) {
  return (
    <div className="sticky top-0 z-10 bg-white/90 px-4 py-3 backdrop-blur-md dark:bg-gray-900/90">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder || 'Buscar platos...'}
          className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-9 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-transparent focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          style={{
            // @ts-expect-error CSS custom property
            '--tw-ring-color': colors.brand.primary + '40',
          }}
        />
        {query && (
          <button
            onClick={() => onQueryChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
