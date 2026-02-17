'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RiderContextProvider } from '@/components/rider-panel/rider-context';
import { RiderHeader } from '@/components/rider-panel/rider-header';
import { RiderBottomNav } from '@/components/rider-panel/rider-bottom-nav';
import { motion, AnimatePresence } from 'framer-motion';

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/');
        return;
      }

      // Verificar que sea rider
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userData || userData.role !== 'rider') {
        router.replace('/');
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando panel rider...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <RiderContextProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center">
        <div className="w-full max-w-[430px] relative flex flex-col min-h-screen">
          {/* Header */}
          <RiderHeader />

          {/* Content */}
          <main className="flex-1 pb-20 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Bottom Navigation */}
          <RiderBottomNav />
        </div>
      </div>
    </RiderContextProvider>
  );
}
