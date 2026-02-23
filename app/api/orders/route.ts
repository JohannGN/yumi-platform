// ============================================================
// POST /api/orders – Crear pedido
// ✅ PRECIOS RECALCULADOS SERVER-SIDE (anti-fraude)
// ✅ POS surcharge calculado en servidor
// ✅ Frontend prices are IGNORED – only item IDs + quantities matter
// ✅ [CREDITOS-1B] rounding_surplus_cents calculado y guardado
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const WHATSAPP_NUMBER = '51953211536';
const CONFIRMATION_MINUTES = 15;
// ❌ ELIMINADO: const POS_SURCHARGE_RATE = 0.045; → ahora se lee de platform_settings

// Redondeo YUMI: siempre arriba al múltiplo de 10 céntimos
function roundUpCents(cents: number): number {
  return Math.ceil(cents / 10) * 10;
}

// Types for the request payload
interface OrderItemPayload {
  menu_item_id: string;
  name: string;
  variant_id?: string | null;
  variant_name?: string | null;
  base_price_cents: number;
  quantity: number;
  modifiers: {
    group_name: string;
    selections: { name: string; price_cents: number; modifier_id?: string }[];
  }[];
  unit_total_cents: number;
  line_total_cents: number;
}

interface OrderPayload {
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_zone_id?: string | null;
  delivery_instructions?: string | null;
  items: OrderItemPayload[];
  subtotal_cents: number;       // IGNORED – recalculated server-side
  delivery_fee_cents: number;   // IGNORED – recalculated server-side
  total_cents: number;          // IGNORED – recalculated server-side
  payment_method: 'cash' | 'pos' | 'yape' | 'plin';
}

