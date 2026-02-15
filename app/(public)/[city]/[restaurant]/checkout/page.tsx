// ============================================================
// Checkout Page — Server Component
// /{city}/{restaurant}/checkout
// ============================================================

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CheckoutPageClient } from '@/components/checkout/checkout-page-client';

interface CheckoutPageProps {
  params: Promise<{ city: string; restaurant: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { city: citySlug, restaurant: restaurantSlug } = await params;

  const supabase = await createServerSupabaseClient();

  // Cargar ciudad
  const { data: cityData } = await supabase
    .from('cities')
    .select('id, name, slug')
    .eq('slug', citySlug)
    .eq('is_active', true)
    .single();

  if (!cityData) redirect('/');

  // Cargar restaurante
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, lat, lng, is_open, is_active, city_id, theme_color, logo_url, default_logo')
    .eq('city_id', cityData.id)
    .eq('slug', restaurantSlug)
    .eq('is_active', true)
    .single();

  if (!restaurant) redirect(`/${citySlug}`);

  return (
    <CheckoutPageClient
      restaurant={{
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        lat: Number(restaurant.lat),
        lng: Number(restaurant.lng),
        isOpen: restaurant.is_open,
        cityId: restaurant.city_id,
        themeColor: restaurant.theme_color,
        logoUrl: restaurant.logo_url,
        defaultLogo: restaurant.default_logo,
      }}
      city={{
        id: cityData.id,
        name: cityData.name,
        slug: cityData.slug,
      }}
    />
  );
}
