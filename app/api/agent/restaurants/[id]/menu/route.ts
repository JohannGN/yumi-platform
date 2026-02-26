// ============================================================
// GET /api/agent/restaurants/[id]/menu — Ver menú de un restaurante
// Chat: AGENTE-3
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getAgentPermissions } from '@/lib/agent-permissions';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

export async function GET(
  _request: NextRequest,
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

    const sc = createServiceRoleClient();

    // Get restaurant info
    const { data: restaurant } = await sc
      .from('restaurants')
      .select('id, name, commission_mode, commission_percentage')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    // Get permissions
    const perms = await getAgentPermissions(user.id, userData.role);
    const canCreateItems = restaurant.commission_mode === 'global' && perms.can_manage_menu_global;
    const canToggleItems = perms.can_disable_menu_items;

    // Categories
    const { data: categories } = await sc
      .from('menu_categories')
      .select('id, name, display_order')
      .eq('restaurant_id', restaurantId)
      .eq('is_visible', true)
      .order('display_order');

    // Items (ALL, not just available — agent needs to see disabled ones too)
    const { data: items } = await sc
      .from('menu_items')
      .select(`
        id, name, description, base_price_cents, image_url, menu_category_id,
        is_available, display_order, commission_percentage,
        item_variants(id, name, price_cents, is_available, display_order)
      `)
      .eq('restaurant_id', restaurantId)
      .order('display_order');

    // Process items
    const processedItems = (items ?? []).map((item: Record<string, unknown>) => ({
      ...item,
      item_variants: ((item.item_variants as { display_order: number }[]) ?? []).sort(
        (a: { display_order: number }, b: { display_order: number }) =>
          a.display_order - b.display_order
      ),
    }));

    // Recent audit logs (last 5 per item, grouped)
    const itemIds = processedItems.map((i: Record<string, unknown>) => i.id);
    let auditByItem: Record<string, Array<{
      id: string;
      action: string;
      changed_by_name: string;
      changed_by_role: string;
      source: string;
      old_value: string | null;
      new_value: string | null;
      notes: string | null;
      created_at: string;
    }>> = {};

    if (itemIds.length > 0) {
      const { data: auditLogs } = await sc
        .from('menu_item_audit_log')
        .select('id, menu_item_id, action, changed_by_user_id, changed_by_role, source, old_value, new_value, notes, created_at')
        .in('menu_item_id', itemIds)
        .order('created_at', { ascending: false })
        .limit(100);

      // Get user names for audit
      if (auditLogs && auditLogs.length > 0) {
        const userIds = [...new Set(auditLogs.filter((l: Record<string, unknown>) => l.changed_by_user_id).map((l: Record<string, unknown>) => l.changed_by_user_id))];
        const { data: auditUsers } = await sc
          .from('users')
          .select('id, name')
          .in('id', userIds);

        const nameMap: Record<string, string> = {};
        (auditUsers ?? []).forEach((u: { id: string; name: string }) => { nameMap[u.id] = u.name; });

        // Group by item, max 5 each
        for (const log of auditLogs) {
          const key = log.menu_item_id;
          if (!auditByItem[key]) auditByItem[key] = [];
          if (auditByItem[key].length < 5) {
            auditByItem[key].push({
              id: log.id,
              action: log.action,
              changed_by_name: nameMap[log.changed_by_user_id] ?? 'Sistema',
              changed_by_role: log.changed_by_role,
              source: log.source,
              old_value: log.old_value,
              new_value: log.new_value,
              notes: log.notes,
              created_at: log.created_at,
            });
          }
        }
      }
    }

    // Attach audit to items
    const itemsWithAudit = processedItems.map((item: Record<string, unknown>) => ({
      ...item,
      recent_audit: auditByItem[item.id as string] ?? [],
    }));

    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        commission_mode: restaurant.commission_mode,
        commission_percentage: restaurant.commission_percentage,
      },
      categories: categories ?? [],
      items: itemsWithAudit,
      can_create_items: canCreateItems,
      can_toggle_items: canToggleItems,
    });
  } catch (err) {
    console.error('[agent/restaurants/menu GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
