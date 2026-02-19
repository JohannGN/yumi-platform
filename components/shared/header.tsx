'use client';

import { useRouter } from 'next/navigation';
import { MapPin, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { OrdersHeaderButton } from './order-history';
import { colors } from '@/config/tokens';
import { useCartStore } from '@/stores/cart-store';

interface HeaderProps {
  cityName?: string;
  citySlug?: string;
}

export function Header({ cityName, citySlug }: HeaderProps) {
  const router = useRouter();

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = citySlug ? `/${citySlug}` : '/';
    const { leaveGuard } = useCartStore.getState();

    if (leaveGuard) {
      const blocked = leaveGuard(target);
      if (blocked) return;
    }

    router.push(target);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-md dark:border-gray-800/60 dark:bg-gray-900/80">
      <div className="mx-auto flex h-14 max-w-[430px] items-center justify-between px-4 lg:max-w-[1280px]">
        {/* Logo — ahora intercepta navegación */}
        <button onClick={handleLogoClick} className="flex items-center gap-2">
          <span
            className="text-xl font-extrabold tracking-tight"
            style={{ color: colors.brand.primary }}
          >
            YUMI
          </span>
          {cityName && (
            <span className="flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <MapPin className="h-3 w-3" />
              {cityName}
            </span>
          )}
        </button>

      <div className="flex items-center gap-1">
        <OrdersHeaderButton />
        <ThemeToggle />
        <Link
          href="/login"
          className="p-1.5 rounded-full text-gray-300 hover:text-gray-500 dark:text-gray-700 dark:hover:text-gray-500 transition-colors"
          title="Acceso staff"
          aria-label="Acceso para restaurantes, riders y administración"
        >
          <KeyRound size={15} strokeWidth={1.5} />
        </Link>
      </div>
      </div>
    </header>
  );
}