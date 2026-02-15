// ============================================================
// GET /api/delivery-fee?lat=X&lng=Y&restaurant_id=Z
// Calcula el delivery fee usando funciones SQL existentes
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { roundUpCents } from '@/lib/utils/rounding';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const restaurantId = searchParams.get('restaurant_id');

    if (isNaN(lat) || isNaN(lng) || !restaurantId) {
      return NextResponse.json(
        { error: 'Parámetros requeridos: lat, lng, restaurant_id' },
        { status: 400 },
      );
    }

    // Obtener coordenadas del restaurante
    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('lat, lng')
      .eq('id', restaurantId)
      .single();

    if (restError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurante no encontrado' },
        { status: 404 },
      );
    }

    // Verificar cobertura
    const { data: coverage, error: covError } = await supabaseAdmin.rpc(
      'check_coverage',
      { p_lat: lat, p_lng: lng },
    );

    if (covError) {
      console.error('Error checking coverage:', covError);
      return NextResponse.json(
        { error: 'Error verificando cobertura' },
        { status: 500 },
      );
    }

    const zone = coverage?.[0];

    if (!zone || !zone.has_coverage) {
      return NextResponse.json({
        fee_cents: 0,
        zone_name: null,
        zone_id: null,
        is_covered: false,
      });
    }

    // Calcular fee — usamos coords del restaurante como "rider" temporal
    const { data: feeData, error: feeError } = await supabaseAdmin.rpc(
      'calculate_delivery_fee',
      {
        p_rider_lat: restaurant.lat,
        p_rider_lng: restaurant.lng,
        p_restaurant_lat: restaurant.lat,
        p_restaurant_lng: restaurant.lng,
        p_client_lat: lat,
        p_client_lng: lng,
      },
    );

    if (feeError) {
      console.error('Error calculating fee:', feeError);
      return NextResponse.json(
        { error: 'Error calculando delivery' },
        { status: 500 },
      );
    }

    const fee = feeData?.[0];

    return NextResponse.json({
      fee_cents: roundUpCents(fee?.client_fee_cents || zone.base_fee_cents),
      zone_name: fee?.zone_name || zone.zone_name,
      zone_id: zone.zone_id,
      is_covered: true,
    });
  } catch (error) {
    console.error('Delivery fee error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
