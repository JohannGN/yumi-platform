'use client';

// ============================================================
// RestaurantSidebar + RestaurantBottomNav + RestaurantMobileHeader
// - WhatsApp: lee whatsapp_last_message_at para saber si ventana 24h activa
//   → Activa: badge verde con ripple "Alertas activas"
//   → Inactiva: badge rojo con ripple urgente "Envía INICIO"
// - Estado abierto/cerrado: badge con ripple animado, click abre modal toggle
// - Cerrar sesión con ConfirmModal
// ============================================================

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ConfirmModal } from './confirm-modal';
import { useRestaurant } from './restaurant-context';
import { business } from '@/config/tokens';

// ── Navigation items ────────────────────────────────────────
const NAV_ITEMS = [
  {
    href: '/restaurante',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/restaurante/pedidos',
    label: 'Pedidos',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: '/restaurante/menu',
    label: 'Menú',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: '/restaurante/historial',
    label: 'Historial',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/restaurante/creditos',
    label: 'Créditos',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/restaurante/perfil',
    label: 'Perfil',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// ── Helpers ─────────────────────────────────────────────────
function useIsActive() {
  const pathname = usePathname();
  return (href: string) => {
    if (href === '/restaurante') return pathname === '/restaurante';
    return pathname.startsWith(href);
  };
}

const WHATSAPP_INICIO_LINK = `https://wa.me/${business.yumiWhatsApp.replace('+', '')}?text=INICIO`;

function isWhatsAppWindowActive(lastMessageAt: string | null): boolean {
  if (!lastMessageAt) return false;
  const diff = Date.now() - new Date(lastMessageAt).getTime();
  return diff < 24 * 60 * 60 * 1000;
}

// ── Hooks ───────────────────────────────────────────────────
function useLogout() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      setLoading(false);
    }
  };

  return { showModal, setShowModal, loading, handleLogout };
}

function useToggleOpen() {
  const { restaurant, refetch } = useRestaurant();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const isOpen = restaurant?.is_open ?? false;

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/restaurant/toggle-open', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ is_open: !isOpen }),
});
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al cambiar estado');
      }
      await refetch();
      setShowModal(false);
    } catch (error) {
      console.error('Error toggling open:', error);
      alert(error instanceof Error ? error.message : 'Error al cambiar estado');
    } finally {
      setLoading(false);
    }
  };

  return { isOpen, showModal, setShowModal, loading, handleToggle };
}

// ── Ripple Dot (isla animada) ───────────────────────────────
// Punto central con ondas expandiéndose tipo isla dinámica
function RippleDot({ color, pulse = true }: { color: 'green' | 'red' | 'orange'; pulse?: boolean }) {
  const colorMap = {
    green: { dot: 'bg-green-500', ring1: 'bg-green-400/40', ring2: 'bg-green-400/20' },
    red: { dot: 'bg-red-500', ring1: 'bg-red-400/40', ring2: 'bg-red-400/20' },
    orange: { dot: 'bg-orange-500', ring1: 'bg-orange-400/40', ring2: 'bg-orange-400/20' },
  };
  const c = colorMap[color];

  return (
    <span className="relative flex items-center justify-center w-3 h-3 shrink-0">
      {/* Core dot */}
      <span className={`relative z-10 w-2 h-2 rounded-full ${c.dot}`} />
      {/* Ripple rings */}
      {pulse && (
        <>
          <span className={`absolute inset-0 rounded-full ${c.ring1} animate-ping`} style={{ animationDuration: '1.5s' }} />
          <span className={`absolute -inset-0.5 rounded-full ${c.ring2} animate-ping`} style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
        </>
      )}
    </span>
  );
}

