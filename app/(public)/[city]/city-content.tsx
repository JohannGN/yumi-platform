// ============================================================
// YUMI — City Content Orchestrator
// Client component that manages search state and transitions
// between idle (categories + grid), Mode A (restaurant name
// match), and Mode B (cross-restaurant dish search via API).
// ============================================================

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CitySearch } from '@/components/home/city-search';
import { DishResults } from '@/components/home/dish-results';
import type { DishSearchResult } from '@/components/home/dish-results';
import { CategoriesScroll } from './categories-scroll';
import { RestaurantList } from './restaurant-list';
import type { City, Category, Restaurant } from '@/types/database';
import { DiscoveryCarousel } from '@/components/home/discovery-carousel';

interface CityContentProps {
  city: City;
  categories: Category[];
  restaurants: Restaurant[];
  activeCategory: string | null;
}

export function CityContent({
  city,
  categories,
  restaurants,
  activeCategory,
}: CityContentProps) {
  const [query, setQuery] = useState('');
  const [dishResults, setDishResults] = useState<DishSearchResult[]>([]);
  const [isLoadingDishes, setIsLoadingDishes] = useState(false);
  const [hasSearchedDishes, setHasSearchedDishes] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Mode A: instant client-side filter by restaurant name ──
  const filteredByName = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return null; // null = no search active
    const q = trimmed.toLowerCase();
    return restaurants.filter((r) => r.name.toLowerCase().includes(q));
  }, [query, restaurants]);

  // ── Determine current mode ──
  const isSearching = query.trim().length > 0;
  const modeA = filteredByName !== null && filteredByName.length > 0;
  const shouldSearchDishes =
    filteredByName !== null &&
    filteredByName.length === 0 &&
    query.trim().length >= 3;
  const modeB = shouldSearchDishes && (isLoadingDishes || hasSearchedDishes);

  // ── Mode B: debounced API search for dishes ──
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!shouldSearchDishes) {
      setDishResults([]);
      setHasSearchedDishes(false);
      setIsLoadingDishes(false);
      return;
    }

    setIsLoadingDishes(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const url = `/api/search?city_id=${encodeURIComponent(city.id)}&q=${encodeURIComponent(query.trim())}`;
        const res = await fetch(url);
        const data = await res.json();
        setDishResults(data.results ?? []);
      } catch {
        setDishResults([]);
      } finally {
        setIsLoadingDishes(false);
        setHasSearchedDishes(true);
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [shouldSearchDishes, query, city.id]);

  // ── Clear handler ──
  const handleClear = useCallback(() => {
    setQuery('');
    setDishResults([]);
    setHasSearchedDishes(false);
    setIsLoadingDishes(false);
  }, []);

  // ── Hint: no restaurant match AND query < 3 chars ──
  const showTypingHint =
    isSearching &&
    !modeA &&
    !modeB &&
    query.trim().length > 0 &&
    query.trim().length < 3;

  return (
    <div className="pb-8">
      {/* ── Sticky search bar ── */}
      <CitySearch
        query={query}
        onQueryChange={setQuery}
        onClear={handleClear}
        isLoading={isLoadingDishes}
      />

      {/* ── Discovery Carousel: only when idle ── */}
      {!isSearching && (
        <DiscoveryCarousel cityId={city.id} citySlug={city.slug} />
      )}

      {/* ── Categories: visible only when idle ── */}
      <AnimatePresence>
        {!isSearching ? (
          <motion.div
            key="categories"
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
            animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <CategoriesScroll
              categories={categories}
              citySlug={city.slug}
              activeCategory={activeCategory}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Content area (animated transitions) ── */}
      <AnimatePresence mode="wait">
        {!isSearching ? (
          /* ── Idle: full grid with optional category filter ── */
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <RestaurantList
              restaurants={restaurants}
              categories={categories}
              citySlug={city.slug}
              cityName={city.name}
              activeCategory={activeCategory}
            />
          </motion.div>
        ) : modeA ? (
          /* ── Mode A: restaurant name match (instant) ── */
          <motion.div
            key="modeA"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-2 px-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {filteredByName!.length} restaurante
                {filteredByName!.length !== 1 ? 's' : ''} para{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  &ldquo;{query.trim()}&rdquo;
                </span>
              </p>
            </div>
            <RestaurantList
              restaurants={filteredByName!}
              categories={categories}
              citySlug={city.slug}
              cityName={city.name}
              activeCategory={null}
            />
          </motion.div>
        ) : modeB ? (
          /* ── Mode B: cross-restaurant dish search (API) ── */
          <motion.div
            key="modeB"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DishResults
              results={dishResults}
              isLoading={isLoadingDishes}
              query={query.trim()}
              citySlug={city.slug}
              cityName={city.name}
            />
          </motion.div>
        ) : showTypingHint ? (
          /* ── Hint: type more characters ── */
          <motion.div
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center px-4 py-16 text-center"
          >
            <span className="mb-3 text-3xl opacity-40">⌨️</span>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Escribe al menos 3 letras para buscar platos
            </p>
          </motion.div>
        ) : (
          /* ── Fallback: searching dishes, waiting for debounce ── */
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center px-4 py-16 text-center"
          >
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Buscando platos…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
