import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderModifier {
  modifier_id: string;
  name: string;
  price_cents: number;
}

interface OrderItemPayload {
  item_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  modifiers?: OrderModifier[];
}

interface CreateOrderPayload {
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_instructions?: string;
  payment_method: 'cash' | 'pos' | 'yape' | 'plin';
  items: OrderItemPayload[];
  notes?: string;
  fee_is_manual?: boolean;
  fee_calculated_cents?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function roundUpCents(cents: number): number {
  return Math.ceil(cents / 10) * 10;
}

// ─── GET — lista de pedidos admin ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!userData || !['owner', 'city_admin', 'agent'].includes(userData.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const status = searchParams.get('status');
    const restaurantId = searchParams.get('restaurant_id');
    const riderId = searchParams.get('rider_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select(`
        id, code, status, payment_method, payment_status,
        customer_name, customer_phone, delivery_address,
        subtotal_cents, delivery_fee_cents, total_cents, discount_cents,
        items, created_at, updated_at, delivered_at, cancelled_at,
        actual_payment_method, rider_bonus_cents,
        fee_is_manual, fee_calculated_cents,
        restaurants(id, name, slug),
        riders(id, users(name))
      `, { count: 'exact' });

    if (userData.role === 'city_admin' && userData.city_id) {
      query = query.eq('city_id', userData.city_id);
    }
    if (status) query = query.eq('status', status);
    if (restaurantId) query = query.eq('restaurant_id', restaurantId);
    if (riderId) query = query.eq('rider_id', riderId);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    if (search) {
      query = query.or(
        `code.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ✅ FIX: Mapear joins anidados a campos planos que espera AdminOrder
    type RawRiderJoin = { id: string; users: { name: string } | null } | null;
    type RawRestJoin  = { id: string; name: string; slug: string }    | null;

    const orders = (data ?? []).map((order) => {
      const riderJoin = order.riders as unknown as RawRiderJoin;
      const restJoin  = order.restaurants as unknown as RawRestJoin;
      return {
        ...order,
        restaurant_name: restJoin?.name  ?? '',
        rider_id:        riderJoin?.id   ?? null,
        rider_name:      riderJoin?.users?.name ?? null,
        // Limpiar objetos anidados (no son parte del tipo AdminOrder)
        riders:      undefined,
        restaurants: undefined,
      };
    });

    return NextResponse.json({
      orders,
      total: count ?? 0,
      page,
      limit,
      pages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    console.error('[admin/orders GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ─── POST — crear pedido desde admin (con modificadores) ─────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!userData || !['owner', 'city_admin', 'agent'].includes(userData.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body: CreateOrderPayload = await req.json();

    const {
      restaurant_id, customer_name, customer_phone, delivery_address,
      delivery_lat, delivery_lng, delivery_instructions, payment_method,
      items, notes, fee_is_manual, fee_calculated_cents,
    } = body;

    if (!restaurant_id || !customer_name || !customer_phone || !delivery_address) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'El pedido debe tener al menos un item' }, { status: 400 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, city_id, is_active, commission_percentage')
      .eq('id', restaurant_id)
      .single();

    if (!restaurant || !restaurant.is_active) {
      return NextResponse.json({ error: 'Restaurante no encontrado o inactivo' }, { status: 404 });
    }

    const itemIds = items.map((i) => i.item_id);
    const { data: dbItems } = await supabase
      .from('menu_items')
      .select('id, name, base_price_cents, is_available')
      .in('id', itemIds)
      .eq('is_available', true);

    const itemPriceMap = new Map(
      (dbItems ?? []).map((i) => [i.id, i.base_price_cents])
    );

    const allModifierIds: string[] = [];
    for (const item of items) {
      for (const mod of item.modifiers ?? []) {
        allModifierIds.push(mod.modifier_id);
      }
    }

    let modifierPriceMap = new Map<string, number>();
    if (allModifierIds.length > 0) {
      const { data: dbModifiers } = await supabase
        .from('item_modifiers')
        .select('id, price_cents')
        .in('id', allModifierIds);
      modifierPriceMap = new Map(
        (dbModifiers ?? []).map((m) => [m.id, m.price_cents])
      );
    }

    let subtotalCents = 0;
    const verifiedItems = items.map((item) => {
      const basePrice = itemPriceMap.get(item.item_id) ?? item.unit_price_cents;
      const modifiersTotal = (item.modifiers ?? []).reduce((sum, mod) => {
        return sum + (modifierPriceMap.get(mod.modifier_id) ?? mod.price_cents);
      }, 0);
      const unitPrice = basePrice + modifiersTotal;
      const total = unitPrice * item.quantity;
      subtotalCents += total;

      return {
        item_id: item.item_id,
        name: item.name,
        quantity: item.quantity,
        unit_price_cents: unitPrice,
        total_cents: total,
        modifiers: (item.modifiers ?? []).map((mod) => ({
          modifier_id: mod.modifier_id,
          name: mod.name,
          price_cents: modifierPriceMap.get(mod.modifier_id) ?? mod.price_cents,
        })),
      };
    });

    const { data: coverageData } = await supabase.rpc('check_coverage', {
      p_lat: delivery_lat,
      p_lng: delivery_lng,
    });
    const coverage = coverageData?.[0];
    const deliveryFeeCents = coverage?.has_coverage
      ? roundUpCents(coverage.base_fee_cents)
      : 0;

    let posSurchargeCents = 0;
    if (payment_method === 'pos') {
      const { data: platformSettings } = await supabase
        .from('platform_settings')
        .select('pos_surcharge_enabled, pos_commission_rate, pos_igv_rate')
        .single();
      if (platformSettings?.pos_surcharge_enabled) {
        const { pos_commission_rate, pos_igv_rate } = platformSettings;
        const base = subtotalCents + deliveryFeeCents;
        posSurchargeCents = roundUpCents(
          Math.round(base * pos_commission_rate * (1 + pos_igv_rate))
        );
      }
    }

    const totalCents = roundUpCents(subtotalCents + deliveryFeeCents + posSurchargeCents);

    const { data: codeData } = await supabase.rpc('generate_order_code');
    const orderCode = codeData as string;

    const { data: newOrder, error: insertError } = await supabase
      .from('orders')
      .insert({
        code: orderCode,
        city_id: restaurant.city_id,
        restaurant_id,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        delivery_address: delivery_address.trim(),
        delivery_lat,
        delivery_lng,
        delivery_zone_id: coverage?.zone_id ?? null,
        delivery_instructions: delivery_instructions?.trim() ?? null,
        items: verifiedItems,
        subtotal_cents: subtotalCents,
        delivery_fee_cents: deliveryFeeCents,
        service_fee_cents: posSurchargeCents,
        discount_cents: 0,
        total_cents: totalCents,
        payment_method,
        payment_status: 'pending',
        status: 'pending_confirmation',
        source: 'admin',
        notes: notes ?? null,
        fee_is_manual: fee_is_manual ?? false,
        fee_calculated_cents: fee_calculated_cents ?? 0,
      })
      .select('id, code, total_cents, status')
      .single();

    if (insertError) {
      console.error('[admin/orders POST] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        order: {
          id: newOrder!.id,
          code: newOrder!.code,
          status: newOrder!.status,
          total_cents: newOrder!.total_cents,
        },
        message: 'Pedido creado exitosamente',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[admin/orders POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
