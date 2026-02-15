import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Header } from '@/components/shared/header';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { CategoriesScroll } from './categories-scroll';
import { RestaurantList } from './restaurant-list';
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

  return (
    <>
      <Header cityName={typedCity.name} citySlug={typedCity.slug} />

      <div className="pb-8">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: typedCity.name, href: `/${typedCity.slug}` }]} />

        {/* Categories — horizontal scroll with filter */}
        <CategoriesScroll
          categories={categories}
          citySlug={typedCity.slug}
          activeCategory={categoryFilter || null}
        />

        {/* Restaurants */}
        <RestaurantList
          restaurants={restaurants}
          categories={categories}
          citySlug={typedCity.slug}
          cityName={typedCity.name}
          activeCategory={categoryFilter || null}
        />
      </div>
    </>
  );
}