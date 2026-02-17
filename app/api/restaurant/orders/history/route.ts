// ============================================================
// GET /api/restaurant/orders/history — Historial de pedidos del restaurante
// SEGURIDAD: Stripea datos del cliente antes de enviar
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeOrdersForRestaurant } from '@/lib/utils/sanitize-order';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener restaurante del usuario
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    // Query params para filtros
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const statusFilter = searchParams.get('status'); // delivered, cancelled, rejected
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');

    const offset = (page - 1) * limit;

    // Query: pedidos finalizados
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('restaurant_id', restaurant.id)
      .in('status', ['delivered', 'cancelled', 'rejected'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: orders, error: ordersError, count } = await query;

    if (ordersError) {
      console.error('Error fetching order history:', ordersError);
      return NextResponse.json({ error: 'Error obteniendo historial' }, { status: 500 });
    }

    // 🔒 SEGURIDAD: Stripear datos sensibles del cliente
    const sanitizedOrders = sanitizeOrdersForRestaurant(orders || []);

    return NextResponse.json({
      orders: sanitizedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Unexpected error in order history:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
