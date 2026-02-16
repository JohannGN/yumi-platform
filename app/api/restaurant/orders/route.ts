// ============================================================
// GET /api/restaurant/orders
// Returns orders for the authenticated restaurant
// Query params: ?status=pending_confirmation,confirmed,preparing,ready
// Chat 5 — Fragment 3/7
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

export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const supabase = await createAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Get restaurant
    const serviceClient = createServiceClient();
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Sin restaurante' }, { status: 404 });
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // 4. Build query
    let query = serviceClient
      .from('orders')
      .select(`
        id, code, customer_name, customer_phone,
        delivery_address, delivery_instructions,
        items, subtotal_cents, delivery_fee_cents,
        service_fee_cents, discount_cents, total_cents,
        status, rejection_reason, rejection_notes,
        payment_method, payment_status, source,
        estimated_prep_time_minutes,
        customer_rating, customer_comment,
        created_at, confirmed_at, restaurant_confirmed_at,
        ready_at, delivered_at, cancelled_at, updated_at
      `)
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by status (comma-separated)
    if (statusFilter) {
      const statuses = statusFilter.split(',').map(s => s.trim());
      query = query.in('status', statuses);
    } else {
      // Default: exclude 'cart' status
      query = query.neq('status', 'cart');
    }

    const { data: orders, error: queryError } = await query;

    if (queryError) {
      console.error('[/api/restaurant/orders] Query error:', queryError);
      return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err) {
    console.error('[/api/restaurant/orders] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
