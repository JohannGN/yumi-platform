import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params;
    const supabase = await createServerSupabaseClient();

    // Verificar rol
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['owner', 'city_admin', 'agent'].includes(userData.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // FIX-6: Fetch restaurant commission_mode + commission_percentage for context
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('commission_mode, commission_percentage')
      .eq('id', restaurantId)
      .single();

    // 1. Categorías del restaurante
    const { data: categories, error: catError } = await supabase
      .from('menu_categories')
      .select('id, name, display_order')
      .eq('restaurant_id', restaurantId)
      .eq('is_visible', true)
      .order('display_order');

    if (catError) {
      return NextResponse.json({ error: catError.message }, { status: 500 });
    }

    // 2. Items disponibles con variantes y grupos de modificadores
    // FIX-6: Added commission_percentage to item select
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select(`
        id, name, description, base_price_cents, image_url, menu_category_id,
        display_order, commission_percentage,
        item_variants(id, name, price_cents, is_available, display_order),
        item_modifier_groups(
          id, name, is_required, min_selections, max_selections, display_order,
          item_modifiers(id, name, price_cents, is_default, is_available, display_order)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('display_order');

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Ordenar variantes y modificadores por display_order
    const processedItems = (items ?? []).map((item) => ({
      ...item,
      item_variants: (item.item_variants ?? []).sort(
        (a: { display_order: number }, b: { display_order: number }) =>
          a.display_order - b.display_order
      ),
      item_modifier_groups: (item.item_modifier_groups ?? [])
        .sort(
          (a: { display_order: number }, b: { display_order: number }) =>
            a.display_order - b.display_order
        )
        .map((group: { item_modifiers: { display_order: number; is_available: boolean }[] } & Record<string, unknown>) => ({
          ...group,
          item_modifiers: (group.item_modifiers ?? [])
            .filter((m: { is_available: boolean }) => m.is_available)
            .sort(
              (a: { display_order: number }, b: { display_order: number }) =>
                a.display_order - b.display_order
            ),
        })),
    }));

    return NextResponse.json({
      categories: categories ?? [],
      items: processedItems,
      // FIX-6: Restaurant commission context for admin UI
      commission_mode: restaurant?.commission_mode ?? 'global',
      commission_percentage: restaurant?.commission_percentage ?? 0,
    });
  } catch (err) {
    console.error('[admin/menu] Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
