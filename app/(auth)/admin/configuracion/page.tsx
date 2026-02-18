'use client';

import { useState, useEffect } from 'react';
import { SettingsForm } from '@/components/admin-panel/settings-form';
import { useAdmin } from '@/components/admin-panel/admin-context';
import type { PlatformSettings } from '@/types/admin-panel';

// Skeleton
function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <div className="w-40 h-5 rounded bg-gray-100 dark:bg-gray-800 animate-pulse mb-4" />
        <div className="space-y-3">
          <div className="w-full h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="w-full h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="w-full h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <div className="w-32 h-5 rounded bg-gray-100 dark:bg-gray-800 animate-pulse mb-4" />
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="w-full h-8 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ConfiguracionPage() {
  const { user } = useAdmin();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canEdit = user?.role === 'owner';

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json() as PlatformSettings;
          setSettings(data);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(updated: Partial<PlatformSettings>) {
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error('Failed to save');
    const data = await res.json() as PlatformSettings;
    setSettings(data);
  }

  return (
    <div className="max-w-2xl">
      {isLoading ? (
        <SettingsSkeleton />
      ) : (
        <SettingsForm settings={settings} canEdit={canEdit} onSave={handleSave} />
      )}
    </div>
  );
}
