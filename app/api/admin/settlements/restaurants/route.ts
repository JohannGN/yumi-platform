import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// ─── helpers ───────────────────────────────────────────────
async function assertAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  return data;
}

// ─── GET /api/admin/settlements/restaurants ─────────────────
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const profile = await assertAdmin(supabase);
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!['owner', 'city_admin', 'agent'].includes(profile.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status        = searchParams.get('status');
  const restaurant_id = searchParams.get('restaurant_id');
  const month         = searchParams.get('month'); // YYYY-MM
  const page          = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit         = Math.min(50, parseInt(searchParams.get('limit') || '20'));
  const offset        = (page - 1) * limit;

  let query = supabase
    .from('restaurant_settlements')
    .select('*, restaurant:restaurants(name, commission_percentage, commission_mode)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status)        query = query.eq('status', status);
  if (restaurant_id) query = query.eq('restaurant_id', restaurant_id);
  if (month) {
    const [year, m] = month.split('-').map(Number);
    const start = `${month}-01`;
    const end   = new Date(year, m, 0).toISOString().split('T')[0]; // last day
    query = query.gte('period_start', start).lte('period_end', end);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ settlements: data ?? [], total: count ?? 0, page, limit });
}

// ─── POST /api/admin/settlements/restaurants ────────────────
// Acepta dry_run=true para preview sin persistir
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const profile = await assertAdmin(supabase);
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!['owner', 'city_admin'].includes(profile.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const body = await request.json();
  const { restaurant_id, period_start, period_end, notes, dry_run } = body as {
    restaurant_id: string;
    period_start: string;
    period_end: string;
    notes?: string;
    dry_run?: boolean;
  };

  if (!restaurant_id || !period_start || !period_end)
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });

  // ── Verificar solapamiento ──────────────────────────────
  const { data: overlap } = await supabase
    .from('restaurant_settlements')
    .select('id, period_start, period_end')
    .eq('restaurant_id', restaurant_id)
    .lte('period_start', period_end)
    .gte('period_end', period_start)
    .maybeSingle();

  if (overlap) {
    return NextResponse.json({
      error: `Período solapado con liquidación existente: ${overlap.period_start} – ${overlap.period_end}`,
      has_overlap: true,
      overlap_period: `${overlap.period_start} – ${overlap.period_end}`,
    }, { status: 409 });
  }

  // ── FIX-6: Obtener comisión + commission_mode del restaurante ──
  const { data: restaurant, error: rErr } = await supabase
    .from('restaurants')
    .select('name, commission_percentage, commission_mode')
    .eq('id', restaurant_id)
    .single();
  if (rErr || !restaurant)
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });

  // ── FIX-6: Si per_item, obtener comisiones individuales de platos ──
  let menuItemCommissions: Map<string, number | null> = new Map();
  if (restaurant.commission_mode === 'per_item') {
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('id, commission_percentage')
      .eq('restaurant_id', restaurant_id);

    for (const mi of menuItems ?? []) {
      menuItemCommissions.set(mi.id, mi.commission_percentage);
    }
  }

  // ── Calcular desde orders ──────────────────────────────
  // FIX-6: Added 'items' to select for per_item commission calculation
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, code, subtotal_cents, delivery_fee_cents, total_cents, delivered_at, items')
    .eq('restaurant_id', restaurant_id)
    .eq('status', 'delivered')
    .gte('delivered_at', `${period_start}T00:00:00.000Z`)
    .lte('delivered_at', `${period_end}T23:59:59.999Z`);

  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

  const totalOrders      = orders?.length ?? 0;
  const grossSalesCents  = (orders ?? []).reduce((sum, o) => sum + (o.subtotal_cents ?? 0), 0);

  // ── FIX-6: Cálculo de comisión según commission_mode ──────
  // Regla #123: YUMI abajo (Math.floor), restaurante es residuo (confianza)
  let commissionCents: number;

  if (restaurant.commission_mode === 'per_item') {
    // Per-item: calcular comisión por cada item de cada pedido
    commissionCents = 0;
    for (const order of orders ?? []) {
      const orderItems = (order.items ?? []) as Array<{
        item_id: string;
        total_cents: number;
      }>;
      for (const oi of orderItems) {
        // Fallback: si el plato no tiene comisión propia → usa global
        const itemRate = menuItemCommissions.get(oi.item_id) ?? restaurant.commission_percentage;
        // Math.floor por item: YUMI abajo, restaurante es residuo (#123)
        commissionCents += Math.floor((oi.total_cents ?? 0) * (itemRate ?? 0) / 100);
      }
    }
  } else {
    // Global: un solo % sobre todo el subtotal
    // FIX-6: Math.floor instead of roundUpCents (#123: YUMI abajo para restaurante)
    commissionCents = Math.floor(grossSalesCents * (restaurant.commission_percentage ?? 0) / 100);
  }

  const netPayoutCents = Math.max(0, grossSalesCents - commissionCents);

  const preview = {
    period_start,
    period_end,
    total_orders: totalOrders,
    gross_sales_cents: grossSalesCents,
    commission_cents: commissionCents,
    commission_percentage: restaurant.commission_percentage,
    commission_mode: restaurant.commission_mode, // FIX-6: expose for UI
    net_payout_cents: netPayoutCents,
    has_overlap: false,
    sample_orders: (orders ?? []).slice(0, 10).map(o => ({
      id: o.id,
      code: o.code,
      subtotal_cents: o.subtotal_cents,
      delivered_at: o.delivered_at,
    })),
  };

  if (dry_run) return NextResponse.json({ preview });

  // ── Persistir ──────────────────────────────────────────
  const { data: settlement, error: sErr } = await supabase
    .from('restaurant_settlements')
    .insert({
      restaurant_id,
      period_start,
      period_end,
      total_orders: totalOrders,
      gross_sales_cents: grossSalesCents,
      commission_cents: commissionCents,
      net_payout_cents: netPayoutCents,
      status: 'pending',
      notes: notes ?? null,
    })
    .select('*, restaurant:restaurants(name, commission_percentage, commission_mode)')
    .single();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  return NextResponse.json({ settlement, preview }, { status: 201 });
}
