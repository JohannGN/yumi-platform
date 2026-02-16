'use client';

// ============================================================
// Restaurant Sidebar (desktop) + Bottom Nav (mobile)
// Chat 5 — Fragment 1/7
// ============================================================

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRestaurant } from './restaurant-context';

// Nav items config
const NAV_ITEMS = [
  { label: 'Inicio', href: '/restaurante', icon: '📊', mobileIcon: '📊' },
  { label: 'Pedidos', href: '/restaurante/pedidos', icon: '🔔', mobileIcon: '🔔' },
  { label: 'Menú', href: '/restaurante/menu', icon: '📋', mobileIcon: '📋' },
  { label: 'Historial', href: '/restaurante/historial', icon: '📜', mobileIcon: '📜' },
  { label: 'Perfil', href: '/restaurante/perfil', icon: '⚙️', mobileIcon: '⚙️' },
] as const;

// ─── DESKTOP SIDEBAR ────────────────────────────────────────

export function RestaurantSidebar() {
  const pathname = usePathname();
  const { restaurant, isLoading } = useRestaurant();

  return (
    <aside className="hidden md:flex md:flex-col md:w-[280px] md:min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FF6B35] flex items-center justify-center text-white font-bold text-lg">
            Y
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Panel Restaurante
            </p>
            {isLoading ? (
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {restaurant?.name || 'Sin restaurante'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Open/Close toggle */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <ToggleOpenStatus />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/restaurante'
              ? pathname === '/restaurante'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-950/30 text-[#FF6B35]'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
              {item.label === 'Pedidos' && <PendingBadge />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <WhatsAppStatus />
      </div>
    </aside>
  );
}

// ─── MOBILE BOTTOM NAV ──────────────────────────────────────

export function RestaurantBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/restaurante'
              ? pathname === '/restaurante'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-0.5 flex-1 h-full
                transition-colors duration-150
                ${
                  isActive
                    ? 'text-[#FF6B35]'
                    : 'text-gray-500 dark:text-gray-400'
                }
              `}
            >
              <span className="text-xl relative">
                {item.mobileIcon}
                {item.label === 'Pedidos' && <MobilePendingDot />}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ─── MOBILE HEADER ──────────────────────────────────────────

export function RestaurantMobileHeader() {
  const { restaurant, isLoading } = useRestaurant();

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-md bg-[#FF6B35] flex items-center justify-center text-white font-bold text-sm shrink-0">
            Y
          </div>
          {isLoading ? (
            <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {restaurant?.name || 'Panel'}
            </p>
          )}
        </div>
        <ToggleOpenPill />
      </div>
    </header>
  );
}

// ─── TOGGLE IS_OPEN (Desktop version — sidebar) ────────────

function ToggleOpenStatus() {
  const { restaurant, isLoading, refetch } = useRestaurant();
  const [isToggling, setIsToggling] = useState(false);

  if (isLoading || !restaurant) {
    return (
      <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
    );
  }

  const handleToggle = async () => {
    if (isToggling) return;

    const newState = !restaurant.is_open;
    const confirmMsg = newState
      ? '¿Abrir tu restaurante? Empezarás a recibir pedidos.'
      : '¿Cerrar tu restaurante? No recibirás pedidos nuevos.';

    if (!window.confirm(confirmMsg)) return;

    setIsToggling(true);
    try {
      const res = await fetch('/api/restaurant/toggle-open', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: newState }),
      });

      if (res.ok) {
        await refetch();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al cambiar estado');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`
        w-full flex items-center justify-between px-3 py-2.5 rounded-lg
        text-sm font-medium transition-all duration-200
        ${
          restaurant.is_open
            ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }
        ${isToggling ? 'opacity-60 cursor-wait' : 'hover:opacity-80 cursor-pointer'}
      `}
    >
      <div className="flex items-center gap-2">
        <motion.div
          className={`w-2.5 h-2.5 rounded-full ${
            restaurant.is_open ? 'bg-green-500' : 'bg-red-500'
          }`}
          animate={restaurant.is_open ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <span>{restaurant.is_open ? 'Abierto' : 'Cerrado'}</span>
      </div>
      <span className="text-xs opacity-60">
        {isToggling ? '...' : 'Cambiar'}
      </span>
    </button>
  );
}

// ─── TOGGLE IS_OPEN (Mobile version — pill in header) ───────

function ToggleOpenPill() {
  const { restaurant, isLoading, refetch } = useRestaurant();
  const [isToggling, setIsToggling] = useState(false);

  if (isLoading || !restaurant) {
    return <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />;
  }

  const handleToggle = async () => {
    if (isToggling) return;

    const newState = !restaurant.is_open;
    const confirmMsg = newState
      ? '¿Abrir tu restaurante?'
      : '¿Cerrar tu restaurante?';

    if (!window.confirm(confirmMsg)) return;

    setIsToggling(true);
    try {
      const res = await fetch('/api/restaurant/toggle-open', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: newState }),
      });

      if (res.ok) {
        await refetch();
      }
    } catch {
      // silently fail
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`
        flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
        transition-all duration-200
        ${
          restaurant.is_open
            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
            : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
        }
        ${isToggling ? 'opacity-60' : ''}
      `}
    >
      <motion.div
        className={`w-2 h-2 rounded-full ${
          restaurant.is_open ? 'bg-green-500' : 'bg-red-500'
        }`}
        animate={restaurant.is_open ? { scale: [1, 1.3, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      {restaurant.is_open ? 'Abierto' : 'Cerrado'}
    </button>
  );
}

// ─── PENDING BADGE (desktop sidebar) ────────────────────────

function PendingBadge() {
  // This will be connected to real data in Fragment 3/7 (Kanban)
  // For now, return null — the kanban will inject the count via context
  return null;
}

// ─── MOBILE PENDING DOT ─────────────────────────────────────

function MobilePendingDot() {
  // Will be connected to real data in Fragment 3/7
  return null;
}

// ─── WHATSAPP STATUS ────────────────────────────────────────

function WhatsAppStatus() {
  const { restaurant } = useRestaurant();

  if (!restaurant) return null;

  const lastMsg = restaurant.whatsapp_last_message_at;
  const isActive = lastMsg
    ? Date.now() - new Date(lastMsg).getTime() < 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span>{isActive ? '🟢' : '🔴'}</span>
      <span className={isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
        WhatsApp {isActive ? 'activo' : 'inactivo'}
      </span>
      {!isActive && (
        <span className="text-gray-400 dark:text-gray-500">
          — Envía INICIO
        </span>
      )}
    </div>
  );
}
