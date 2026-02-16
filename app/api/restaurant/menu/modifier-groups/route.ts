// ============================================================
// POST /api/restaurant/menu/modifier-groups
// Creates a new modifier group for a menu item
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Verify role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'restaurant') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 3. Parse body
    const body = await request.json();
    const { menu_item_id, name, is_required, min_selections, max_selections } = body;

    if (!menu_item_id || !name?.trim()) {
      return NextResponse.json({ error: 'Nombre y plato son requeridos' }, { status: 400 });
    }

    // 4. Verify item belongs to user's restaurant
    const { data: item } = await supabase
      .from('menu_items')
      .select('id, restaurant_id, restaurants!inner(owner_id)')
      .eq('id', menu_item_id)
      .single();

    if (!item || (item.restaurants as any).owner_id !== user.id) {
      return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 });
    }

    // 5. Validate constraints
    const minSel = typeof min_selections === 'number' ? min_selections : 0;
    const maxSel = typeof max_selections === 'number' ? max_selections : 1;
    const required = Boolean(is_required);

    if (required && minSel < 1) {
      return NextResponse.json(
        { error: 'Si es obligatorio, mínimo debe ser ≥ 1' },
        { status: 400 }
      );
    }

    if (minSel > maxSel) {
      return NextResponse.json(
        { error: 'Mínimo no puede ser mayor que máximo' },
        { status: 400 }
      );
    }

    // 6. Get next display_order
    const { data: existingGroups } = await supabase
      .from('item_modifier_groups')
      .select('display_order')
      .eq('menu_item_id', menu_item_id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existingGroups && existingGroups.length > 0
      ? existingGroups[0].display_order + 1
      : 0;

    // 7. Create group
    const { data: group, error: insertError } = await supabase
      .from('item_modifier_groups')
      .insert({
        menu_item_id,
        name: name.trim(),
        is_required: required,
        min_selections: minSel,
        max_selections: maxSel,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating modifier group:', insertError);
      return NextResponse.json({ error: 'Error al crear grupo' }, { status: 500 });
    }

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error('Error in POST modifier-groups:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
