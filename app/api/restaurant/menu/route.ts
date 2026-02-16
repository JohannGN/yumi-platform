// ============================================================
// /api/restaurant/menu
// GET: all categories + items for this restaurant
// Chat 5 — Fragment 5/7
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getRestaurantId(userId: string) {
  const sc = createServiceClient();
  const { data } = await sc
    .from('restaurants')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_active', true)
    .single();
  return data?.id || null;
}

export async function GET() {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const restaurantId = await getRestaurantId(user.id);
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 404 });

    const sc = createServiceClient();

    // Get categories
    const { data: categories } = await sc
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order');

    // Get items with variants and modifiers
    const { data: items } = await sc
      .from('menu_items')
      .select(`
        *,
        item_variants ( * ),
        item_modifier_groups (
          *,
          item_modifiers ( * )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('display_order');

    return NextResponse.json({
      categories: categories || [],
      items: items || [],
    });
  } catch (err) {
    console.error('[/api/restaurant/menu] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
