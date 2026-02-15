import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Header } from '@/components/shared/header';
import { HeroSection } from '@/components/home/hero-section';
import { CitySelector } from './city-selector';
import { DesktopBanner } from '@/components/shared/desktop-banner';
import { OrderHistorySection } from '@/components/shared/order-history';
import type { City } from '@/types/database';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: cities } = await supabase
    .from('cities')
    .select('id, name, slug, is_active')
    .eq('is_active', true)
    .order('name');

  return (
    <>
      <Header />
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <HeroSection />
          <CitySelector cities={(cities as City[]) ?? []} />

          {/* Order history: only renders if localStorage has orders */}
          <OrderHistorySection />

          {/* Desktop: "order from your phone" */}
          <div className="mt-6 hidden md:block">
            <DesktopBanner />
          </div>
        </div>
      </div>
    </>
  );
}