'use client';

import { useState, useEffect } from 'react';
import { AdminProvider } from '@/components/admin-panel/admin-context';
import { AdminSidebar } from '@/components/admin-panel/admin-sidebar';
import { AdminHeader } from '@/components/admin-panel/admin-header';

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed,      setIsCollapsed]      = useState(false);
  const [isDark,           setIsDark]           = useState(false);

  // Initialize theme
  useEffect(() => {
    const stored = localStorage.getItem('yumi_theme');
    if (stored === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else if (stored === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      const hour     = new Date().getHours();
      const autoDark = hour < 6 || hour >= 18;
      setIsDark(autoDark);
      document.documentElement.classList.toggle('dark', autoDark);
    }
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('yumi_theme', next ? 'dark' : 'light');
  }

  // Ancho del sidebar según estado
  const sidebarWidth = isCollapsed ? 'lg:ml-[64px]' : 'lg:ml-[280px]';

  return (
    <AdminProvider>
      {/*
        h-screen + overflow-hidden = altura fija para toda la app.
        Esto hace que flex-1 en main tenga una referencia real,
        permitiendo que los hijos con h-full (mapas, kanban) funcionen.
      */}
      <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
        <AdminSidebar
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((v) => !v)}
        />

        {/* Main content — se desplaza según si el sidebar está colapsado */}
        <div className={`${sidebarWidth} flex flex-col h-full transition-all duration-300 ease-out`}>
          <AdminHeader
            onMenuToggle={() => setIsMobileMenuOpen(true)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
          {/*
            flex-1 + overflow-y-auto: scroll normal para dashboard y páginas de contenido.
            Las páginas que necesitan altura total (riders/pedidos con mapas) ponen
            h-full overflow-hidden en su propio div raíz — eso les da la referencia.
          */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
