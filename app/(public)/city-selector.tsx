'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { colors } from '@/config/tokens';
import type { City } from '@/types/database';

interface CitySelectorProps {
  cities: City[];
}

export function CitySelector({ cities }: CitySelectorProps) {
  const router = useRouter();

  // If only one city, redirect automatically
  useEffect(() => {
    if (cities.length === 1) {
      router.push(`/${cities[0].slug}`);
    }
  }, [cities, router]);

  if (cities.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Próximamente en tu ciudad...
      </p>
    );
  }

  if (cities.length === 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
        ¿Dónde estás?
      </p>
      {cities.map((city, index) => (
        <motion.button
          key={city.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => router.push(`/${city.slug}`)}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left shadow-sm transition-all hover:border-yumi-primary hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${colors.brand.primary}15` }}
          >
            <MapPin className="h-5 w-5" style={{ color: colors.brand.primary }} />
          </div>
          <div>
            <span className="text-base font-semibold">{city.name}</span>
            <p className="text-xs text-gray-400">
              yumi.pe/{city.slug}
            </p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}