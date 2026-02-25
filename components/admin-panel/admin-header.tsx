'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, LogOut, Sun, Moon, Ban } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from './admin-context';
import { BanPhoneModal } from './ban-phone-modal';
import { AlertsDropdown } from './alerts-dropdown';

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/pedidos': 'Pedidos',
  '/admin/restaurantes': 'Restaurantes',
  '/admin/riders': 'Riders',
  '/admin/categorias': 'Categorías',
  '/admin/ciudades': 'Ciudades',
  '/admin/zonas': 'Zonas de Delivery',
  '/admin/configuracion': 'Configuración',
  '/admin/mapa': 'Mapa Operativo',
  '/admin/usuarios': 'Usuarios',
  '/admin/auditoria': 'Auditoría',
};

interface AdminHeaderProps {
  onMenuToggle: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function AdminHeader({ onMenuToggle, isDark, onToggleTheme }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, cityName } = useAdmin();
  // cityId from authenticated user profile
  const cityId = user?.city_id ?? null;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);

  const pageTitle = PAGE_TITLES[pathname] || 'Admin';

  async function handleLogout() {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-20">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Page title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{pageTitle}</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
            {cityName} · {user?.role === 'owner' ? 'Acceso total' : user?.role === 'city_admin' ? 'Admin ciudad' : 'Agente'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Alerts dropdown — NUEVO */}
          <AlertsDropdown cityId={cityId} />

          {/* Ban phone */}
          <button
            onClick={() => setShowBanModal(true)}
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Banear número"
          >
            <Ban className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-gray-400" />
            ) : (
              <Moon className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                       text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/30
                       hover:text-red-600 dark:hover:text-red-400 transition-all duration-150
                       disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{isLoggingOut ? 'Saliendo...' : 'Cerrar sesión'}</span>
          </button>
        </div>
      </header>

      <BanPhoneModal open={showBanModal} onClose={() => setShowBanModal(false)} />
    </>
  );
}
