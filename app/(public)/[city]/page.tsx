import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Header } from '@/components/shared/header';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { CityContent } from './city-content';
import type { City, Category, Restaurant } from '@/types/database';

interface CityPageProps {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ cat?: string }>;
}

export default async function CityPage({ params, searchParams }: CityPageProps) {
  const { city: citySlug } = await params;
  const { cat: categoryFilter } = await searchParams;

  const supabase = await createServerSupabaseClient();

  // Fetch city
  const { data: city } = await supabase
    .from('cities')
    .select('*')
    .eq('slug', citySlug)
    .eq('is_active', true)
    .single();

  if (!city) notFound();
  const typedCity = city as City;

  // Fetch categories + restaurants in parallel
  const [categoriesRes, restaurantsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('is_visible', true)
      .order('display_order'),
    supabase
      .from('restaurants')
      .select('*, category:categories(id, name, slug, emoji)')
      .eq('city_id', typedCity.id)
      .eq('is_active', true)
      .order('is_open', { ascending: false })
      .order('display_order')
      .order('avg_rating', { ascending: false }),
  ]);

  const categories = (categoriesRes.data as Category[]) ?? [];
  const restaurants = (restaurantsRes.data as Restaurant[]) ?? [];

  // Featured restaurant: deterministic by date (same for all users each day)
  const openRestaurants = restaurants.filter((r) => r.is_open);
  let featuredRestaurantId: string | null = null;
  if (openRestaurants.length > 0) {
    const today = new Date().toISOString().split('T')[0]; // "2026-02-21"
    const seed = today.split('-').reduce((acc, n) => acc + parseInt(n), 0);
    featuredRestaurantId = openRestaurants[seed % openRestaurants.length].id;
  }

  return (
    <>
      <Header cityName={typedCity.name} citySlug={typedCity.slug} />

      {/* Breadcrumb scrolls away, search bar sticks */}
      <Breadcrumb items={[{ label: typedCity.name, href: `/${typedCity.slug}` }]} />

      {/* Client-side orchestrator: search + categories + restaurants */}
      <CityContent
        city={typedCity}
        categories={categories}
        restaurants={restaurants}
        activeCategory={categoryFilter || null}
        featuredRestaurantId={featuredRestaurantId}
      />
    </>
  );
}
