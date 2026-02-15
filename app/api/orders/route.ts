// ============================================================
// POST /api/orders — Crear pedido
// Valida, genera código, crea orden, retorna URL WhatsApp
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { CreateOrderPayload, CreateOrderResponse } from '@/types/checkout';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const WHATSAPP_NUMBER = '51953211536';
const CONFIRMATION_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    const payload: CreateOrderPayload = await request.json();

    // === 1. Validaciones básicas ===
    if (!payload.restaurant_id || !payload.customer_name || !payload.customer_phone) {
      return NextResponse.json<CreateOrderResponse>(
        { success: false, code: '', confirmation_token: '', whatsapp_url: '', error: 'Datos del cliente incompletos' },
        { status: 400 },
      );
    }

    if (!payload.delivery_address || !payload.delivery_lat || !payload.delivery_lng) {
      return NextResponse.json<CreateOrderResponse>(
        { success: false, code: '', confirmation_token: '', whatsapp_url: '', error: 'Dirección de entrega requerida' },
        { status: 400 },
      );
    }

    if (!payload.items || payload.items.length === 0) {
      return NextResponse.json<CreateOrderResponse>(
        { success: false, code: '', confirmation_token: '', whatsapp_url: '', error: 'El pedido debe tener al menos un item' },
        { status: 400 },
      );
    }

    if (!/^\+51\d{9}$/.test(payload.customer_phone)) {
      return NextResponse.json<CreateOrderResponse>(
        { success: false, code: '', confirmation_token: '', whatsapp_url: '', error: 'Teléfono inválido' },
        { status: 400 },
      );
    }

    // === 2. Verificar restaurante abierto ===
    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, is_open, is_active, city_id')
      .eq('id', payload.restaurant_id)
      .single();

    if (restError || !restaurant) {
      return NextResponse.json<CreateOrderResponse>(
        { success: false, code: '', confirmation_token: '', whatsapp_url: '', error: 'Restaurante no encontrado' },
        { status: 404 },
      );
    }

    if (!restaurant.is_active) {
      return NextResponse.json<CreateOrderResponse>(
        { success: false, code: '', confirmation_token: '', whatsapp_url: '', error: 'Este restaurante no está disponible' },
        { status: 400 },
      );
    }

    if (!restaurant.is_open) {
      return NextResponse.json<CreateOrderResponse>(
        { success: false, code: '', confirmation_token: '', whatsapp_url: '', error: 'El restaurante está cerrado en este momento' },
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
      return NextResponse.json<CreateOrderResponse>(
        { success: false, code: '', confirmation_token: '', whatsapp_url: '', error: 'Tu cuenta tiene una restricción temporal. Por favor contacta soporte.' },
        { status: 403 },
      );
    }

    // === 4. Verificar que los items existen y están disponibles ===
    const itemIds = payload.items.map((i) => i.menu_item_id);
    const { data: menuItems, error: itemsError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name, base_price_cents, is_available')
      .in('id', itemIds)
      .eq('restaurant_id', payload.restaurant_id);

    if (itemsError) {
      return NextResponse.json<CreateOrderResponse>(
        { success: false, code: '', confirmation_token: '', whatsapp_url: '', error: 'Error verificando items del menú' },
        { status: 500 },
      );
    }

    const availableIds = new Set(
      (menuItems || []).filter((i) => i.is_available).map((i) => i.id),
    );

    const unavailable = payload.items.filter(
      (i) => !availableIds.has(i.menu_item_id),
    );

    if (unavailable.length > 0) {
      return NextResponse.json<CreateOrderResponse>(
        {
          success: false,
          code: '',
          confirmation_token: '',
          whatsapp_url: '',
          error: 'Algunos platos ya no están disponibles',
          unavailable_items: unavailable.map((i) => i.name),
        },
        { status: 400 },
      );
    }

    // === 5. Generar código de orden ===
    const { data: codeData, error: codeError } = await supabaseAdmin.rpc(
      'generate_order_code',
    );

    if (codeError || !codeData) {
      console.error('Error generating order code:', codeError);
      return NextResponse.json<CreateOrderResponse>(
        { success: false, code: '', confirmation_token: '', whatsapp_url: '', error: 'Error generando código de pedido' },
        { status: 500 },
      );
    }

    const orderCode: string = codeData;
    const confirmationToken = randomUUID();
    const confirmationExpiresAt = new Date(
      Date.now() + CONFIRMATION_MINUTES * 60 * 1000,
    ).toISOString();

    // === 6. Construir items JSONB ===
    const orderItems = payload.items.map((item) => ({
      menu_item_id: item.menu_item_id,
      name: item.name,
      variant_id: item.variant_id || null,
      variant_name: item.variant_name || null,
      base_price_cents: item.base_price_cents,
      quantity: item.quantity,
      modifiers: item.modifiers,
      unit_total_cents: item.unit_total_cents,
      line_total_cents: item.line_total_cents,
    }));

    // === 7. Calcular totales ===
    const subtotalCents = payload.items.reduce(
      (sum, i) => sum + i.line_total_cents, 0,
    );
    const deliveryFeeCents = payload.delivery_fee_cents || 0;
    const totalCents = subtotalCents + deliveryFeeCents;

    // === 8. Crear orden en BD ===
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
        delivery_zone_id: payload.delivery_zone_id || null,
        delivery_instructions: payload.delivery_instructions?.trim() || null,
        items: orderItems,
        subtotal_cents: subtotalCents,
        delivery_fee_cents: deliveryFeeCents,
        service_fee_cents: 0,
        discount_cents: 0,
        total_cents: totalCents,
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
      return NextResponse.json<CreateOrderResponse>(
        { success: false, code: '', confirmation_token: '', whatsapp_url: '', error: 'Error creando el pedido' },
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

    return NextResponse.json<CreateOrderResponse>(
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
    return NextResponse.json<CreateOrderResponse>(
      { success: false, code: '', confirmation_token: '', whatsapp_url: '', error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
