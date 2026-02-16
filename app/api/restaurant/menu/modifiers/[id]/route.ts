// ============================================================
// PATCH/DELETE /api/restaurant/menu/modifiers/[id]
// Edit or delete a modifier option
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Helper: verify ownership of modifier
async function verifyModifierOwnership(supabase: any, modifierId: string, userId: string) {
  const { data: modifier } = await supabase
    .from('item_modifiers')
    .select(`
      id,
      modifier_group_id,
      item_modifier_groups!inner(
        menu_item_id,
        menu_items!inner(
          restaurant_id,
          restaurants!inner(owner_id)
        )
      )
    `)
    .eq('id', modifierId)
    .single();

  if (!modifier) return null;

  const ownerMatch =
    (modifier.item_modifier_groups as any).menu_items.restaurants.owner_id === userId;
  return ownerMatch ? modifier : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // 3. Ownership
    const modifier = await verifyModifierOwnership(supabase, id, user.id);
    if (!modifier) {
      return NextResponse.json({ error: 'Opción no encontrada' }, { status: 404 });
    }

    // 4. Parse & build updates
    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: 'Nombre no puede estar vacío' }, { status: 400 });
      }
      updates.name = body.name.trim();
    }
    if (body.price_cents !== undefined) {
      updates.price_cents = Math.max(0, Math.round(body.price_cents));
    }
    if (body.is_default !== undefined) updates.is_default = Boolean(body.is_default);
    if (body.is_available !== undefined) updates.is_available = Boolean(body.is_available);
    if (body.display_order !== undefined) updates.display_order = body.display_order;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos a actualizar' }, { status: 400 });
    }

    // 5. Update
    const { data: updated, error: updateError } = await supabase
      .from('item_modifiers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating modifier:', updateError);
      return NextResponse.json({ error: 'Error al actualizar opción' }, { status: 500 });
    }

    return NextResponse.json({ modifier: updated });
  } catch (error) {
    console.error('Error in PATCH modifiers:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // 3. Ownership
    const modifier = await verifyModifierOwnership(supabase, id, user.id);
    if (!modifier) {
      return NextResponse.json({ error: 'Opción no encontrada' }, { status: 404 });
    }

    // 4. Delete
    const { error: deleteError } = await supabase
      .from('item_modifiers')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting modifier:', deleteError);
      return NextResponse.json({ error: 'Error al eliminar opción' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE modifiers:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
