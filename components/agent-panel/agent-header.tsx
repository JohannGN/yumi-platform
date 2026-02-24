'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, LogOut, Sun, Moon, ChevronDown, MapPin, Ban } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAgent } from './agent-context';
import { BanPhoneModal } from '@/components/admin-panel/ban-phone-modal';

const PAGE_TITLES: Record<string, string> = {
  '/agente': 'Dashboard',
  '/agente/pedidos': 'Pedidos',
  '/agente/escalaciones': 'Escalaciones',
};

interface AgentHeaderProps {
  onMenuToggle: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function AgentHeader({ onMenuToggle, isDark, onToggleTheme }: AgentHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { agent, activeCityId, setActiveCityId, cities } = useAgent();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = PAGE_TITLES[pathname] || 'Agente';
  const activeCity = cities.find((c) => c.city_id === activeCityId);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          {agent && (
            <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block truncate">
              {agent.name} · Agente
            </p>
          )}
        </div>

        {/* City Selector */}
        {cities.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsCityDropdownOpen((v) => !v)}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 border',
                activeCityId
                  ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 animate-pulse',
              ].join(' ')}
            >
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline truncate max-w-[120px]">
                {activeCity ? activeCity.city_name : 'Seleccionar ciudad'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>

            {isCityDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Ciudades asignadas
                  </p>
                </div>
                {cities.map((city) => (
                  <button
                    key={city.city_id}
                    onClick={() => {
                      setActiveCityId(city.city_id);
                      setIsCityDropdownOpen(false);
                    }}
                    className={[
                      'w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2',
                      city.city_id === activeCityId
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50',
                    ].join(' ')}
                  >
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{city.city_name}</span>
                    {!city.is_active && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">(inactiva)</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
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
            <span className="hidden sm:inline">{isLoggingOut ? 'Saliendo...' : 'Salir'}</span>
          </button>
        </div>
      </header>

      <BanPhoneModal open={showBanModal} onClose={() => setShowBanModal(false)} />
    </>
  );
}
