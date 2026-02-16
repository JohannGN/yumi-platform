// ============================================================
// PATCH/DELETE /api/restaurant/menu/modifier-groups/[id]
// Edit or delete a modifier group
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Helper: verify ownership of modifier group
async function verifyGroupOwnership(supabase: any, groupId: string, userId: string) {
  const { data: group } = await supabase
    .from('item_modifier_groups')
    .select(`
      id,
      menu_item_id,
      menu_items!inner(
        restaurant_id,
        restaurants!inner(owner_id)
      )
    `)
    .eq('id', groupId)
    .single();

  if (!group) return null;

  const ownerMatch = (group.menu_items as any).restaurants.owner_id === userId;
  return ownerMatch ? group : null;
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

    // 2. Role check
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'restaurant') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 3. Ownership
    const group = await verifyGroupOwnership(supabase, id, user.id);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
    }

    // 4. Parse & validate
    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: 'Nombre no puede estar vacío' }, { status: 400 });
      }
      updates.name = body.name.trim();
    }
    if (body.is_required !== undefined) updates.is_required = Boolean(body.is_required);
    if (body.min_selections !== undefined) updates.min_selections = body.min_selections;
    if (body.max_selections !== undefined) updates.max_selections = body.max_selections;
    if (body.display_order !== undefined) updates.display_order = body.display_order;

    // Validate constraints after merge
    const finalRequired = updates.is_required ?? body.is_required;
    const finalMin = updates.min_selections ?? body.min_selections;
    const finalMax = updates.max_selections ?? body.max_selections;

    if (finalRequired !== undefined && finalMin !== undefined) {
      if (finalRequired && finalMin < 1) {
        return NextResponse.json(
          { error: 'Si es obligatorio, mínimo debe ser ≥ 1' },
          { status: 400 }
        );
      }
    }

    if (finalMin !== undefined && finalMax !== undefined) {
      if (finalMin > finalMax) {
        return NextResponse.json(
          { error: 'Mínimo no puede ser mayor que máximo' },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos a actualizar' }, { status: 400 });
    }

    // 5. Update
    const { data: updated, error: updateError } = await supabase
      .from('item_modifier_groups')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating modifier group:', updateError);
      return NextResponse.json({ error: 'Error al actualizar grupo' }, { status: 500 });
    }

    return NextResponse.json({ group: updated });
  } catch (error) {
    console.error('Error in PATCH modifier-groups:', error);
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
    const group = await verifyGroupOwnership(supabase, id, user.id);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
    }

    // 4. Delete (CASCADE removes all modifiers)
    const { error: deleteError } = await supabase
      .from('item_modifier_groups')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting modifier group:', deleteError);
      return NextResponse.json({ error: 'Error al eliminar grupo' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE modifier-groups:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
