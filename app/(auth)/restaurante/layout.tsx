'use client';

// ============================================================
// Restaurant Panel Layout
// Auth guard + RestaurantProvider + Sidebar + Bottom Nav
// Chat 5 — Fragment 1/7
// ============================================================

import { type ReactNode } from 'react';
import {
  RestaurantProvider,
  useRestaurant,
  RestaurantSidebar,
  RestaurantBottomNav,
  RestaurantMobileHeader,
} from '@/components/restaurant-panel';

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  return (
    <RestaurantProvider>
      <RestaurantLayoutInner>{children}</RestaurantLayoutInner>
    </RestaurantProvider>
  );
}

function RestaurantLayoutInner({ children }: { children: ReactNode }) {
  const { restaurant, isLoading, error } = useRestaurant();

  // ─── Loading state ───
  if (isLoading) {
    return <LayoutSkeleton />;
  }

  // ─── Error / no restaurant ───
  if (error || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🍽️</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {error === 'No autenticado'
              ? 'Inicia sesión'
              : 'Sin restaurante asignado'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error === 'No autenticado'
              ? 'Necesitas iniciar sesión para acceder al panel.'
              : error || 'No tienes un restaurante asignado. Contacta al administrador de YUMI.'}
          </p>
          {error === 'No autenticado' ? (
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B35] text-white rounded-lg font-medium hover:bg-[#E55A25] transition-colors"
            >
              Iniciar sesión
            </a>
          ) : (
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Volver al inicio
            </a>
          )}
        </div>
      </div>
    );
  }

  // ─── Main layout ───
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile header */}
      <RestaurantMobileHeader />

      <div className="flex">
        {/* Desktop sidebar */}
        <RestaurantSidebar />

        {/* Main content */}
        <main className="flex-1 min-h-screen pb-20 md:pb-0">
          <div className="max-w-[1280px] mx-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <RestaurantBottomNav />
    </div>
  );
}

// ─── SKELETON ───────────────────────────────────────────────

function LayoutSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile header skeleton */}
      <div className="md:hidden h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 animate-pulse" />

      <div className="flex">
        {/* Desktop sidebar skeleton */}
        <aside className="hidden md:block w-[280px] min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            <div className="space-y-2 pt-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </aside>

        {/* Main content skeleton */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-[1280px] mx-auto space-y-6">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 bg-white dark:bg-gray-900 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-white dark:bg-gray-900 rounded-xl animate-pulse" />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav skeleton */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 animate-pulse" />
    </div>
  );
}
