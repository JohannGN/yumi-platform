import { createClient } from '@/lib/supabase/client';
import type { ItemModifierGroup } from '@/types/database';

// ============================================================
// MODIFIER QUERIES
// ============================================================

/**
 * Obtiene los grupos de modificadores de un menu_item con sus opciones.
 * Client-side — llamada individual (ya no se usa si usas getRestaurantModifiers).
 */
export async function getModifierGroups(
  menuItemId: string
): Promise<ItemModifierGroup[]> {
  const supabase = createClient();

  const { data, error } = await supabase
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
    .eq('menu_item_id', menuItemId)
    .order('display_order', { ascending: true })
    .order('display_order', {
      referencedTable: 'item_modifiers',
      ascending: true,
    });

  if (error) {
    console.error('Error fetching modifier groups:', error);
    return [];
  }

  return (data ?? []).map((group) => ({
    ...group,
    item_modifiers: (group.item_modifiers ?? []).filter(
      (mod) => mod.is_available
    ),
  }));
}

/**
 * Fetch ALL modifier groups for ALL items of a restaurant in one query.
 * Called once on restaurant page load — no per-item fetching needed.
 * Returns a map: { [menu_item_id]: ItemModifierGroup[] }
 */
export async function getRestaurantModifiers(
  restaurantId: string
): Promise<Record<string, ItemModifierGroup[]>> {
  const supabase = createClient();

  // Step 1: get all menu_item IDs for this restaurant
  const { data: menuItems, error: itemsError } = await supabase
    .from('menu_items')
    .select('id')
    .eq('restaurant_id', restaurantId);

  if (itemsError || !menuItems || menuItems.length === 0) {
    return {};
  }

  const itemIds = menuItems.map((i) => i.id);

  // Step 2: fetch all modifier groups for those items in ONE query
  const { data, error } = await supabase
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
    .in('menu_item_id', itemIds)
    .order('display_order', { ascending: true })
    .order('display_order', {
      referencedTable: 'item_modifiers',
      ascending: true,
    });

  if (error) {
    console.error('Error fetching restaurant modifiers:', error);
    return {};
  }

  if (!data) return {};

  // Step 3: group by menu_item_id, filter unavailable modifiers
  const map: Record<string, ItemModifierGroup[]> = {};

  for (const group of data) {
    const available = (group.item_modifiers ?? []).filter(
      (mod) => mod.is_available
    );

    // Skip groups with no available modifiers
    if (available.length === 0) continue;

    const cleaned: ItemModifierGroup = {
      ...group,
      item_modifiers: available,
    };

    const key = group.menu_item_id;
    if (!map[key]) map[key] = [];
    map[key].push(cleaned);
  }

  return map;
}