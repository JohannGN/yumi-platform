'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  Bike,
  FolderOpen,
  Building2,
  Map,
  Settings,
  X,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { colors } from '@/config/tokens';
import { useAdmin } from './admin-context';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',    href: '/admin',               active: true },
  { icon: Package,         label: 'Pedidos',       href: '/admin/pedidos',       active: true },
  { icon: UtensilsCrossed, label: 'Restaurantes',  href: '/admin/restaurantes',  active: true },
  { icon: Bike,            label: 'Riders',        href: '/admin/riders',        active: true },
  { icon: FolderOpen,      label: 'Categorías',    href: '/admin/categorias',    active: true },
  { icon: Building2,       label: 'Ciudades',      href: '/admin/ciudades',      active: true },
  { icon: Map,             label: 'Zonas',         href: '/admin/zonas',         active: true },
  { icon: Settings,        label: 'Configuración', href: '/admin/configuracion', active: true },
] as const;

interface AdminSidebarProps {
  isMobileOpen:     boolean;
  onMobileClose:    () => void;
  isCollapsed:      boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({
  isMobileOpen,
  onMobileClose,
  isCollapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { user } = useAdmin();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const collapsed = isCollapsed && !mobile;

    return (
      <div className="flex flex-col h-full">
        {/* ── Logo + toggle ── */}
        <div className={`
          flex items-center flex-shrink-0 border-b border-gray-100 dark:border-gray-800
          ${collapsed ? 'flex-col gap-2 px-2 py-4' : 'gap-3 px-4 py-5'}
        `}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0"
            style={{ backgroundColor: colors.brand.primary }}
          >
            <span className="text-white font-black text-base">Y</span>
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-black text-gray-900 dark:text-white tracking-tight">YUMI</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {user?.role === 'owner' ? 'Administrador'
                  : user?.role === 'city_admin' ? 'Admin Ciudad'
                  : 'Agente'}
              </p>
            </div>
          )}

          {/* Botón collapse desktop */}
          {!mobile && (
            <button
              onClick={onToggleCollapse}
              title={collapsed ? 'Expandir' : 'Colapsar'}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500 shrink-0"
            >
              {collapsed
                ? <PanelLeftOpen  className="w-4 h-4" />
                : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}

          {/* Botón cerrar mobile */}
          {mobile && (
            <button
              onClick={onMobileClose}
              className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
          {NAV_ITEMS.map(({ icon: Icon, label, href, active }) => {
            const isCurrent = isActive(href);
            const isLocked  = !active;

            return (
              <Link
                key={href}
                href={href}
                onClick={mobile ? onMobileClose : undefined}
                title={collapsed ? label : undefined}
                className={`
                  relative flex items-center rounded-xl text-sm font-medium transition-all duration-150
                  ${collapsed
                    ? 'justify-center w-10 h-10 mx-auto'
                    : 'gap-3 px-3 py-2.5'
                  }
                  ${isCurrent
                    ? 'text-white shadow-sm'
                    : isLocked
                    ? 'text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
                style={isCurrent ? { backgroundColor: colors.brand.primary } : {}}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-white' : ''}`} />

                {!collapsed && (
                  <>
                    <span className="flex-1">{label}</span>
                    {isLocked && !isCurrent && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 px-1.5 py-0.5 rounded-md font-medium">
                        Pronto
                      </span>
                    )}
                    {isCurrent && <ChevronRight className="w-3 h-3 text-white/60" />}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer usuario ── */}
        <div className={`border-t border-gray-100 dark:border-gray-800 ${collapsed ? 'px-2 py-4' : 'px-4 py-4'}`}>
          {collapsed ? (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mx-auto cursor-default"
              style={{ backgroundColor: colors.brand.secondary }}
              title={user?.name || 'Admin'}
            >
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: colors.brand.secondary }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Desktop sidebar — ancho animado ── */}
      <aside className={`
        hidden lg:flex lg:flex-col
        fixed left-0 top-0 h-screen
        bg-white dark:bg-gray-900
        border-r border-gray-100 dark:border-gray-800
        z-30 overflow-hidden
        transition-all duration-300 ease-out
        ${isCollapsed ? 'w-[64px]' : 'w-[280px]'}
      `}>
        <SidebarContent />
      </aside>

      {/* ── Mobile overlay ── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* ── Mobile sidebar — siempre expandido ── */}
      <aside className={`
        fixed left-0 top-0 h-screen w-[280px]
        bg-white dark:bg-gray-900
        border-r border-gray-100 dark:border-gray-800
        z-50 lg:hidden
        transform transition-transform duration-300 ease-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent mobile />
      </aside>
    </>
  );
}
