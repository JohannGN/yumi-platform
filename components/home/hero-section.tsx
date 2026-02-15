// ============================================================
// YUMI — Hero section: Logo + tagline + animation
// ============================================================

'use client';

import { motion } from 'framer-motion';
import { MapPin, Zap } from 'lucide-react';
import { colors } from '@/config/tokens';

export function HeroSection() {
  return (
    <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-8 pt-16">
      {/* Background gradient orb */}
      <div
        className="absolute left-1/2 top-1/3 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[100px]"
        style={{
          background: `radial-gradient(circle, ${colors.brand.primary}, ${colors.brand.accent}, transparent)`,
        }}
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.primaryDark})`,
            }}
          >
            <Zap className="h-7 w-7 text-white" fill="white" />
          </div>
          <h1
            className="text-4xl font-extrabold tracking-tight"
            style={{ color: colors.brand.secondary }}
          >
            YUMI
          </h1>
        </div>
      </motion.div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mb-8 text-center"
      >
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Tu delivery favorito
        </p>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          Pide comida de tus restaurantes favoritos
        </p>
      </motion.div>

      {/* Location indicator */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500"
      >
        <MapPin className="h-4 w-4" style={{ color: colors.brand.primary }} />
        <span>Selecciona tu ciudad para comenzar</span>
      </motion.div>
    </section>
  );
}
