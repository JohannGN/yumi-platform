// ============================================================
// PATCH /api/agent/menu-items/[id]/toggle — Encender/apagar plato
// Chat: AGENTE-3
// REGLA #151: Funciona en CUALQUIER restaurante
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { checkAgentPermission } from '@/lib/agent-permissions';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !AGENT_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Check permission
    const canToggle = await checkAgentPermission(user.id, userData.role, 'can_disable_menu_items');
    if (!canToggle) {
      return NextResponse.json({ error: 'No tienes permiso para modificar platos' }, { status: 403 });
    }

    const body = await request.json();
    const { is_available, notes } = body;

    if (typeof is_available !== 'boolean') {
      return NextResponse.json({ error: 'is_available (boolean) requerido' }, { status: 400 });
    }

    const sc = createServiceRoleClient();

    // Get current state
    const { data: existing } = await sc
      .from('menu_items')
      .select('id, name, is_available, restaurant_id')
      .eq('id', itemId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 });
    }

    // Update
    const { data: item, error } = await sc
      .from('menu_items')
      .update({ is_available })
      .eq('id', itemId)
      .select('id, name, is_available')
      .single();

    if (error) {
      console.error('[agent/menu-items/toggle PATCH]', error);
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }

    // Auditoría
    await sc.from('menu_item_audit_log').insert({
      menu_item_id: itemId,
      restaurant_id: existing.restaurant_id,
      action: is_available ? 'enabled' : 'disabled',
      changed_by_user_id: user.id,
      changed_by_role: userData.role,
      source: 'agent_panel',
      old_value: String(existing.is_available),
      new_value: String(is_available),
      notes: notes || null,
    });

    return NextResponse.json(item);
  } catch (err) {
    console.error('[agent/menu-items/toggle PATCH]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
