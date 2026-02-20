'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { colors } from '@/config/tokens';
import { useRider } from '@/components/rider-panel/rider-context';

const tabs = [
  {
    href: '/rider',
    label: 'Inicio',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? colors.brand.primary : 'currentColor'} strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/rider/historial',
    label: 'Historial',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? colors.brand.primary : 'currentColor'} strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    href: '/rider/perfil',
    label: 'Perfil',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? colors.brand.primary : 'currentColor'} strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function RiderBottomNav() {
  const pathname = usePathname();
  const { currentOrder } = useRider();

  const isActive = (href: string) => {
    if (href === '/rider') return pathname === '/rider';
    return pathname.startsWith(href);
  };

  // Badge verde: hay pedido activo y el rider NO está en la pestaña Inicio
  const showInicioBadge = !!currentOrder && pathname !== '/rider';

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const isInicio = tab.href === '/rider';

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 py-1 px-4 relative"
            >
              {/* Active indicator */}
              {active && (
                <motion.div
                  layoutId="rider-nav-indicator"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: colors.brand.primary }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              {/* Icon + badge wrapper */}
              <div className="relative">
                <div className={`transition-colors duration-200 ${active ? '' : 'text-gray-400 dark:text-gray-500'}`}>
                  {tab.icon(active)}
                </div>

                {/* Badge pedido activo — solo en Inicio cuando está en otra pestaña */}
                {isInicio && showInicioBadge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900"
                    style={{ backgroundColor: colors.semantic.success }}
                  />
                )}
              </div>

              <span
                className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
                  active
                    ? 'text-orange-500'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}
