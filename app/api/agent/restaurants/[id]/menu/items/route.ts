// ============================================================
// POST /api/agent/restaurants/[id]/menu/items — Crear plato desde agente
// Chat: AGENTE-3
// REGLA #150: Solo si commission_mode='global' + permiso
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
    const canManage = await checkAgentPermission(user.id, userData.role, 'can_manage_menu_global');
    if (!canManage) {
      return NextResponse.json({ error: 'No tienes permiso para crear platos' }, { status: 403 });
    }

    const sc = createServiceRoleClient();

    // Check restaurant commission_mode
    const { data: restaurant } = await sc
      .from('restaurants')
      .select('id, commission_mode')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    if (restaurant.commission_mode !== 'global') {
      return NextResponse.json({
        error: 'Este restaurante tiene comisión por plato. Contacte al owner para negociar la comisión antes de crear platos.',
      }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, menu_category_id, base_price_cents, image_url, weight_kg, tags } = body;

    if (!name || !base_price_cents) {
      return NextResponse.json({ error: 'Nombre y precio requeridos' }, { status: 400 });
    }

    // Get max display_order
    const { data: lastItem } = await sc
      .from('menu_items')
      .select('display_order')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const { data: item, error: insertError } = await sc
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        menu_category_id: menu_category_id || null,
        name,
        description: description || null,
        base_price_cents: parseInt(base_price_cents),
        image_url: image_url || null,
        weight_kg: weight_kg ? parseFloat(weight_kg) : null,
        tags: tags || [],
        display_order: (lastItem?.display_order || 0) + 1,
      })
      .select()
      .single();

    if (insertError || !item) {
      console.error('[agent/menu/items POST]', insertError);
      return NextResponse.json({ error: 'Error al crear plato' }, { status: 500 });
    }

    // Auditoría
    await sc.from('menu_item_audit_log').insert({
      menu_item_id: item.id,
      restaurant_id: restaurantId,
      action: 'created',
      changed_by_user_id: user.id,
      changed_by_role: userData.role,
      source: 'agent_panel',
      new_value: `${name} - S/ ${(parseInt(base_price_cents) / 100).toFixed(2)}`,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('[agent/menu/items POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
