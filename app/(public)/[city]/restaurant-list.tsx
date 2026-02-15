'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock } from 'lucide-react';
import type { Restaurant, Category } from '@/types/database';
import {
  getRestaurantTheme,
  getTodaySchedule,
  formatSchedule,
} from '@/lib/utils/restaurant';

interface RestaurantListProps {
  restaurants: Restaurant[];
  categories: Category[];
  citySlug: string;
  cityName: string;
  activeCategory: string | null;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function isNewRestaurant(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - created < thirtyDays;
}

export function RestaurantList({
  restaurants,
  categories,
  citySlug,
  cityName,
  activeCategory,
}: RestaurantListProps) {
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!activeCategory) return restaurants;
    return restaurants.filter((r) => r.category?.slug === activeCategory);
  }, [restaurants, activeCategory]);

  const { openShuffled, closedList, allClosed } = useMemo(() => {
    const open = filtered.filter((r) => r.is_open);
    const closed = filtered.filter((r) => !r.is_open);
    return {
      openShuffled: shuffleArray(open),
      closedList: closed,
      allClosed: open.length === 0 && filtered.length > 0,
    };
  }, [filtered]);

  const activeCat = categories.find((c) => c.slug === activeCategory);

  return (
    <section className="px-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          {activeCat ? activeCat.name : 'Restaurantes'}
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {openShuffled.length} abierto{openShuffled.length !== 1 ? 's' : ''}
        </span>
      </div>

      {activeCategory && activeCat && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => router.replace(`/${citySlug}`, { scroll: false })}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400"
        >
          {activeCat.emoji} {activeCat.name}
          <span className="ml-1">✕</span>
        </motion.button>
      )}

      {allClosed ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center rounded-2xl bg-gray-50 px-6 py-12 text-center dark:bg-gray-800/50"
        >
          <span className="mb-4 text-5xl">😴</span>
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">
            Todos están descansando
          </h3>
          <p className="mt-2 max-w-xs text-sm text-gray-500 dark:text-gray-400">
            Nuestros restaurantes no están disponibles en este momento.
            ¡Vuelve pronto, la cocina nunca descansa por mucho tiempo!
          </p>
          <span className="mt-4 text-3xl">🍳</span>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div layout className="space-y-4">
            {/* Abiertos primero (aleatorio) */}
            {openShuffled.map((restaurant, index) => (
              <motion.div
                key={restaurant.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
              >
                <RestaurantCard restaurant={restaurant} citySlug={citySlug} />
              </motion.div>
            ))}
            {/* Cerrados abajo */}
            {closedList.map((restaurant, index) => (
              <motion.div
                key={restaurant.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: (openShuffled.length + index) * 0.05, duration: 0.35 }}
              >
                <RestaurantCard restaurant={restaurant} citySlug={citySlug} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-16 text-center"
        >
          <span className="mb-3 text-4xl">🍽️</span>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            No hay restaurantes en esta categoría
          </p>
          <button
            onClick={() => router.replace(`/${citySlug}`, { scroll: false })}
            className="mt-2 text-xs font-medium text-orange-500 hover:underline"
          >
            Ver todos
          </button>
        </motion.div>
      )}
    </section>
  );
}

function RestaurantCard({
  restaurant,
  citySlug,
}: {
  restaurant: Restaurant;
  citySlug: string;
}) {
  const theme = getRestaurantTheme(restaurant.theme_color);
  const todaySchedule = getTodaySchedule(restaurant.opening_hours);
  const scheduleText = formatSchedule(todaySchedule);
  const isOpen = restaurant.is_open;
  const isNew = isNewRestaurant(restaurant.created_at);
  const hasRating = restaurant.avg_rating > 0 && restaurant.total_ratings > 0;

  return (
    <Link href={`/${citySlug}/${restaurant.slug}`} className="block">
      <article
        className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:bg-gray-900 ${
          isOpen
            ? 'border-gray-100 dark:border-gray-800'
            : 'border-gray-100 opacity-60 grayscale-[40%] dark:border-gray-800'
        }`}
      >
        {/* Banner */}
        <div className="relative h-36 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          {restaurant.banner_url && !restaurant.default_banner ? (
            <Image
              src={restaurant.banner_url}
              alt={`${restaurant.name} banner`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}22, ${theme.accent}22)`,
              }}
            >
              <span className="text-5xl opacity-30">🍽️</span>
            </div>
          )}
          <div
            className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${
              isOpen ? 'bg-green-500' : 'bg-gray-400'
            }`}
          >
            {isOpen ? 'Abierto' : 'Cerrado'}
          </div>
        </div>

        {/* Content — logo alineado con nombre, SIN solapar banner */}
        <div className="flex items-start gap-3 p-4">
          {/* Logo */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {restaurant.logo_url && !restaurant.default_logo ? (
              <Image
                src={restaurant.logo_url}
                alt={restaurant.name}
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl">
                {restaurant.category?.emoji || '🍽️'}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-gray-800 dark:text-gray-100">
              {restaurant.name}
            </h3>
            {restaurant.category && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {restaurant.category.emoji} {restaurant.category.name}
              </p>
            )}

            {/* Meta row */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {hasRating ? (
                <div className="flex items-center gap-1">
                  <Star
                    className="h-3.5 w-3.5"
                    style={{ color: theme.primary, fill: theme.primary }}
                  />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {restaurant.avg_rating.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    ({restaurant.total_ratings})
                  </span>
                </div>
              ) : isNew ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  ✨ Nuevo
                </span>
              ) : null}

              <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />

              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {scheduleText}
                </span>
              </div>

              {isOpen && restaurant.estimated_prep_minutes > 0 && (
                <>
                  <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    ~{restaurant.estimated_prep_minutes} min
                  </span>
                </>
              )}
            </div>

            <div
              className="mt-2.5 h-0.5 w-10 rounded-full"
              style={{ backgroundColor: theme.primary }}
            />
          </div>
        </div>
      </article>
    </Link>
  );
}