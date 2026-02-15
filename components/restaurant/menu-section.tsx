'use client';

import { motion } from 'framer-motion';
import type { MenuCategory, MenuItem, ThemeColor } from '@/types/database';
import { MenuItemCard } from '@/components/restaurant/menu-item-card';

interface MenuSectionProps {
  category: MenuCategory | null;
  items: MenuItem[];
  onItemClick: (item: MenuItem) => void;
  isMobile: boolean;
  restaurantTheme: ThemeColor;
  isRestaurantOpen: boolean;
}

export function MenuSection({
  category,
  items,
  onItemClick,
  isMobile,
  restaurantTheme,
  isRestaurantOpen,
}: MenuSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="px-4"
    >
      {/* Category header */}
      <h3 className="mb-1 mt-6 text-base font-bold text-gray-800 dark:text-gray-100">
        {category?.name || 'Otros platos'}
      </h3>
      {category?.description && (
        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
          {category.description}
        </p>
      )}

      {/* Items list */}
      <div>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
          >
            <MenuItemCard
              item={item}
              onClick={() => onItemClick(item)}
              isMobile={isMobile}
              themeColor={restaurantTheme}
              isRestaurantOpen={isRestaurantOpen}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}