'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { formatCurrency, restaurantThemes } from '@/config/tokens';

interface FeaturedDish {
  id: string;
  name: string;
  base_price_cents: number;
  image_url: string | null;
  restaurant_name: string;
  restaurant_slug: string;
  restaurant_logo_url: string | null;
  default_logo: boolean;
  theme_color: string;
  category_emoji: string | null;
}

interface DiscoveryCarouselProps {
  cityId: string;
  citySlug: string;
}

const CARD_WIDTH = 156;
const GAP = 12;
const SCROLL_SPEED = 1; // px per tick
const TICK_MS = 30; // interval in ms (~33px/s)
const RESUME_DELAY = 700; // ms after interaction to resume

export function DiscoveryCarousel({ cityId, citySlug }: DiscoveryCarouselProps) {
  const [dishes, setDishes] = useState<FeaturedDish[]>([]);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch dishes ──
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/featured?city_id=${encodeURIComponent(cityId)}&limit=12`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          if (data.dishes?.length > 0) setDishes(data.dishes);
          setLoaded(true);
        }
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [cityId]);

  // ── Auto-scroll via setInterval on native scrollLeft ──
  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) return; // already running
    intervalRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollLeft += SCROLL_SPEED;
      // Seamless loop: jump back when past the first set
      const singleSetWidth = (CARD_WIDTH + GAP) * dishes.length;
      if (singleSetWidth > 0 && el.scrollLeft >= singleSetWidth) {
        el.scrollLeft -= singleSetWidth;
      }
    }, TICK_MS);
  }, [dishes.length]);

  const stopAutoScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start auto-scroll when dishes are loaded
  useEffect(() => {
    if (dishes.length > 0) startAutoScroll();
    return () => stopAutoScroll();
  }, [dishes, startAutoScroll, stopAutoScroll]);

  // ── Interaction: pause + resume ──
  const handleInteractionStart = useCallback(() => {
    stopAutoScroll();
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, [stopAutoScroll]);

  const handleInteractionEnd = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      startAutoScroll();
    }, RESUME_DELAY);
  }, [startAutoScroll]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  // ── Skeleton (reserva espacio exacto) ──
  if (!loaded) {
    return (
      <section className="mb-2" style={{ minHeight: '200px' }}>
        <div className="mb-2.5 px-4">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex gap-3 overflow-hidden px-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[164px] w-[156px] shrink-0 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </section>
    );
  }

  if (dishes.length === 0) return null;

  // Duplicate dishes for seamless looping
  const displayDishes = [...dishes, ...dishes];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-2"
    >
      {/* Header */}
      <div className="mb-2.5 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-base"
          >
            ✨
          </motion.span>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
            Descubre hoy
          </h3>
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          Desliza para explorar
        </span>
      </div>

      {/* Scrollable track — native scroll + auto-scroll via interval */}
      <div
        ref={scrollRef}
        onMouseEnter={handleInteractionStart}
        onMouseLeave={handleInteractionEnd}
        onTouchStart={handleInteractionStart}
        onTouchEnd={handleInteractionEnd}
        onMouseDown={(e) => {
          handleInteractionStart();
          const el = scrollRef.current;
          if (!el) return;
          const startX = e.pageX;
          const startScroll = el.scrollLeft;
          const onMove = (ev: MouseEvent) => {
            el.scrollLeft = startScroll - (ev.pageX - startX);
          };
          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            handleInteractionEnd();
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
        className="flex cursor-grab gap-3 overflow-x-auto px-4 active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {displayDishes.map((dish, i) => (
          <DishCard
            key={`${dish.id}-${i}`}
            dish={dish}
            citySlug={citySlug}
          />
        ))}
      </div>
    </motion.section>
  );
}

function DishCard({
  dish,
  citySlug,
}: {
  dish: FeaturedDish;
  citySlug: string;
}) {
  const theme = restaurantThemes[dish.theme_color] || restaurantThemes.orange;

  return (
    <Link
      href={`/${citySlug}/${dish.restaurant_slug}`}
      className="block shrink-0"
      draggable={false}
    >
      <article className="group/card w-[156px] overflow-hidden rounded-2xl border border-gray-100/80 bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
        <div className="relative h-[100px] w-full overflow-hidden">
          {dish.image_url ? (
            <Image
              src={dish.image_url}
              alt={dish.name}
              fill
              className="object-cover transition-transform duration-300 group-hover/card:scale-105"
              sizes="156px"
              draggable={false}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}18, ${theme.accent}18)`,
              }}
            >
              <span className="text-3xl opacity-30">
                {dish.category_emoji || '🍽️'}
              </span>
            </div>
          )}
          <div className="absolute bottom-2 right-2 rounded-lg bg-white/90 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-gray-900 shadow-sm backdrop-blur-sm dark:bg-gray-900/90 dark:text-gray-100">
            {formatCurrency(dish.base_price_cents)}
          </div>
        </div>

        <div className="px-3 pb-3 pt-2.5">
          <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
            {dish.name}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: theme.primary }}
            />
            <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">
              {dish.restaurant_name}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}