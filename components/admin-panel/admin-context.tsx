'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AdminContextValue, AdminUser } from '@/types/admin-panel';

const AdminContext = createContext<AdminContextValue>({
  user: null,
  isLoading: true,
  cityName: 'Jaén',
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cityName, setCityName] = useState('Jaén');

  useEffect(() => {
    async function loadUserProfile() {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: userData } = await supabase
          .from('users')
          .select('id, name, role, city_id, email')
          .eq('id', authUser.id)
          .single();

        if (userData) {
          setUser({
            id: userData.id,
            name: userData.name,
            role: userData.role as AdminUser['role'],
            city_id: userData.city_id,
            email: userData.email || authUser.email || '',
          });

          // Load city name if city_admin
          if (userData.city_id) {
            const { data: cityData } = await supabase
              .from('cities')
              .select('name')
              .eq('id', userData.city_id)
              .single();
            if (cityData) setCityName(cityData.name);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadUserProfile();
  }, []);

  return (
    <AdminContext.Provider value={{ user, isLoading, cityName }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
