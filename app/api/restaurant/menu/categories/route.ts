// ============================================================
// /api/restaurant/menu/categories
// POST: create | PATCH: update | DELETE: delete
// Chat 5 — Fragment 5/7
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const restaurantId = await getRestaurantId(user.id);
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 404 });

    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    }

    const sc = createServiceClient();

    const { data: lastCat } = await sc
      .from('menu_categories')
      .select('display_order')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const { data: category, error } = await sc
      .from('menu_categories')
      .insert({
        restaurant_id: restaurantId,
        name: body.name.trim(),
        description: body.description || null,
        display_order: (lastCat?.display_order || 0) + 1,
      })
      .select()
      .single();

    if (error) {
      console.error('[menu/categories POST]', error);
      return NextResponse.json({ error: 'Error al crear' }, { status: 500 });
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error('[menu/categories POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const restaurantId = await getRestaurantId(user.id);
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 404 });

    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const sc = createServiceClient();
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description || null;
    if (body.is_visible !== undefined) update.is_visible = body.is_visible;
    if (body.display_order !== undefined) update.display_order = body.display_order;

    const { data: category, error } = await sc
      .from('menu_categories')
      .update(update)
      .eq('id', body.id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) {
      console.error('[menu/categories PATCH]', error);
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }

    return NextResponse.json({ category });
  } catch (err) {
    console.error('[menu/categories PATCH]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const restaurantId = await getRestaurantId(user.id);
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const sc = createServiceClient();

    // Items in this category will have menu_category_id set to NULL (ON DELETE SET NULL)
    const { error } = await sc
      .from('menu_categories')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurantId);

    if (error) {
      console.error('[menu/categories DELETE]', error);
      return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[menu/categories DELETE]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
