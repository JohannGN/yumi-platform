'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';

interface AgentSidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/agente',              icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/agente/pedidos',      icon: ShoppingBag,     label: 'Pedidos' },
  { href: '/agente/escalaciones', icon: AlertTriangle,   label: 'Escalaciones' },
];

function isActive(href: string, pathname: string) {
  if (href === '/agente') return pathname === '/agente';
  return pathname.startsWith(href);
}

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
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
        collapsed ? 'justify-center' : '',
        active
          ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white',
      ].join(' ')}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function NavContent({ collapsed, pathname }: { collapsed: boolean; pathname: string }) {
  return (
    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          collapsed={collapsed}
          active={isActive(item.href, pathname)}
        />
      ))}
    </nav>
  );
}

export function AgentSidebar({
  isMobileOpen,
  onMobileClose,
  isCollapsed,
  onToggleCollapse,
}: AgentSidebarProps) {
  const pathname = usePathname();
  const CollapseIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <>
      {/* ── DESKTOP: fixed a la izquierda ── */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-30 overflow-hidden transition-all duration-300"
        style={{ width: isCollapsed ? '64px' : '240px' }}
      >
        {/* Header */}
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
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Agente</p>
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

        <NavContent collapsed={isCollapsed} pathname={pathname} />
      </aside>

      {/* ── MOBILE: overlay + drawer ── */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col z-50"
            style={{ width: '240px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Y</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm leading-none">YUMI</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Agente</p>
                </div>
              </div>
              <button
                onClick={onMobileClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <NavContent collapsed={false} pathname={pathname} />
          </aside>
        </div>
      )}
    </>
  );
}
