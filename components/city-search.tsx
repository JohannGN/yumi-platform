'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { colors } from '@/config/design-tokens';
import { formatCurrency } from '@/config/design-tokens';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RestaurantCard {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_open: boolean;
  avg_rating: number;
  category?: string;
}

interface DishResult {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  restaurant_logo_url: string | null;
  city_slug: string;
  is_open: boolean;
  matching_dishes: {
    id: string;
    name: string;
    base_price_cents: number;
    image_url: string | null;
  }[];
}

interface CitySearchProps {
  cityId: string;
  citySlug: string;
  restaurants: RestaurantCard[];
  /** Render prop para mostrar el grid filtrado de restaurantes */
  renderRestaurants: (filtered: RestaurantCard[]) => React.ReactNode;
}

// ─── Skeleton de resultados de platos ────────────────────────────────────────

function DishResultSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-1" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Tarjeta de resultado por restaurante ────────────────────────────────────

function DishResultCard({
  result,
  query,
}: {
  result: DishResult;
  query: string;
}) {
  const highlight = (text: string) => {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <>
        {text.slice(0, idx)}
        <mark
          className="rounded px-0.5"
          style={{ background: '#FEF3C7', color: '#92400E' }}
        >
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header restaurante */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        {result.restaurant_logo_url ? (
          <Image
            src={result.restaurant_logo_url}
            alt={result.restaurant_name}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: colors.brand.primary }}
          >
            {result.restaurant_name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {result.restaurant_name}
          </p>
          <span
            className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full"
            style={{
              background: result.is_open
                ? colors.semantic.successLight
                : '#F3F4F6',
              color: result.is_open
                ? colors.semantic.success
                : '#6B7280',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: result.is_open
                  ? colors.semantic.success
                  : '#9CA3AF',
              }}
            />
            {result.is_open ? 'Abierto' : 'Cerrado'}
          </span>
        </div>
      </div>

      {/* Platos encontrados */}
      <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
        {result.matching_dishes.map((dish) => (
          <div
            key={dish.id}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            {dish.image_url ? (
              <Image
                src={dish.image_url}
                alt={dish.name}
                width={36}
                height={36}
                className="rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <span className="text-lg">🍽️</span>
            )}
            <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">
              {highlight(dish.name)}
            </span>
            <span
              className="text-sm font-semibold flex-shrink-0"
              style={{ color: colors.brand.primary }}
            >
              {formatCurrency(dish.base_price_cents)}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30">
        <Link
          href={`/${result.city_slug}/${result.restaurant_slug}`}
          className="flex items-center justify-center gap-1 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ color: colors.brand.primary }}
        >
          Ver restaurante →
        </Link>
      </div>
    </div>
  );
}

// ─── CitySearch (componente principal) ───────────────────────────────────────

export default function CitySearch({
  cityId,
  citySlug,
  restaurants,
  renderRestaurants,
}: CitySearchProps) {
  const [query, setQuery] = useState('');
  const [dishResults, setDishResults] = useState<DishResult[]>([]);
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrado client-side de restaurantes
  const filteredRestaurants = query.trim()
    ? restaurants.filter((r) =>
        r.name.toLowerCase().includes(query.toLowerCase())
      )
    : restaurants;

  const searchDishes = useCallback(
    async (q: string) => {
      if (q.trim().length < 3) {
        setDishResults([]);
        setSearchedQuery('');
        return;
      }
      setLoadingDishes(true);
      setSearchedQuery(q);
      try {
        const res = await fetch(
          `/api/search?city_id=${cityId}&q=${encodeURIComponent(q.trim())}`
        );
        const data = await res.json();
        setDishResults(data.results ?? []);
      } catch {
        setDishResults([]);
      } finally {
        setLoadingDishes(false);
      }
    },
    [cityId]
  );

  // Debounce 400ms para búsqueda de platos
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setDishResults([]);
      setSearchedQuery('');
      setLoadingDishes(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchDishes(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchDishes]);

  const hasQuery = query.trim().length > 0;
  const hasRestaurantResults = filteredRestaurants.length > 0;
  const hasDishResults = dishResults.length > 0;
  const noResults = hasQuery && !hasRestaurantResults && !loadingDishes && !hasDishResults;

  return (
    <div>
      {/* Input buscador */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca restaurantes o platos..."
          className="w-full pl-11 pr-10 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 shadow-sm transition-colors focus:outline-none"
          style={{ borderColor: hasQuery ? colors.brand.primary : undefined }}
        />
        {hasQuery && (
          <button
            onClick={() => {
              setQuery('');
              setDishResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
            style={{ background: '#9CA3AF' }}
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {/* Sin query — grid normal */}
      {!hasQuery && renderRestaurants(restaurants)}

      {/* Con query — resultados */}
      {hasQuery && (
        <div className="space-y-6">
          {/* Restaurantes filtrados */}
          {hasRestaurantResults && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                Restaurantes ({filteredRestaurants.length})
              </h3>
              {renderRestaurants(filteredRestaurants)}
            </section>
          )}

          {/* Platos encontrados — loading */}
          {loadingDishes && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                Buscando platos...
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3].map((i) => (
                  <DishResultSkeleton key={i} />
                ))}
              </div>
            </section>
          )}

          {/* Platos encontrados */}
          {!loadingDishes && hasDishResults && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                Platos encontrados{' '}
                <span className="normal-case font-normal">
                  con &quot;{searchedQuery}&quot;
                </span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {dishResults.map((r) => (
                  <DishResultCard key={r.restaurant_id} result={r} query={query} />
                ))}
              </div>
            </section>
          )}

          {/* Sin resultados de platos (solo mostrar si también hubo búsqueda de platos) */}
          {!loadingDishes &&
            query.trim().length >= 3 &&
            !hasDishResults &&
            !hasRestaurantResults && (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🍽️</p>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  No encontramos resultados para &quot;{query}&quot;
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Revisa la ortografía o intenta con otras palabras
                </p>
              </div>
            )}

          {/* Solo query corto sin restaurant results */}
          {!hasRestaurantResults && query.trim().length < 3 && !hasDishResults && (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Sin restaurantes que coincidan con &quot;{query}&quot;
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Escribe 3 o más caracteres para buscar platos
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
