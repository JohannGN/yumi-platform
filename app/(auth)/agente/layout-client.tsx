'use client';

import { useState, useEffect } from 'react';
import { AgentProvider } from '@/components/agent-panel/agent-context';
import { AgentSidebar } from '@/components/agent-panel/agent-sidebar';
import { AgentHeader } from '@/components/agent-panel/agent-header';
import { CreditsAlertBanner } from '@/components/agent-panel/credits-alert-banner';

export function AgentLayoutClient({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);

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
      const hour = new Date().getHours();
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

  const sidebarWidth = isCollapsed ? 'lg:ml-[64px]' : 'lg:ml-[240px]';

  return (
    <AgentProvider>
      <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
        <AgentSidebar
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((v) => !v)}
        />

        <div className={`${sidebarWidth} flex flex-col h-full transition-all duration-300 ease-out`}>
          <AgentHeader
            onMenuToggle={() => setIsMobileMenuOpen(true)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
          {/* ADMIN-FIN-1: Alerta persistente de créditos bajos */}
          <CreditsAlertBanner />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AgentProvider>
  );
}
