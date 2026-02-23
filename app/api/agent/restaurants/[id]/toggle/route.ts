// ============================================================
// POST /api/agent/restaurants/[id]/toggle — Abrir/cerrar restaurante
// Chat: AGENTE-3
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { checkAgentPermission } from '@/lib/agent-permissions';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params;
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
    const canToggle = await checkAgentPermission(user.id, userData.role, 'can_toggle_restaurants');
    if (!canToggle) {
      return NextResponse.json({ error: 'No tienes permiso para abrir/cerrar restaurantes' }, { status: 403 });
    }

    const body = await request.json();
    const { is_open } = body;

    if (typeof is_open !== 'boolean') {
      return NextResponse.json({ error: 'is_open (boolean) requerido' }, { status: 400 });
    }

    const sc = createServiceRoleClient();

    const { data: restaurant, error } = await sc
      .from('restaurants')
      .update({ is_open })
      .eq('id', restaurantId)
      .select('id, name, is_open')
      .single();

    if (error || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    return NextResponse.json(restaurant);
  } catch (err) {
    console.error('[agent/restaurants/toggle POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
