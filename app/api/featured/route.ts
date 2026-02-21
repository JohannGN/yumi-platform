// ============================================================
// YUMI — Featured Dishes API
// GET /api/featured?city_id=UUID&limit=12
// Returns random available dishes with restaurant info
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get('city_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 20);

  if (!cityId) {
    return NextResponse.json({ dishes: [] });
  }

  const supabase = await createServerSupabaseClient();

  // Fetch available dishes from active + open restaurants
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      id, name, base_price_cents, image_url,
      restaurants!inner(
        id, name, slug, logo_url, default_logo, is_open, is_active, city_id,
        theme_color,
        category:categories(emoji)
      )
    `)
    .eq('restaurants.city_id', cityId)
    .eq('restaurants.is_active', true)
    .eq('restaurants.is_open', true)
    .eq('is_available', true)
    .limit(50); // Fetch more, then randomize

  if (error || !data || data.length === 0) {
    return NextResponse.json({ dishes: [] });
  }

  // Shuffle and pick `limit` items, avoid duplicate restaurants back-to-back
  const shuffled = data.sort(() => Math.random() - 0.5);
  const picked: typeof data = [];
  const seen = new Set<string>();

  // First pass: one dish per restaurant
  for (const item of shuffled) {
    if (picked.length >= limit) break;
    const rest = item.restaurants as unknown as { id: string };
    if (!seen.has(rest.id)) {
      seen.add(rest.id);
      picked.push(item);
    }
  }

  // Second pass: fill remaining with any dish
  if (picked.length < limit) {
    for (const item of shuffled) {
      if (picked.length >= limit) break;
      if (!picked.includes(item)) {
        picked.push(item);
      }
    }
  }

  const dishes = picked.map((item) => {
    const rest = item.restaurants as unknown as {
      id: string;
      name: string;
      slug: string;
      logo_url: string | null;
      default_logo: boolean;
      theme_color: string;
      category: { emoji: string | null } | null;
    };

    return {
      id: item.id,
      name: item.name,
      base_price_cents: item.base_price_cents,
      image_url: item.image_url,
      restaurant_name: rest.name,
      restaurant_slug: rest.slug,
      restaurant_logo_url: rest.logo_url,
      default_logo: rest.default_logo ?? true,
      theme_color: rest.theme_color || 'orange',
      category_emoji: rest.category?.emoji ?? null,
    };
  });

  return NextResponse.json({ dishes });
}