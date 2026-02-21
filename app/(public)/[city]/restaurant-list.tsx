'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, ChevronRight } from 'lucide-react';
import type { Restaurant, Category } from '@/types/database';
import { colors } from '@/config/tokens';
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
  featuredRestaurantId: string | null;
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
  featuredRestaurantId,
}: RestaurantListProps) {
  const router = useRouter();

  type QuickFilter = 'all' | 'popular' | 'fast' | 'new';
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('all');

  const filtered = useMemo(() => {
    if (!activeCategory) return restaurants;
    return restaurants.filter((r) => r.category?.slug === activeCategory);
  }, [restaurants, activeCategory]);

  const { featuredRestaurant, openShuffled, closedList, allClosed, totalOpen } = useMemo(() => {
    const open = filtered.filter((r) => r.is_open);
    const closed = filtered.filter((r) => !r.is_open);

    // Extract featured from open list (only when no category filter)
    let featured: Restaurant | null = null;
    let openForGrid = open;
    if (featuredRestaurantId && !activeCategory) {
      featured = open.find((r) => r.id === featuredRestaurantId) || null;
      if (featured) {
        openForGrid = open.filter((r) => r.id !== featuredRestaurantId);
      }
    }

    return {
      featuredRestaurant: featured,
      openShuffled: shuffleArray(openForGrid),
      closedList: closed,
      allClosed: open.length === 0 && filtered.length > 0,
      totalOpen: open.length,
    };
  }, [filtered, featuredRestaurantId, activeCategory]);

  const activeCat = categories.find((c) => c.slug === activeCategory);

  // ── Quick filter: applied on grid only (hero unaffected) ──
  const quickFilterFn = useCallback((r: Restaurant): boolean => {
    if (activeFilter === 'popular') return r.total_orders > 50;
    if (activeFilter === 'fast') return r.estimated_prep_minutes <= 20;
    if (activeFilter === 'new') return isNewRestaurant(r.created_at);
    return true;
  }, [activeFilter]);

  const filteredOpen = useMemo(
    () => openShuffled.filter(quickFilterFn),
    [openShuffled, quickFilterFn]
  );
  const filteredClosed = useMemo(
    () => closedList.filter(quickFilterFn),
    [closedList, quickFilterFn]
  );

  // ── Only show pills that have ≥1 match ──
  const allGridRestaurants = useMemo(
    () => [...openShuffled, ...closedList],
    [openShuffled, closedList]
  );

  const availableFilters = useMemo(() => {
    const pills: { id: QuickFilter; label: string }[] = [];
    const hasPopular = allGridRestaurants.some((r) => r.total_orders > 50);
    const hasFast = allGridRestaurants.some((r) => r.estimated_prep_minutes <= 20);
    const hasNew = allGridRestaurants.some((r) => isNewRestaurant(r.created_at));

    if (hasPopular) pills.push({ id: 'popular', label: '🔥 Popular' });
    if (hasFast) pills.push({ id: 'fast', label: '⚡ Rápido' });
    if (hasNew) pills.push({ id: 'new', label: '✨ Nuevo' });

    // Only show "Todos" if there's at least one other pill
    if (pills.length > 0) pills.unshift({ id: 'all', label: 'Todos' });

    return pills;
  }, [allGridRestaurants]);

  // Reset filter if current selection is no longer available
  useEffect(() => {
    if (activeFilter !== 'all' && !availableFilters.some((f) => f.id === activeFilter)) {
      setActiveFilter('all');
    }
  }, [availableFilters, activeFilter]);

  return (
    <section className="px-4">
      <div className="mb-3">
        {!activeCat && !allClosed && <TimeGreeting />}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {activeCat ? activeCat.name : 'Restaurantes'}
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {totalOpen} abierto{totalOpen !== 1 ? 's' : ''}
          </span>
        </div>
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

      {/* Quick filter pills — only when there are filters to show */}
      {!allClosed && availableFilters.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {availableFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                activeFilter === filter.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Hero: featured restaurant of the day */}
      {featuredRestaurant && !allClosed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4"
        >
          <HeroRestaurantCard restaurant={featuredRestaurant} citySlug={citySlug} />
        </motion.div>
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
      ) : filteredOpen.length === 0 && filteredClosed.length === 0 && activeFilter !== 'all' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-12 text-center"
        >
          <span className="mb-3 text-3xl opacity-40">🔍</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No hay restaurantes con este filtro
          </p>
          <button
            onClick={() => setActiveFilter('all')}
            className="mt-2 text-xs font-medium text-orange-500 hover:underline"
          >
            Ver todos
          </button>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeFilter}
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.06 } },
            }}
            className="space-y-4"
          >
            {/* Abiertos primero (aleatorio) */}
            {filteredOpen.map((restaurant) => (
              <motion.div
                key={restaurant.id}
                variants={{
                  hidden: { opacity: 0, y: 16, scale: 0.97 },
                  visible: {
                    opacity: 1, y: 0, scale: 1,
                    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
                  },
                }}
              >
                <RestaurantCard restaurant={restaurant} citySlug={citySlug} />
              </motion.div>
            ))}
            {/* Cerrados abajo */}
            {filteredClosed.map((restaurant) => (
              <motion.div
                key={restaurant.id}
                variants={{
                  hidden: { opacity: 0, y: 16, scale: 0.97 },
                  visible: {
                    opacity: 1, y: 0, scale: 1,
                    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
                  },
                }}
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
          {restaurant.total_orders > 50 && (
            <div className="absolute left-3 top-3 rounded-full bg-orange-500/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
              🔥 Popular
            </div>
          )}
          <div
            className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${
              isOpen ? 'bg-green-500' : 'bg-gray-400'
            }`}
          >
            {isOpen && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            )}
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

// ── Hero card: featured restaurant of the day ──
function HeroRestaurantCard({
  restaurant,
  citySlug,
}: {
  restaurant: Restaurant;
  citySlug: string;
}) {
  const theme = getRestaurantTheme(restaurant.theme_color);
  const hasRating = restaurant.avg_rating > 0 && restaurant.total_ratings > 0;

  return (
    <Link href={`/${citySlug}/${restaurant.slug}`} className="block">
      <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-all duration-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
        {/* Banner — taller than normal cards */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          {restaurant.banner_url && !restaurant.default_banner ? (
            <Image
              src={restaurant.banner_url}
              alt={`${restaurant.name} banner`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}30, ${theme.accent}30)`,
              }}
            >
              <span className="text-6xl opacity-30">🍽️</span>
            </div>
          )}

          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Badge "Destacado hoy" */}
          <div
            className="absolute right-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-md"
            style={{ backgroundColor: colors.brand.primary }}
          >
            🔥 Destacado hoy
          </div>

          {/* Open badge */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-green-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            Abierto
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center gap-3 p-4">
          {/* Logo */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {restaurant.logo_url && !restaurant.default_logo ? (
              <Image
                src={restaurant.logo_url}
                alt={restaurant.name}
                width={52}
                height={52}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl">
                {restaurant.category?.emoji || '🍽️'}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-gray-800 dark:text-gray-100">
              {restaurant.name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              {restaurant.category && (
                <span>{restaurant.category.emoji} {restaurant.category.name}</span>
              )}
              {restaurant.estimated_prep_minutes > 0 && (
                <>
                  <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
                  <span>~{restaurant.estimated_prep_minutes} min</span>
                </>
              )}
            </div>
            {hasRating && (
              <div className="mt-1.5 flex items-center gap-1">
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
            )}
          </div>

          {/* CTA arrow */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.brand.primary + '15' }}
          >
            <ChevronRight
              className="h-5 w-5"
              style={{ color: colors.brand.primary }}
            />
          </div>
        </div>
      </article>
    </Link>
  );
}

 // ── Contextual greeting based on Lima time ── (animated)
function TimeGreeting() {
  const [greeting, setGreeting] = useState<{ text: string; emoji: string } | null>(null);
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const now = new Date();
    const limaOffset = -5 * 60;
    const localOffset = now.getTimezoneOffset();
    const limaTime = new Date(now.getTime() + (localOffset + limaOffset) * 60000);
    const hour = limaTime.getHours();

    let text: string;
    let emoji: string;

    if (hour >= 5 && hour < 11) {
      text = '¿Qué desayunamos?';
      emoji = '☀️';
    } else if (hour >= 11 && hour < 14) {
      text = '¡Hora del almuerzo!';
      emoji = '🍽️';
    } else if (hour >= 14 && hour < 18) {
      text = '¿Se te antoja algo?';
      emoji = '🌤️';
    } else if (hour >= 18 && hour < 22) {
      text = '¿Qué cenamos hoy?';
      emoji = '🌙';
    } else {
      text = '¿Antojo nocturno?';
      emoji = '🦉';
    }

    setGreeting({ text, emoji });

    // Typewriter effect
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        // Hide cursor after typing finishes
        setTimeout(() => setShowCursor(false), 600);
      }
    }, 45);

    return () => clearInterval(interval);
  }, []);

  if (!greeting) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mb-4 mt-1 flex items-center gap-2.5"
    >
      {/* Emoji with floating animation */}
      <motion.span
        className="text-xl"
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'easeInOut',
        }}
      >
        {greeting.emoji}
      </motion.span>

      {/* Typewriter text */}
      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
        {displayText}
        {showCursor && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
            className="ml-px inline-block w-[2px] align-middle"
            style={{
              height: '14px',
              backgroundColor: colors.brand.primary,
            }}
          />
        )}
      </span>
    </motion.div>
  );
}