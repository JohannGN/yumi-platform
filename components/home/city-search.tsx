// ============================================================
// YUMI — City Search Bar
// Sticky input with glass morphism, animated icons, clear button
// Used in [city]/city-content.tsx
// ============================================================

'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
import { colors } from '@/config/tokens';

interface CitySearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function CitySearch({
  query,
  onQueryChange,
  onClear,
  isLoading,
}: CitySearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const hasText = query.length > 0;

  return (
    <div className="sticky top-0 z-20 bg-white/80 px-4 pb-2 pt-3 backdrop-blur-xl dark:bg-transparent">
      <motion.div
        animate={{
          boxShadow: isFocused
            ? `0 0 0 2px ${colors.brand.primary}35, 0 8px 24px -4px ${colors.brand.primary}08`
            : '0 0 0 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)',
        }}
        transition={{ duration: 0.25 }}
        className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 transition-colors duration-200 ${
          isFocused
            ? 'bg-white dark:bg-gray-800/80'
            : 'bg-gray-50/90 dark:bg-gray-800/40'
        }`}
      >
        {/* Search / Loading icon */}
        <motion.div
          animate={{
            color: isFocused || hasText ? colors.brand.primary : '#9CA3AF',
          }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.15 }}
              >
                <Loader2
                  className="h-[18px] w-[18px] animate-spin"
                  style={{ color: colors.brand.primary }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="search"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Search className="h-[18px] w-[18px]" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Input */}
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Busca restaurantes o platos..."
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {/* Clear button */}
        <AnimatePresence>
          {hasText && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => {
                onClear();
                inputRef.current?.focus();
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200/80 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
              type="button"
            >
              <X className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
