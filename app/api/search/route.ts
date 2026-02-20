import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get('city_id');
    const q = searchParams.get('q');

    if (!cityId || !q || q.trim().length < 2) {
      return NextResponse.json(
        { error: 'Parámetros city_id y q (mínimo 2 caracteres) son requeridos' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('menu_items')
      .select(`
        id, name, base_price_cents, image_url,
        restaurants!inner(
          id, name, slug, logo_url, is_open, is_active, city_id,
          cities!inner(slug)
        )
      `)
      .eq('restaurants.city_id', cityId)
      .eq('restaurants.is_active', true)
      .eq('is_available', true)
      .ilike('name', `%${q.trim()}%`)
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Agrupar por restaurante
    const restaurantMap = new Map<
      string,
      {
        restaurant_id: string;
        restaurant_name: string;
        restaurant_slug: string;
        restaurant_logo_url: string | null;
        city_slug: string;
        is_open: boolean;
        matching_dishes: { id: string; name: string; base_price_cents: number; image_url: string | null }[];
      }
    >();

    for (const item of data ?? []) {
      const rest = item.restaurants as {
        id: string;
        name: string;
        slug: string;
        logo_url: string | null;
        is_open: boolean;
        cities: { slug: string };
      };

      if (!restaurantMap.has(rest.id)) {
        restaurantMap.set(rest.id, {
          restaurant_id: rest.id,
          restaurant_name: rest.name,
          restaurant_slug: rest.slug,
          restaurant_logo_url: rest.logo_url,
          city_slug: rest.cities.slug,
          is_open: rest.is_open,
          matching_dishes: [],
        });
      }

      restaurantMap.get(rest.id)!.matching_dishes.push({
        id: item.id,
        name: item.name,
        base_price_cents: item.base_price_cents,
        image_url: item.image_url,
      });
    }

    // Ordenar: abiertos primero
    const results = Array.from(restaurantMap.values()).sort(
      (a, b) => Number(b.is_open) - Number(a.is_open)
    );

    return NextResponse.json({ type: 'dishes', results });
  } catch (err) {
    console.error('[search] Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
