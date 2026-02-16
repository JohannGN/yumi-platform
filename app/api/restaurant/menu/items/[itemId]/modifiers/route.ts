// ============================================================
// GET /api/restaurant/menu/items/[itemId]/modifiers
// Returns modifier groups + options for a specific menu item
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const supabase = await createServerSupabaseClient();

    // 1. Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Verify role = restaurant
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'restaurant') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 3. Verify item belongs to user's restaurant
    const { data: item } = await supabase
      .from('menu_items')
      .select('id, restaurant_id, restaurants!inner(owner_id)')
      .eq('id', itemId)
      .single();

    if (!item || (item.restaurants as any).owner_id !== user.id) {
      return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 });
    }

    // 4. Fetch modifier groups with their modifiers
    const { data: groups, error: groupsError } = await supabase
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
      .eq('menu_item_id', itemId)
      .order('display_order', { ascending: true });

    if (groupsError) {
      console.error('Error fetching modifier groups:', groupsError);
      return NextResponse.json({ error: 'Error al cargar modificadores' }, { status: 500 });
    }

    // Sort modifiers within each group by display_order
    const sortedGroups = (groups || []).map((group) => ({
      ...group,
      item_modifiers: (group.item_modifiers || []).sort(
        (a: any, b: any) => a.display_order - b.display_order
      ),
    }));

    return NextResponse.json({ groups: sortedGroups });
  } catch (error) {
    console.error('Error in GET modifiers:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
