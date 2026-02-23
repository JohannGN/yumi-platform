// ============================================================
// /api/restaurant/menu/items
// POST: create item | PATCH: update item | DELETE: delete item
// Also handles: toggle availability via PATCH with {is_available}
// Chat 5 — Fragment 5/7 | FIX-6: +commission_percentage per item
// AGENTE-3: +audit logging on all mutations (rule #153)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getRestaurantId(userId: string) {
  const sc = createServiceClient();
  const { data } = await sc
    .from('restaurants')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_active', true)
    .single();
  return data?.id || null;
}

// AGENTE-3: Fire-and-forget audit log helper
async function logMenuAudit(
  sc: ReturnType<typeof createServiceClient>,
  params: {
    menu_item_id: string;
    restaurant_id: string;
    action: string;
    changed_by_user_id: string;
    changed_by_role: string;
    source: string;
    old_value?: string | null;
    new_value?: string | null;
    notes?: string | null;
  }
) {
  try {
    await sc.from('menu_item_audit_log').insert({
      menu_item_id: params.menu_item_id,
      restaurant_id: params.restaurant_id,
      action: params.action,
      changed_by_user_id: params.changed_by_user_id,
      changed_by_role: params.changed_by_role,
      source: params.source,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
      notes: params.notes ?? null,
    });
  } catch {
    // Audit failure is non-blocking
  }
}

// ─── CREATE ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const restaurantId = await getRestaurantId(user.id);
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 404 });

    const body = await request.json();
    const {
      name, description, menu_category_id, base_price_cents, image_url,
      weight_kg, tags, commission_percentage, // FIX-6
    } = body;

    if (!name || !base_price_cents) {
      return NextResponse.json({ error: 'Nombre y precio requeridos' }, { status: 400 });
    }

    const sc = createServiceClient();

    // Get max display_order
    const { data: lastItem } = await sc
      .from('menu_items')
      .select('display_order')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const insertData: Record<string, unknown> = {
      restaurant_id: restaurantId,
      menu_category_id: menu_category_id || null,
      name,
      description: description || null,
      base_price_cents: parseInt(base_price_cents),
      image_url: image_url || null,
      weight_kg: weight_kg ? parseFloat(weight_kg) : null,
      tags: tags || [],
      display_order: (lastItem?.display_order || 0) + 1,
    };

    // FIX-6: Save commission_percentage if provided (used when commission_mode='per_item')
    // NULL = use restaurant global fallback
    if (commission_percentage !== undefined && commission_percentage !== null && commission_percentage !== '') {
      insertData.commission_percentage = parseFloat(commission_percentage);
    }

    const { data: item, error } = await sc
      .from('menu_items')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[menu/items POST]', error);
      return NextResponse.json({ error: 'Error al crear' }, { status: 500 });
    }

    // AGENTE-3: Audit log
    await logMenuAudit(sc, {
      menu_item_id: item.id,
      restaurant_id: restaurantId,
      action: 'created',
      changed_by_user_id: user.id,
      changed_by_role: 'restaurant',
      source: 'restaurant_panel',
      new_value: `${name} - S/ ${(parseInt(base_price_cents) / 100).toFixed(2)}`,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('[menu/items POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ─── UPDATE ─────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const restaurantId = await getRestaurantId(user.id);
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 404 });

    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const sc = createServiceClient();

    // Verify ownership — AGENTE-3: select name too for audit
    const { data: existing } = await sc
      .from('menu_items')
      .select('id, name, base_price_cents, is_available')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 });
    }

    // Build safe update
    const update: Record<string, unknown> = {};
    if (fields.name !== undefined) update.name = fields.name;
    if (fields.description !== undefined) update.description = fields.description || null;
    if (fields.menu_category_id !== undefined) update.menu_category_id = fields.menu_category_id || null;
    if (fields.base_price_cents !== undefined) update.base_price_cents = parseInt(fields.base_price_cents);
    if (fields.image_url !== undefined) update.image_url = fields.image_url || null;
    if (fields.is_available !== undefined) update.is_available = fields.is_available;
    if (fields.stock_quantity !== undefined) update.stock_quantity = fields.stock_quantity;
    if (fields.weight_kg !== undefined) update.weight_kg = fields.weight_kg ? parseFloat(fields.weight_kg) : null;
    if (fields.tags !== undefined) update.tags = fields.tags;
    if (fields.display_order !== undefined) update.display_order = fields.display_order;

    // FIX-6: commission_percentage per item
    // Empty string or null → NULL (fallback to restaurant global)
    if (fields.commission_percentage !== undefined) {
      update.commission_percentage = (fields.commission_percentage !== null && fields.commission_percentage !== '')
        ? parseFloat(fields.commission_percentage)
        : null;
    }

    const { data: item, error } = await sc
      .from('menu_items')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[menu/items PATCH]', error);
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }

    // AGENTE-3: Audit log — determine action from fields changed
    let auditAction = 'updated';
    let oldVal: string | null = null;
    let newVal: string | null = null;

    if (fields.is_available !== undefined) {
      auditAction = fields.is_available ? 'enabled' : 'disabled';
      oldVal = String(existing.is_available);
      newVal = String(fields.is_available);
    } else if (fields.base_price_cents !== undefined) {
      auditAction = 'price_changed';
      oldVal = `S/ ${(existing.base_price_cents / 100).toFixed(2)}`;
      newVal = `S/ ${(parseInt(fields.base_price_cents) / 100).toFixed(2)}`;
    } else if (fields.name !== undefined) {
      auditAction = 'name_changed';
      oldVal = existing.name;
      newVal = fields.name;
    } else if (fields.stock_quantity !== undefined) {
      auditAction = 'stock_changed';
      newVal = String(fields.stock_quantity);
    }

    await logMenuAudit(sc, {
      menu_item_id: id,
      restaurant_id: restaurantId,
      action: auditAction,
      changed_by_user_id: user.id,
      changed_by_role: 'restaurant',
      source: 'restaurant_panel',
      old_value: oldVal,
      new_value: newVal,
    });

    return NextResponse.json({ item });
  } catch (err) {
    console.error('[menu/items PATCH]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ─── DELETE ─────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const restaurantId = await getRestaurantId(user.id);
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const sc = createServiceClient();

    // Verify ownership — AGENTE-3: select name for audit
    const { data: existing } = await sc
      .from('menu_items')
      .select('id, name')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 });
    }

    const { error } = await sc
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[menu/items DELETE]', error);
      return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
    }

    // AGENTE-3: Audit log
    await logMenuAudit(sc, {
      menu_item_id: id,
      restaurant_id: restaurantId,
      action: 'deleted',
      changed_by_user_id: user.id,
      changed_by_role: 'restaurant',
      source: 'restaurant_panel',
      old_value: existing.name,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[menu/items DELETE]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
