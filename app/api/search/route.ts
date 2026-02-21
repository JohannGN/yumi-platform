// ============================================================
// YUMI — Search API: Cross-restaurant dish search
// GET /api/search?city_id=UUID&q=string (min 3 chars)
// Returns dishes grouped by restaurant, open first
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get('city_id');
  const q = searchParams.get('q');

  if (!cityId || !q || q.trim().length < 3) {
    return NextResponse.json({ results: [] });
  }

  // Sanitize: escape ilike special chars
  const sanitized = q.trim().replace(/[%_\\]/g, '');
  if (sanitized.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      id, name, base_price_cents, image_url,
      restaurants!inner(
        id, name, slug, logo_url, default_logo, is_open, is_active, city_id,
        category:categories(emoji)
      )
    `)
    .eq('restaurants.city_id', cityId)
    .eq('restaurants.is_active', true)
    .eq('is_available', true)
    .ilike('name', `%${sanitized}%`)
    .limit(30);

  if (error || !data) {
    return NextResponse.json({ results: [] });
  }

  // Group by restaurant
  const grouped = new Map<
    string,
    {
      restaurant_id: string;
      restaurant_name: string;
      restaurant_slug: string;
      restaurant_logo_url: string | null;
      default_logo: boolean;
      category_emoji: string | null;
      is_open: boolean;
      matching_dishes: {
        id: string;
        name: string;
        base_price_cents: number;
        image_url: string | null;
      }[];
    }
  >();

  for (const item of data) {
    // Supabase returns the FK join as a single object (many-to-one)
    const rest = item.restaurants as unknown as {
      id: string;
      name: string;
      slug: string;
      logo_url: string | null;
      default_logo: boolean;
      is_open: boolean;
      is_active: boolean;
      city_id: string;
      category: { emoji: string | null } | null;
    };

    if (!rest) continue;

    if (!grouped.has(rest.id)) {
      grouped.set(rest.id, {
        restaurant_id: rest.id,
        restaurant_name: rest.name,
        restaurant_slug: rest.slug,
        restaurant_logo_url: rest.logo_url,
        default_logo: rest.default_logo ?? true,
        category_emoji: rest.category?.emoji ?? null,
        is_open: rest.is_open,
        matching_dishes: [],
      });
    }

    grouped.get(rest.id)!.matching_dishes.push({
      id: item.id,
      name: item.name,
      base_price_cents: item.base_price_cents,
      image_url: item.image_url,
    });
  }

  // Sort: open restaurants first
  const results = Array.from(grouped.values()).sort(
    (a, b) => (b.is_open ? 1 : 0) - (a.is_open ? 1 : 0)
  );

  return NextResponse.json({ results });
}
