// ============================================================
// YUMI — Dish Search Results (Mode B)
// Cards grouped by restaurant with matching dishes
// Shows skeleton during loading, empty state when no results
// ============================================================

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { colors, formatCurrency } from '@/config/tokens';

// --- Types ---

export interface DishSearchResult {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  restaurant_logo_url: string | null;
  default_logo: boolean;
  category_emoji: string | null;
  is_open: boolean;
  matching_dishes: {
    id: string;
    name: string;
    base_price_cents: number;
    image_url: string | null;
  }[];
}

interface DishResultsProps {
  results: DishSearchResult[];
  isLoading: boolean;
  query: string;
  citySlug: string;
  cityName: string;
}

// --- Skeleton ---

const SKELETON_WIDTHS = [128, 96, 160, 112];

function DishResultsSkeleton() {
  return (
    <div className="space-y-3 px-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          {/* Header skeleton */}
          <div className="flex items-center gap-3 border-b border-gray-50 px-4 py-3 dark:border-gray-800">
            <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1">
              <div
                className="h-4 rounded bg-gray-200 dark:bg-gray-700"
                style={{ width: SKELETON_WIDTHS[i] }}
              />
            </div>
            <div className="h-5 w-14 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
          {/* Dish rows skeleton */}
          <div className="space-y-0 divide-y divide-gray-50 dark:divide-gray-800">
            {[0, 1].map((j) => (
              <div key={j} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-gray-100 dark:bg-gray-800" />
                  <div
                    className="h-3.5 rounded bg-gray-100 dark:bg-gray-800"
                    style={{ width: SKELETON_WIDTHS[(i + j + 1) % 4] }}
                  />
                </div>
                <div className="h-3.5 w-16 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
          {/* Footer skeleton */}
          <div className="flex justify-end border-t border-gray-50 px-4 py-2.5 dark:border-gray-800">
            <div className="h-3.5 w-28 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Empty State ---

function DishResultsEmpty({ query, cityName }: { query: string; cityName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center px-6 py-16 text-center"
    >
      <div className="relative mb-5">
        <span className="text-5xl">🔍</span>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          className="absolute -bottom-1 -right-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800"
        >
          ✕
        </motion.div>
      </div>
      <h3 className="text-base font-bold text-gray-700 dark:text-gray-200">
        No encontramos &ldquo;{query}&rdquo;
      </h3>
      <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        No hay platos con ese nombre en {cityName}. Intenta con otro término o explora
        los restaurantes.
      </p>
    </motion.div>
  );
}

// --- Main Component ---

export function DishResults({
  results,
  isLoading,
  query,
  citySlug,
  cityName,
}: DishResultsProps) {
  if (isLoading) {
    return <DishResultsSkeleton />;
  }

  if (results.length === 0) {
    return <DishResultsEmpty query={query} cityName={cityName} />;
  }

  const totalDishes = results.reduce(
    (acc, r) => acc + r.matching_dishes.length,
    0
  );

  return (
    <section className="px-4">
      {/* Results header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-3"
      >
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {totalDishes} plato{totalDishes !== 1 ? 's' : ''} en{' '}
          {results.length} restaurante{results.length !== 1 ? 's' : ''}{' '}
          para{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            &ldquo;{query}&rdquo;
          </span>
        </p>
      </motion.div>

      {/* Result cards */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <motion.div
            key={result.restaurant_id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.06,
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <DishResultCard result={result} citySlug={citySlug} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// --- Card Component ---

function DishResultCard({
  result,
  citySlug,
}: {
  result: DishSearchResult;
  citySlug: string;
}) {
  const MAX_VISIBLE = 3;
  const visibleDishes = result.matching_dishes.slice(0, MAX_VISIBLE);
  const extraCount = result.matching_dishes.length - MAX_VISIBLE;

  return (
    <Link
      href={`/${citySlug}/${result.restaurant_slug}`}
      className="block"
    >
      <article
        className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:bg-gray-900 ${
          result.is_open
            ? 'border-gray-100 dark:border-gray-800'
            : 'border-gray-100 opacity-60 dark:border-gray-800'
        }`}
      >
        {/* Restaurant header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {result.restaurant_logo_url && !result.default_logo ? (
              <Image
                src={result.restaurant_logo_url}
                alt={result.restaurant_name}
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg">
                {result.category_emoji || '🍽️'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-gray-800 dark:text-gray-100">
              {result.restaurant_name}
            </h3>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${
              result.is_open ? 'bg-green-500' : 'bg-gray-400'
            }`}
          >
            {result.is_open ? 'Abierto' : 'Cerrado'}
          </span>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-gray-100 dark:bg-gray-800" />

        {/* Matching dishes */}
        <div>
          {visibleDishes.map((dish, i) => (
            <div
              key={dish.id}
              className={`flex items-center justify-between px-4 py-2.5 ${
                i < visibleDishes.length - 1
                  ? 'border-b border-gray-50 dark:border-gray-800/50'
                  : ''
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="shrink-0 text-[11px] text-gray-300 dark:text-gray-600">
                  🍽️
                </span>
                <span className="truncate text-[13px] text-gray-700 dark:text-gray-300">
                  {dish.name}
                </span>
              </div>
              <span className="ml-3 shrink-0 text-[13px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {formatCurrency(dish.base_price_cents)}
              </span>
            </div>
          ))}
        </div>

        {/* Footer: extra count + CTA */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
          {extraCount > 0 ? (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              y {extraCount} plato{extraCount !== 1 ? 's' : ''} más…
            </span>
          ) : (
            <span />
          )}
          <span
            className="text-xs font-semibold"
            style={{ color: colors.brand.primary }}
          >
            Ver restaurante →
          </span>
        </div>
      </article>
    </Link>
  );
}