// ── Status Badge (abierto/cerrado) con ripple ───────────────
function StatusBadge({ isOpen, onClick, size = 'md' }: { isOpen: boolean; onClick: () => void; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full font-semibold transition-all active:scale-95 ${sizeClasses} ${
        isOpen
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
      }`}
    >
      <RippleDot color={isOpen ? 'green' : 'red'} pulse={!isOpen} />
      {isOpen ? 'Abierto' : 'Cerrado'}
    </button>
  );
}

// ── WhatsApp Status Badge con ripple ────────────────────────
function WhatsAppBadge({ lastMessageAt, variant }: { lastMessageAt: string | null; variant: 'full' | 'compact' }) {
  const active = isWhatsAppWindowActive(lastMessageAt);
  const [remainingLabel, setRemainingLabel] = useState('');

  // Calcular tiempo restante
  useEffect(() => {
    if (!active || !lastMessageAt) {
      setRemainingLabel('');
      return;
    }

    const updateRemaining = () => {
      const expiresAt = new Date(lastMessageAt).getTime() + 24 * 60 * 60 * 1000;
      const remaining = Math.max(0, expiresAt - Date.now());
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setRemainingLabel(`${hours}h ${mins}m`);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 60000);
    return () => clearInterval(interval);
  }, [active, lastMessageAt]);

  if (variant === 'compact') {
    // Mobile: solo ícono con indicador
    return (
      <a
        href={active ? undefined : WHATSAPP_INICIO_LINK}
        target={active ? undefined : '_blank'}
        rel={active ? undefined : 'noopener noreferrer'}
        onClick={active ? (e) => e.preventDefault() : undefined}
        className={`relative p-2 rounded-lg transition-colors ${
          active
            ? 'cursor-default'
            : 'hover:bg-green-50 dark:hover:bg-green-900/20'
        }`}
        title={active ? `Alertas activas (${remainingLabel})` : 'Activar alertas WhatsApp'}
      >
        <WhatsAppIcon className="w-5 h-5" />
        {/* Status indicator */}
        <span className="absolute top-1 right-1">
          <RippleDot color={active ? 'green' : 'red'} pulse={!active} />
        </span>
      </a>
    );
  }

  // Desktop: full badge in sidebar
  if (active) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
        <div className="relative shrink-0">
          <WhatsAppIcon className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5">
            <RippleDot color="green" pulse={false} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight">Alertas activas</p>
          <p className="text-[10px] opacity-70">Expira en {remainingLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={WHATSAPP_INICIO_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
    >
      <div className="relative shrink-0">
        <WhatsAppIcon className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" />
        <span className="absolute -top-0.5 -right-0.5">
          <RippleDot color="red" pulse={true} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-tight">Alertas desactivadas</p>
        <p className="text-[10px] opacity-70">Toca para enviar INICIO</p>
      </div>
    </a>
  );
}

// ── WhatsApp SVG Icon ───────────────────────────────────────
function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════
// 1. RestaurantSidebar — Desktop sidebar (left)
// ═════════════════════════════════════════════════════════════
interface RestaurantSidebarProps {
  restaurantName?: string;
  logoUrl?: string | null;
}

export function RestaurantSidebar({ restaurantName, logoUrl }: RestaurantSidebarProps) {
  const router = useRouter();
  const isActive = useIsActive();
  const logout = useLogout();
  const toggle = useToggleOpen();
  const { restaurant } = useRestaurant();

  return (
    <>
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-30">
        {/* Brand header + status */}
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={restaurantName || 'Restaurante'} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <span className="text-lg">🍽️</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {restaurantName || 'Mi Restaurante'}
              </h2>
              <StatusBadge isOpen={toggle.isOpen} onClick={() => toggle.setShowModal(true)} size="sm" />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className={active ? 'text-orange-500' : ''}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer: WhatsApp status + Logout */}
        <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <WhatsAppBadge
            lastMessageAt={restaurant?.whatsapp_last_message_at ?? null}
            variant="full"
          />
          <button
            onClick={() => logout.setShowModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <ConfirmModal
        isOpen={logout.showModal}
        title="¿Cerrar sesión?"
        message="Volverás a la página principal. Necesitarás tus credenciales para ingresar de nuevo."
        confirmLabel="Cerrar sesión"
        variant="danger"
        onConfirm={logout.handleLogout}
        onCancel={() => logout.setShowModal(false)}
        isLoading={logout.loading}
      />
      <ConfirmModal
        isOpen={toggle.showModal}
        title={toggle.isOpen ? '¿Cerrar restaurante?' : '¿Abrir restaurante?'}
        message={toggle.isOpen ? 'No recibirás pedidos nuevos mientras estés cerrado.' : 'Comenzarás a recibir pedidos de clientes.'}
        confirmLabel={toggle.isOpen ? 'Cerrar' : 'Abrir'}
        variant={toggle.isOpen ? 'danger' : 'success'}
        onConfirm={toggle.handleToggle}
        onCancel={() => toggle.setShowModal(false)}
        isLoading={toggle.loading}
      />
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// 2. RestaurantBottomNav — Mobile bottom navigation
// ═════════════════════════════════════════════════════════════
export function RestaurantBottomNav() {
  const router = useRouter();
  const isActive = useIsActive();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-30 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors ${
                active ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => router.push('/restaurante/perfil')}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors ${
            isActive('/restaurante/perfil') ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </div>
    </nav>
  );
}

// ═════════════════════════════════════════════════════════════
// 3. RestaurantMobileHeader — Mobile top header bar
// ═════════════════════════════════════════════════════════════
interface RestaurantMobileHeaderProps {
  restaurantName?: string;
  logoUrl?: string | null;
}

export function RestaurantMobileHeader({ restaurantName, logoUrl }: RestaurantMobileHeaderProps) {
  const logout = useLogout();
  const toggle = useToggleOpen();
  const { restaurant } = useRestaurant();

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-20 px-3 py-2.5">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Name + Status */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {logoUrl ? (
              <img src={logoUrl} alt={restaurantName || 'Restaurante'} className="w-8 h-8 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                <span className="text-sm">🍽️</span>
              </div>
            )}
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
              {restaurantName || 'Mi Restaurante'}
            </span>
            <StatusBadge isOpen={toggle.isOpen} onClick={() => toggle.setShowModal(true)} size="sm" />
          </div>

          {/* Right: WhatsApp + Logout */}
          <div className="flex items-center shrink-0">
            <WhatsAppBadge
              lastMessageAt={restaurant?.whatsapp_last_message_at ?? null}
              variant="compact"
            />
            <button
              onClick={() => logout.setShowModal(true)}
              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
              aria-label="Cerrar sesión"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={logout.showModal}
        title="¿Cerrar sesión?"
        message="Volverás a la página principal. Necesitarás tus credenciales para ingresar de nuevo."
        confirmLabel="Cerrar sesión"
        variant="danger"
        onConfirm={logout.handleLogout}
        onCancel={() => logout.setShowModal(false)}
        isLoading={logout.loading}
      />
      <ConfirmModal
        isOpen={toggle.showModal}
        title={toggle.isOpen ? '¿Cerrar restaurante?' : '¿Abrir restaurante?'}
        message={toggle.isOpen ? 'No recibirás pedidos nuevos mientras estés cerrado.' : 'Comenzarás a recibir pedidos de clientes.'}
        confirmLabel={toggle.isOpen ? 'Cerrar' : 'Abrir'}
        variant={toggle.isOpen ? 'danger' : 'success'}
        onConfirm={toggle.handleToggle}
        onCancel={() => toggle.setShowModal(false)}
        isLoading={toggle.loading}
      />
    </>
  );
}

export default RestaurantSidebar;
