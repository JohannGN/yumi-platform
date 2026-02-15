'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, ArrowLeft, ChevronDown } from 'lucide-react';
import type { Restaurant } from '@/types/database';
import { useCartStore } from '@/stores/cart-store';
import {
  getRestaurantTheme,
  formatRating,
  getTodaySchedule,
  formatSchedule,
  getDayNameES,
} from '@/lib/utils/restaurant';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

interface RestaurantHeaderProps {
  restaurant: Restaurant;
  citySlug: string;
}

export function RestaurantHeader({ restaurant, citySlug }: RestaurantHeaderProps) {
  const router = useRouter();
  const theme = getRestaurantTheme(restaurant.theme_color);
  const todaySchedule = getTodaySchedule(restaurant.opening_hours);
  const scheduleText = formatSchedule(todaySchedule);
  const dayName = getDayNameES(restaurant.opening_hours);

  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const hours = restaurant.opening_hours;

  const handleBack = () => {
    const { leaveGuard } = useCartStore.getState();
    const target = `/${citySlug}`;

    if (leaveGuard) {
      const blocked = leaveGuard(target);
      if (blocked) return;
    }

    router.push(target);
  };

  return (
    <header>
      {/* Banner with back button */}
      <div className="relative h-44 w-full overflow-hidden bg-gray-200 dark:bg-gray-800">
        {restaurant.banner_url && !restaurant.default_banner ? (
          <Image
            src={restaurant.banner_url}
            alt={`${restaurant.name} banner`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}30, ${theme.accent}20)`,
            }}
          >
            <span className="text-7xl opacity-20">🍽️</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

        {/* CAMBIO CLAVE: button en vez de Link */}
        <button
          onClick={handleBack}
          className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </button>
      </div>

      {/* Info section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative px-4 pb-4 pt-0"
      >
        {/* Logo + Name side by side */}
        <div className="flex items-end gap-3">
          <div className="-mt-10 flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-white bg-white shadow-lg dark:border-gray-900 dark:bg-gray-800">
            {restaurant.logo_url && !restaurant.default_logo ? (
              <Image
                src={restaurant.logo_url}
                alt={restaurant.name}
                width={70}
                height={70}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl">{restaurant.category?.emoji || '🍽️'}</span>
            )}
          </div>

          <div className="mt-3 min-w-0 flex-1 pb-1 pt-1">
            <h1 className="text-xl font-bold leading-tight text-gray-900 dark:text-gray-50">
              {restaurant.name}
            </h1>
            {restaurant.category && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {restaurant.category.emoji} {restaurant.category.name}
              </p>
            )}
          </div>
        </div>

        {/* Description — collapsible */}
        {restaurant.description && (
          <div className="mt-2">
            <AnimatePresence mode="wait">
              {showFullDescription ? (
                <motion.p
                  key="full"
                  initial={{ height: 18, opacity: 0.8 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 18, opacity: 0.8 }}
                  className="text-xs leading-relaxed text-gray-400 dark:text-gray-500"
                >
                  {restaurant.description}
                </motion.p>
              ) : (
                <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                  {restaurant.description}
                </p>
              )}
            </AnimatePresence>
            {restaurant.description.length > 60 && (
              <button
                onClick={() => setShowFullDescription((prev) => !prev)}
                className="mt-0.5 text-[11px] font-medium"
                style={{ color: theme.primary }}
              >
                {showFullDescription ? 'Ver menos' : 'Ver más'}
              </button>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* Open/Closed badge */}
          <span
            className={`relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
              restaurant.is_open
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-400'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {restaurant.is_open ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                </span>
                <span>Abierto</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <span>Cerrado</span>
              </>
            )}
          </span>

          {/* Rating */}
          <div className="flex items-center gap-1">
            <Star
              className="h-3.5 w-3.5"
              style={{
                color: restaurant.avg_rating > 0 ? theme.primary : '#9CA3AF',
                fill: restaurant.avg_rating > 0 ? theme.primary : 'transparent',
              }}
            />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {formatRating(restaurant.avg_rating)}
            </span>
            {restaurant.total_ratings > 0 && (
              <span className="text-[10px] text-gray-400">({restaurant.total_ratings})</span>
            )}
          </div>

          {/* Schedule — clickable */}
          <button
            onClick={() => setShowSchedule((prev) => !prev)}
            className="flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {dayName}: {scheduleText}
            </span>
            <ChevronDown
              className={`h-3 w-3 text-gray-400 transition-transform ${
                showSchedule ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Prep time */}
          {restaurant.is_open && restaurant.estimated_prep_minutes > 0 && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              ~{restaurant.estimated_prep_minutes} min
            </span>
          )}
        </div>

        {/* Weekly schedule dropdown */}
        <AnimatePresence>
          {showSchedule && hours && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSchedule(false)}
                className="fixed inset-0 z-10"
              />
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative z-20 mt-2 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="px-3 py-2">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Horarios de atención
                  </p>
                  {DAY_KEYS.map((dayKey) => {
                    const day = hours[dayKey];
                    if (!day) return null;
                    const todayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][
                      (new Date().getDay() + 6) % 7
                    ];
                    const isToday = dayKey === todayKey;

                    return (
                      <div
                        key={dayKey}
                        className={`flex items-center justify-between py-1 text-xs ${
                          isToday ? 'font-semibold' : 'text-gray-500 dark:text-gray-400'
                        }`}
                        style={isToday ? { color: theme.primary } : undefined}
                      >
                        <span>{DAY_LABELS[dayKey]}{isToday ? ' (hoy)' : ''}</span>
                        <span>
                          {day.closed ? (
                            <span className="text-red-400">Cerrado</span>
                          ) : (
                            `${day.open} - ${day.close}`
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Theme accent bar */}
        <div
          className="mt-3 h-0.5 w-16 rounded-full"
          style={{ backgroundColor: theme.primary }}
        />
      </motion.div>
    </header>
  );
}