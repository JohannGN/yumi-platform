// ============================================================
// GET /api/restaurant/orders/history
// Paginated order history with status filter
// Chat 5 — Fragment 6/7
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
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const sc = createServiceClient();
    const { data: restaurant } = await sc
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .single();

    if (!restaurant) return NextResponse.json({ error: 'Sin restaurante' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const statusFilter = searchParams.get('status');
    const offset = (page - 1) * limit;

    // Completed statuses for history
    const historyStatuses = statusFilter
      ? [statusFilter]
      : ['delivered', 'rejected', 'cancelled'];

    // Count
    const { count } = await sc
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .in('status', historyStatuses);

    // Data
    const { data: orders } = await sc
      .from('orders')
      .select(`
        id, code, customer_name, customer_phone,
        delivery_address, items,
        subtotal_cents, delivery_fee_cents, total_cents,
        status, rejection_reason, rejection_notes,
        payment_method, payment_status,
        customer_rating, customer_comment,
        created_at, delivered_at, cancelled_at
      `)
      .eq('restaurant_id', restaurant.id)
      .in('status', historyStatuses)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({
      orders: orders || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error('[/api/restaurant/orders/history]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