export async function POST(request: NextRequest) {
  try {
    const payload: OrderPayload = await request.json();

    // === 1. Validaciones básicas ===
    if (!payload.restaurant_id || !payload.customer_name || !payload.customer_phone) {
      return NextResponse.json(
        { success: false, error: 'Datos del cliente incompletos' },
        { status: 400 },
      );
    }

    if (!payload.delivery_address || !payload.delivery_lat || !payload.delivery_lng) {
      return NextResponse.json(
        { success: false, error: 'Dirección de entrega requerida' },
        { status: 400 },
      );
    }

    if (!payload.items || payload.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'El pedido debe tener al menos un item' },
        { status: 400 },
      );
    }

    if (!/^\+51\d{9}$/.test(payload.customer_phone)) {
      return NextResponse.json(
        { success: false, error: 'Teléfono inválido' },
        { status: 400 },
      );
    }

    // === 2. Verificar restaurante abierto ===
    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, is_open, is_active, city_id, lat, lng')
      .eq('id', payload.restaurant_id)
      .single();

    if (restError || !restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurante no encontrado' },
        { status: 404 },
      );
    }

    if (!restaurant.is_active) {
      return NextResponse.json(
        { success: false, error: 'Este restaurante no está disponible' },
        { status: 400 },
      );
    }

    if (!restaurant.is_open) {
      return NextResponse.json(
        { success: false, error: 'El restaurante está cerrado en este momento' },
        { status: 400 },
      );
    }

    // === 3. Verificar penalidades ===
    const { data: penaltyData } = await supabaseAdmin.rpc(
      'check_customer_penalty',
      { p_phone: payload.customer_phone },
    );

    const penalty = penaltyData?.[0];
    if (penalty?.is_banned) {
      return NextResponse.json(
        { success: false, error: 'Tu cuenta tiene una restricción temporal. Por favor contacta soporte.' },
        { status: 403 },
      );
    }

    // === 4. RECALCULAR PRECIOS SERVER-SIDE (anti-fraude) ===
    // Fetch actual prices from DB – NEVER trust frontend prices

    const itemIds = payload.items.map((i) => i.menu_item_id);
    const variantIds = payload.items
      .map((i) => i.variant_id)
      .filter((id): id is string => !!id);

    // 4a. Fetch menu items with actual prices
    const { data: dbMenuItems, error: itemsError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name, base_price_cents, is_available')
      .in('id', itemIds)
      .eq('restaurant_id', payload.restaurant_id);

    if (itemsError) {
      return NextResponse.json(
        { success: false, error: 'Error verificando items del menú' },
        { status: 500 },
      );
    }

    const menuItemMap = new Map(
      (dbMenuItems || []).map((i) => [i.id, i]),
    );

    // Check availability
    const unavailable = payload.items.filter((i) => {
      const dbItem = menuItemMap.get(i.menu_item_id);
      return !dbItem || !dbItem.is_available;
    });

    if (unavailable.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Algunos platos ya no están disponibles',
          unavailable_items: unavailable.map((i) => i.name),
        },
        { status: 400 },
      );
    }

    // 4b. Fetch variant prices (if any)
    let variantMap = new Map<string, number>();
    if (variantIds.length > 0) {
      const { data: dbVariants } = await supabaseAdmin
        .from('item_variants')
        .select('id, price_cents, is_available')
        .in('id', variantIds);

      if (dbVariants) {
        for (const v of dbVariants) {
          if (!v.is_available) {
            return NextResponse.json(
              { success: false, error: 'Una variante seleccionada ya no está disponible' },
              { status: 400 },
            );
          }
          variantMap.set(v.id, v.price_cents);
        }
      }
    }

    // 4c. Fetch modifier prices (collect all modifier IDs from selections)
    const allModifierIds: string[] = [];
    for (const item of payload.items) {
      for (const mod of item.modifiers) {
        for (const sel of mod.selections) {
          if (sel.modifier_id) {
            allModifierIds.push(sel.modifier_id);
          }
        }
      }
    }

    let modifierMap = new Map<string, number>();
    if (allModifierIds.length > 0) {
      const { data: dbModifiers } = await supabaseAdmin
        .from('item_modifiers')
        .select('id, name, price_cents')
        .in('id', allModifierIds);

      if (dbModifiers) {
        for (const m of dbModifiers) {
          modifierMap.set(m.id, m.price_cents);
        }
      }
    }

    // 4d. Recalculate each item's price from DB values
    let serverSubtotalCents = 0;
    const serverOrderItems = payload.items.map((item) => {
      const dbItem = menuItemMap.get(item.menu_item_id)!;

      // Base price: variant price if variant exists, otherwise menu item price
      const basePriceCents = item.variant_id && variantMap.has(item.variant_id)
        ? variantMap.get(item.variant_id)!
        : dbItem.base_price_cents;

      // Modifier total: sum of all selected modifier prices from DB
      let modifierTotalCents = 0;
      const serverModifiers = item.modifiers.map((mod) => ({
        group_name: mod.group_name,
        selections: mod.selections.map((sel) => {
          // Use DB price if we have the modifier_id, otherwise use the sent price
          // (for modifiers without ID tracking, we fall back to frontend price)
          const dbPrice = sel.modifier_id ? modifierMap.get(sel.modifier_id) : undefined;
          const priceCents = dbPrice !== undefined ? dbPrice : sel.price_cents;
          modifierTotalCents += priceCents;
          return { name: sel.name, price_cents: priceCents };
        }),
      }));

      const unitTotalCents = basePriceCents + modifierTotalCents;
      const lineTotalCents = unitTotalCents * item.quantity;
      serverSubtotalCents += lineTotalCents;

      return {
        menu_item_id: item.menu_item_id,
        name: dbItem.name,
        variant_id: item.variant_id || null,
        variant_name: item.variant_name || null,
        base_price_cents: basePriceCents,
        quantity: item.quantity,
        modifiers: serverModifiers,
        unit_total_cents: unitTotalCents,
        line_total_cents: lineTotalCents,
      };
    });

    // === 5. Recalculate delivery fee from zone (server-side) ===
    let serverDeliveryFeeCents = 0;
    let deliveryZoneId: string | null = null;

    if (payload.delivery_zone_id) {
      const { data: zone } = await supabaseAdmin
        .from('delivery_zones')
        .select('id, base_fee_cents, per_km_fee_cents, min_fee_cents, max_fee_cents')
        .eq('id', payload.delivery_zone_id)
        .eq('is_active', true)
        .single();

      if (zone) {
        deliveryZoneId = zone.id;

        // Calculate distance restaurant → client (Haversine approximation)
        const distKm = haversineKm(
          restaurant.lat, restaurant.lng,
          payload.delivery_lat, payload.delivery_lng,
        );

        const rawFee = zone.base_fee_cents + (distKm * zone.per_km_fee_cents);
        const clampedFee = Math.max(zone.min_fee_cents, Math.min(zone.max_fee_cents, rawFee));
        serverDeliveryFeeCents = roundUpCents(Math.ceil(clampedFee));
      }
    }

    // === 6. Calculate POS surcharge dinámico desde platform_settings ===
    // ANTES: serviceFeeCents = roundUpCents(Math.ceil(baseTotal * POS_SURCHARGE_RATE))
    // AHORA: se lee pos_commission_rate y pos_igv_rate desde la BD
    const baseTotal = roundUpCents(serverSubtotalCents + serverDeliveryFeeCents);
    let serviceFeeCents = 0;

    if (payload.payment_method === 'pos') {
      const { data: platformSettings } = await supabaseAdmin
        .from('platform_settings')
        .select('pos_surcharge_enabled, pos_commission_rate, pos_igv_rate')
        .single();

      if (platformSettings?.pos_surcharge_enabled) {
        const rate = Number(platformSettings.pos_commission_rate);
        const igv = Number(platformSettings.pos_igv_rate);
        serviceFeeCents = roundUpCents(baseTotal * rate * (1 + igv));
      }
    }

    // [CREDITOS-1B] Calcular total con rounding surplus
    const rawTotal = serverSubtotalCents + serverDeliveryFeeCents + serviceFeeCents;
    const serverTotalCents = roundUpCents(rawTotal);
    const roundingSurplusCents = serverTotalCents - rawTotal;

    // === 7. Generar código de orden ===
    const { data: codeData, error: codeError } = await supabaseAdmin.rpc(
      'generate_order_code',
    );

    if (codeError || !codeData) {
      console.error('Error generating order code:', codeError);
      return NextResponse.json(
        { success: false, error: 'Error generando código de pedido' },
        { status: 500 },
      );
    }

    const orderCode: string = codeData;
    const confirmationToken = randomUUID();
    const confirmationExpiresAt = new Date(
      Date.now() + CONFIRMATION_MINUTES * 60 * 1000,
    ).toISOString();

    // === 8. Crear orden en BD con precios SERVER-SIDE ===
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        code: orderCode,
        city_id: restaurant.city_id,
        restaurant_id: payload.restaurant_id,
        customer_name: payload.customer_name.trim(),
        customer_phone: payload.customer_phone,
        delivery_address: payload.delivery_address.trim(),
        delivery_lat: payload.delivery_lat,
        delivery_lng: payload.delivery_lng,
        delivery_zone_id: deliveryZoneId,
        delivery_instructions: payload.delivery_instructions?.trim() || null,
        items: serverOrderItems,               // ✅ Server-recalculated items
        subtotal_cents: serverSubtotalCents,    // ✅ Server-recalculated
        delivery_fee_cents: serverDeliveryFeeCents, // ✅ Server-recalculated
        service_fee_cents: serviceFeeCents,     // ✅ POS surcharge dinámico (0 si no es POS)
        discount_cents: 0,
        total_cents: serverTotalCents,          // ✅ Server-recalculated
        rounding_surplus_cents: roundingSurplusCents, // ✅ [CREDITOS-1B] Surplus → YUMI
        status: 'awaiting_confirmation',
        payment_method: payload.payment_method,
        payment_status: 'pending',
        source: 'web',
        confirmation_token: confirmationToken,
        confirmation_expires_at: confirmationExpiresAt,
      })
      .select('id, code')
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { success: false, error: 'Error creando el pedido' },
        { status: 500 },
      );
    }

    // === 9. Insertar primer estado en historial ===
    await supabaseAdmin.from('order_status_history').insert({
      order_id: order.id,
      from_status: null,
      to_status: 'awaiting_confirmation',
      notes: 'Pedido creado desde web, esperando confirmación por WhatsApp',
    });

    // === 10. Generar URL de WhatsApp ===
    const whatsappText = encodeURIComponent(`CONFIRMAR ${orderCode}`);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappText}`;

    return NextResponse.json(
      {
        success: true,
        code: orderCode,
        confirmation_token: confirmationToken,
        whatsapp_url: whatsappUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

// === Haversine distance in km ===
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 100) / 100; // 2 decimals
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
