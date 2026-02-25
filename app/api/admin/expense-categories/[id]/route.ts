// ============================================================
// YUMI PLATFORM — EGRESOS-1
// app/api/admin/expense-categories/[id]/route.ts
// PATCH: editar categoría | DELETE: soft-delete
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAuditAction } from '@/lib/utils/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, icon, is_active, display_order } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (icon !== undefined) updates.icon = icon || null;
    if (is_active !== undefined) updates.is_active = is_active;
    if (display_order !== undefined) updates.display_order = display_order;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    const { data: category, error } = await supabase
      .from('expense_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!category) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });

    logAuditAction(supabase, {
      userId: user.id,
      action: 'update',
      entityType: 'expense_category',
      entityId: id,
      details: updates,
    });

    return NextResponse.json({ category });
  } catch (err) {
    console.error('[admin/expense-categories/[id] PATCH]', err);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verificar si tiene expenses vinculados
    const { count } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if (count && count > 0) {
      // Soft-delete: desactivar en vez de borrar
      const { data: category, error } = await supabase
        .from('expense_categories')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      logAuditAction(supabase, {
        userId: user.id,
        action: 'toggle',
        entityType: 'expense_category',
        entityId: id,
        details: { reason: 'soft_delete', expenses_count: count },
      });

      return NextResponse.json({
        category,
        message: `Categoría desactivada (tiene ${count} egreso(s) vinculados)`,
      });
    }

    // Sin expenses → hard delete
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logAuditAction(supabase, {
      userId: user.id,
      action: 'delete',
      entityType: 'expense_category',
      entityId: id,
      details: {},
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/expense-categories/[id] DELETE]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
