import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { AgentCreateOrderPayload } from '@/types/agent-panel';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id, is_active')
      .eq('id', user.id)
      .single();

    if (!userData || !userData.is_active || !AGENT_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body: AgentCreateOrderPayload = await request.json();

    // Validate required fields
    if (!body.city_id || !body.restaurant_id || !body.customer_name || !body.customer_phone ||
        !body.delivery_address || body.delivery_lat == null || body.delivery_lng == null ||
        !body.items || body.items.length === 0 || !body.payment_method) {
      return NextResponse.json({ error: 'Campos requeridos incompletos' }, { status: 400 });
    }

    // Validate city access
    if (userData.role === 'city_admin' && userData.city_id !== body.city_id) {
      return NextResponse.json({ error: 'Sin acceso a esta ciudad' }, { status: 403 });
    }
    if (userData.role === 'agent') {
      const { data: ac } = await supabase
        .from('agent_cities')
        .select('id')
        .eq('user_id', user.id)
        .eq('city_id', body.city_id)
        .limit(1);

      if (!ac || ac.length === 0) {
        return NextResponse.json({ error: 'Sin acceso a esta ciudad' }, { status: 403 });
      }
    }

    const serviceClient = createServiceRoleClient();

    // Validate restaurant exists and belongs to city
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('id, city_id, is_active')
      .eq('id', body.restaurant_id)
      .single();

    if (!restaurant || restaurant.city_id !== body.city_id || !restaurant.is_active) {
      return NextResponse.json({ error: 'Restaurante inválido o inactivo' }, { status: 400 });
    }

    // Server-side price recalculation
    const itemIds = body.items.map((i) => i.item_id);
    const { data: menuItems } = await serviceClient
      .from('menu_items')
      .select('id, base_price_cents, is_available')
      .in('id', itemIds);

    const menuMap: Record<string, number> = {};
    for (const mi of menuItems ?? []) {
      menuMap[mi.id] = mi.base_price_cents;
    }

    // Validate variant prices too
    const variantIds = body.items.filter((i) => i.variant_id).map((i) => i.variant_id as string);
    let variantMap: Record<string, number> = {};
    if (variantIds.length > 0) {
      const { data: variants } = await serviceClient
        .from('item_variants')
        .select('id, price_cents')
        .in('id', variantIds);

      for (const v of variants ?? []) {
        variantMap[v.id] = v.price_cents;
      }
    }

    // Recalculate items with server prices
    let subtotalCents = 0;
    const recalculatedItems = body.items.map((item) => {
      let unitPrice: number;
      if (item.variant_id && variantMap[item.variant_id] !== undefined) {
        unitPrice = variantMap[item.variant_id];
      } else if (menuMap[item.item_id] !== undefined) {
        unitPrice = menuMap[item.item_id];
      } else {
        unitPrice = item.unit_price_cents; // fallback to submitted price
      }

      // Add modifier prices
      let modifiersTotal = 0;
      if (item.modifiers && item.modifiers.length > 0) {
        modifiersTotal = item.modifiers.reduce((sum, m) => sum + m.price_cents, 0);
      }

      const totalPerUnit = unitPrice + modifiersTotal;
      const itemTotal = totalPerUnit * item.quantity;
      subtotalCents += itemTotal;

      return {
        item_id: item.item_id,
        variant_id: item.variant_id ?? null,
        name: item.name,
        variant_name: item.variant_name ?? null,
        quantity: item.quantity,
        unit_price_cents: totalPerUnit,
        total_cents: itemTotal,
        weight_kg: item.weight_kg ?? null,
        modifiers: item.modifiers ?? [],
      };
    });

    // Validate fee: manual fee cannot be less than calculated (#FIX-3)
    let deliveryFeeCents = body.delivery_fee_cents;
    let feeIsManual = body.fee_is_manual;
    let feeCalculatedCents = 0;

    // Try to calculate fee from delivery zones
    const { data: feeData } = await serviceClient.rpc('check_coverage', {
      p_lat: body.delivery_lat,
      p_lng: body.delivery_lng,
    });

    if (feeData && feeData.length > 0 && feeData[0].has_coverage) {
      // Simplified fee calculation (rest→client only, no rider location for manual orders)
      const { data: restData } = await serviceClient
        .from('restaurants')
        .select('lat, lng')
        .eq('id', body.restaurant_id)
        .single();

      if (restData) {
        const { data: calcResult } = await serviceClient.rpc('calculate_delivery_fee', {
          p_rider_lat: restData.lat,  // Use restaurant as proxy rider location
          p_rider_lng: restData.lng,
          p_restaurant_lat: restData.lat,
          p_restaurant_lng: restData.lng,
          p_client_lat: body.delivery_lat,
          p_client_lng: body.delivery_lng,
        });

        if (calcResult && calcResult.length > 0 && calcResult[0].has_coverage) {
          feeCalculatedCents = calcResult[0].client_fee_cents;
        }
      }
    }

    if (feeIsManual && deliveryFeeCents < feeCalculatedCents) {
      return NextResponse.json({
        error: `Delivery fee manual (S/ ${(deliveryFeeCents / 100).toFixed(2)}) no puede ser menor al calculado (S/ ${(feeCalculatedCents / 100).toFixed(2)})`,
      }, { status: 400 });
    }

    // Round up to nearest S/0.10
    const totalBeforeRounding = subtotalCents + deliveryFeeCents;
    const remainder = totalBeforeRounding % 10;
    const roundedTotal = remainder === 0 ? totalBeforeRounding : totalBeforeRounding + (10 - remainder);

    // Generate order code
    const { data: codeResult } = await serviceClient.rpc('generate_order_code');
    const orderCode = codeResult as string;

    // Phone formatting
    let phone = body.customer_phone.trim();
    if (!phone.startsWith('+51') && phone.length === 9) {
      phone = '+51' + phone;
    }

    // Insert order
    const { data: newOrder, error: insertError } = await serviceClient
      .from('orders')
      .insert({
        code: orderCode,
        city_id: body.city_id,
        restaurant_id: body.restaurant_id,
        customer_name: body.customer_name.trim(),
        customer_phone: phone,
        delivery_address: body.delivery_address.trim(),
        delivery_lat: body.delivery_lat,
        delivery_lng: body.delivery_lng,
        delivery_instructions: body.delivery_instructions?.trim() || null,
        items: recalculatedItems,
        subtotal_cents: subtotalCents,
        delivery_fee_cents: deliveryFeeCents,
        service_fee_cents: 0,
        discount_cents: 0,
        total_cents: roundedTotal,
        status: 'pending_confirmation',
        payment_method: body.payment_method,
        payment_status: 'pending',
        source: 'admin',
        fee_is_manual: feeIsManual,
        fee_calculated_cents: feeCalculatedCents,
        notes: body.notes?.trim() || null,
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting order:', insertError);
      return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 });
    }

    return NextResponse.json({
      id: newOrder.id,
      code: newOrder.code,
      status: newOrder.status,
      total_cents: newOrder.total_cents,
    }, { status: 201 });
  } catch (err) {
    console.error('Create order error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
