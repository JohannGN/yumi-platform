'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Bike,
  Store,
  Tag,
  Building2,
  MapPin,
  Settings,
  DollarSign,
  Wallet,
  ChevronDown,
  ChevronRight,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Headset,
  Coins,
  Users,
  ScrollText,
  Shield,
  Receipt,
  TrendingUp
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================================
// Props
// ============================================================
interface AdminSidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
}

// ============================================================
// Datos de navegación
// ============================================================
const operationsItems: NavItem[] = [
  { href: '/admin',          icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/pedidos',  icon: ShoppingBag,     label: 'Pedidos'   },
  { href: '/admin/riders',   icon: Bike,            label: 'Riders'    },
  { href: '/admin/agentes',  icon: Headset,         label: 'Agentes'   },
  { href: '/admin/mapa', icon: MapPin, label: 'Mapa operativo' },
];

const catalogItems: NavItem[] = [
  { href: '/admin/restaurantes', icon: Store,     label: 'Restaurantes'     },
  { href: '/admin/categorias',   icon: Tag,       label: 'Categorias'       },
  { href: '/admin/ciudades',     icon: Building2, label: 'Ciudades'          },
  { href: '/admin/zonas',        icon: MapPin,    label: 'Zonas de delivery' },
];

const finanzasItems: NavItem[] = [
  { href: '/admin/finanzas',              icon: BarChart3, label: 'Dashboard'    },
  { href: '/admin/finanzas/caja',         icon: Wallet,    label: 'Caja'         },
  { href: '/admin/finanzas/creditos',     icon: Coins,     label: 'Créditos'     },
  { href: '/admin/finanzas/restaurantes', icon: Store,     label: 'Restaurantes' },
  { href: '/admin/finanzas/riders',       icon: Bike,      label: 'Riders'       },
  { href: '/admin/finanzas/egresos',      icon: Receipt,   label: 'Egresos'      },
  { href: '/admin/finanzas/pyl',          icon: TrendingUp,label: 'Estado de Resultados'},
];

const sistemaItems: NavItem[] = [
  { href: '/admin/usuarios',   icon: Users,      label: 'Usuarios'   },
  { href: '/admin/auditoria',  icon: ScrollText, label: 'Auditoría'  },
];

function isActive(href: string, pathname: string) {
  if (href === '/admin')          return pathname === '/admin';
  if (href === '/admin/finanzas') return pathname === '/admin/finanzas';
  return pathname.startsWith(href);
}

// ============================================================
// NavLink
// ============================================================
function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={[
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        collapsed ? 'justify-center' : '',
        active
          ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white',
      ].join(' ')}
    >
      <div className="relative flex-shrink-0">
        <Icon className="w-4 h-4" />
        {collapsed && item.badge && (
          <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1 py-0.5 rounded-full bg-red-500 text-white min-w-[16px] text-center leading-none">
            {item.badge}
          </span>
        )}
      </div>
      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-[20px] text-center flex-shrink-0 animate-pulse">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ============================================================
// SidebarGroup
// ============================================================
function SidebarGroup({
  icon: GroupIcon,
  label,
  items,
  collapsed,
  pathname,
  defaultOpen = false,
}: {
  icon: React.ElementType;
  label: string;
  items: NavItem[];
  collapsed: boolean;
  pathname: string;
  defaultOpen?: boolean;
}) {
  const anyActive = items.some(item => isActive(item.href, pathname));
  const [open, setOpen] = useState(defaultOpen || anyActive);

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {items.map(item => (
          <NavLink
            key={item.href}
            item={item}
            collapsed
            active={isActive(item.href, pathname)}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <GroupIcon className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">{label}</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {items.map(item => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={false}
              active={isActive(item.href, pathname)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// NavContent
// ============================================================
function NavContent({ collapsed, pathname, pendingCount }: { collapsed: boolean; pathname: string; pendingCount: number }) {
  const opsItems = operationsItems.map(item =>
    item.href === '/admin/pedidos' && pendingCount > 0
      ? { ...item, badge: pendingCount > 9 ? '9+' : String(pendingCount) }
      : item
  );

  return (
    <nav className="flex-1 overflow-y-auto p-3 space-y-4">
      <SidebarGroup
        icon={LayoutDashboard}
        label="Operaciones"
        items={opsItems}
        collapsed={collapsed}
        pathname={pathname}
        defaultOpen
      />
      {!collapsed && <div className="border-t border-gray-100 dark:border-gray-800" />}
      <SidebarGroup
        icon={Store}
        label="Catalogo"
        items={catalogItems}
        collapsed={collapsed}
        pathname={pathname}
      />
      {!collapsed && <div className="border-t border-gray-100 dark:border-gray-800" />}
      <SidebarGroup
        icon={DollarSign}
        label="Finanzas"
        items={finanzasItems}
        collapsed={collapsed}
        pathname={pathname}
      />
      {!collapsed && <div className="border-t border-gray-100 dark:border-gray-800" />}
      <SidebarGroup
        icon={Shield}
        label="Sistema"
        items={sistemaItems}
        collapsed={collapsed}
        pathname={pathname}
      />
    </nav>
  );
}

// ============================================================
// AdminSidebar — exportación principal
// ============================================================
export function AdminSidebar({
  isMobileOpen,
  onMobileClose,
  isCollapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const CollapseIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose;

  const [pendingCount, setPendingCount] = useState(0);

  const fetchPending = useCallback(async () => {
    try {
      const supabase = createClient();
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending_confirmation', 'confirmed']);
      setPendingCount(count ?? 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  return (
    <>
      {/* ── DESKTOP ── */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-30 overflow-hidden transition-all duration-300"
        style={{ width: isCollapsed ? '64px' : '280px' }}
      >
        <div
          className={[
            'flex items-center border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex-shrink-0',
            isCollapsed ? 'justify-center' : 'justify-between',
          ].join(' ')}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">Y</span>
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-sm leading-none">YUMI</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Admin</p>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            <CollapseIcon className="w-4 h-4" />
          </button>
        </div>

        <NavContent collapsed={isCollapsed} pathname={pathname} pendingCount={pendingCount} />

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <NavLink
            item={{ href: '/admin/configuracion', icon: Settings, label: 'Configuracion' }}
            collapsed={isCollapsed}
            active={pathname.startsWith('/admin/configuracion')}
          />
        </div>
      </aside>

      {/* ── MOBILE ── */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col z-50"
            style={{ width: '280px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Y</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm leading-none">YUMI</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Admin</p>
                </div>
              </div>
              <button
                onClick={onMobileClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <NavContent collapsed={false} pathname={pathname} pendingCount={pendingCount} />

            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <NavLink
                item={{ href: '/admin/configuracion', icon: Settings, label: 'Configuracion' }}
                collapsed={false}
                active={pathname.startsWith('/admin/configuracion')}
              />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
