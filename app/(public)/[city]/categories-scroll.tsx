'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Category } from '@/types/database';
import { colors } from '@/config/tokens';

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface CategoriesScrollProps {
  categories: Category[];
  citySlug: string;
  activeCategory: string | null;
}

export function CategoriesScroll({
  categories,
  citySlug,
  activeCategory,
}: CategoriesScrollProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Shuffle once on mount — gives every category a chance to appear first
  const [shuffledCategories] = useState(() => shuffleArray(categories));
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const dragMoved = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragMoved.current = false;
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    dragMoved.current = true;
    const x = e.pageX - (scrollRef.current.offsetLeft || 0);
    scrollRef.current.scrollLeft = scrollLeft - (x - startX) * 1.5;
  };
  const onMouseUp = () => setIsDragging(false);

  function handleClick(slug: string) {
    if (dragMoved.current) return;
    if (activeCategory === slug) {
      router.replace(`/${citySlug}`, { scroll: false });
    } else {
      router.replace(`/${citySlug}?cat=${slug}`, { scroll: false });
    }
  }

  return (
    <section className="mb-4 pt-5">
      <h2 className="mb-3 px-4 text-lg font-bold text-gray-800 dark:text-gray-100">
        Categorías
      </h2>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          className="flex gap-1 overflow-x-auto px-4 py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{
            WebkitOverflowScrolling: 'touch',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          {shuffledCategories.map((cat, index) => {
            const isActive = activeCategory === cat.slug;

            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03, duration: 0.25 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleClick(cat.slug)}
                className="group flex shrink-0 flex-col items-center gap-1.5 rounded-2xl px-3 py-2.5 transition-all duration-200"
                style={{
                  minWidth: '72px',
                  backgroundColor: isActive ? colors.brand.primary + '10' : 'transparent',
                }}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg ${
                    isActive ? '' : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                  style={isActive ? { backgroundColor: colors.brand.primary + '20' } : undefined}
                >
                  {cat.emoji}
                </div>
                <span
                  className={`max-w-[72px] truncate text-[11px] font-semibold transition-colors duration-200 ${
                    isActive
                      ? ''
                      : 'text-gray-600 group-hover:text-yumi-primary dark:text-gray-400'
                  }`}
                  style={isActive ? { color: colors.brand.primary } : undefined}
                >
                  {cat.name}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="category-active-dot"
                    className="h-1 w-1 rounded-full"
                    style={{ backgroundColor: colors.brand.primary }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {canScrollRight && (
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-12 bg-gradient-to-l from-white to-transparent dark:from-gray-900" />
        )}
      </div>
    </section>
  );
}