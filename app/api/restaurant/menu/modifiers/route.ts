// ============================================================
// POST /api/restaurant/menu/modifiers
// Creates a new modifier option in a group
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Role
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
    const { modifier_group_id, name, price_cents, is_default, is_available } = body;

    if (!modifier_group_id || !name?.trim()) {
      return NextResponse.json({ error: 'Grupo y nombre son requeridos' }, { status: 400 });
    }

    // 4. Verify group belongs to user's restaurant
    const { data: group } = await supabase
      .from('item_modifier_groups')
      .select(`
        id,
        menu_items!inner(
          restaurant_id,
          restaurants!inner(owner_id)
        )
      `)
      .eq('id', modifier_group_id)
      .single();

    if (!group || (group.menu_items as any).restaurants.owner_id !== user.id) {
      return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
    }

    // 5. Get next display_order
    const { data: existing } = await supabase
      .from('item_modifiers')
      .select('display_order')
      .eq('modifier_group_id', modifier_group_id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    // 6. Validate price_cents
    const priceCents = typeof price_cents === 'number' ? Math.max(0, Math.round(price_cents)) : 0;

    // 7. Create modifier
    const { data: modifier, error: insertError } = await supabase
      .from('item_modifiers')
      .insert({
        modifier_group_id,
        name: name.trim(),
        price_cents: priceCents,
        is_default: Boolean(is_default),
        is_available: is_available !== false,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating modifier:', insertError);
      return NextResponse.json({ error: 'Error al crear opción' }, { status: 500 });
    }

    return NextResponse.json({ modifier }, { status: 201 });
  } catch (error) {
    console.error('Error in POST modifiers:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
