import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Header } from '@/components/shared/header';
import { RestaurantPageClient } from '@/components/restaurant/restaurant-page-client';
import type { Restaurant, MenuCategory, MenuItem, ItemModifierGroup } from '@/types/database';

interface RestaurantPageProps {
  params: Promise<{ city: string; restaurant: string }>;
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const { city: citySlug, restaurant: restSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: city } = await supabase
    .from('cities')
    .select('id, name, slug')
    .eq('slug', citySlug)
    .eq('is_active', true)
    .single();

  if (!city) notFound();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*, category:categories(id, name, slug, emoji)')
    .eq('city_id', city.id)
    .eq('slug', restSlug)
    .eq('is_active', true)
    .single();

  if (!restaurant) notFound();
  const typedRestaurant = restaurant as Restaurant;

  // Step 1: menu categories + menu items in parallel
  const [menuCatsRes, menuItemsRes] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', typedRestaurant.id)
      .eq('is_visible', true)
      .order('display_order'),
    supabase
      .from('menu_items')
      .select('*, variants:item_variants(*)')
      .eq('restaurant_id', typedRestaurant.id)
      .order('display_order'),
  ]);

  const menuCategories = (menuCatsRes.data as MenuCategory[]) ?? [];
  const menuItems = (menuItemsRes.data as MenuItem[]) ?? [];

  // Step 2: fetch ALL modifiers for this restaurant's items in ONE query
  const itemIds = menuItems.map((i) => i.id);
  let modifiersByItem: Record<string, ItemModifierGroup[]> = {};

  if (itemIds.length > 0) {
    const { data: rawModifiers } = await supabase
      .from('item_modifier_groups')
      .select(`
        id,
        menu_item_id,
        name,
        is_required,
        min_selections,
        max_selections,
        display_order,
        created_at,
        updated_at,
        item_modifiers (
          id,
          modifier_group_id,
          name,
          price_cents,
          is_default,
          is_available,
          display_order,
          created_at,
          updated_at
        )
      `)
      .in('menu_item_id', itemIds)
      .order('display_order');

    for (const group of (rawModifiers ?? []) as ItemModifierGroup[]) {
      const available = (group.item_modifiers ?? []).filter((m) => m.is_available);
      if (available.length === 0) continue;

      const cleaned: ItemModifierGroup = { ...group, item_modifiers: available };
      const key = group.menu_item_id;
      if (!modifiersByItem[key]) modifiersByItem[key] = [];
      modifiersByItem[key].push(cleaned);
    }
  }

  return (
    <>
      <Header cityName={city.name} citySlug={citySlug} />
      <RestaurantPageClient
        restaurant={typedRestaurant}
        menuCategories={menuCategories}
        menuItems={menuItems}
        modifiersByItem={modifiersByItem}
        citySlug={citySlug}
        cityName={city.name}
      />
    </>
  );
}
