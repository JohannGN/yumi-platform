import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { roundUpCents } from '@/lib/utils/rounding';

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
    .select('*, restaurant:restaurants(name, commission_percentage)', { count: 'exact' })
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

  // ── Obtener comisión del restaurante ───────────────────
  const { data: restaurant, error: rErr } = await supabase
    .from('restaurants')
    .select('name, commission_percentage')
    .eq('id', restaurant_id)
    .single();
  if (rErr || !restaurant)
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });

  // ── Calcular desde orders ──────────────────────────────
  // gross_sales = subtotal (solo comida, sin delivery fee)
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, code, subtotal_cents, delivery_fee_cents, total_cents, delivered_at')
    .eq('restaurant_id', restaurant_id)
    .eq('status', 'delivered')
    .gte('delivered_at', `${period_start}T00:00:00.000Z`)
    .lte('delivered_at', `${period_end}T23:59:59.999Z`);

  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

  const totalOrders      = orders?.length ?? 0;
  const grossSalesCents  = (orders ?? []).reduce((sum, o) => sum + (o.subtotal_cents ?? 0), 0);
  const commissionCents  = roundUpCents(grossSalesCents * restaurant.commission_percentage / 100);
  const netPayoutCents   = Math.max(0, grossSalesCents - commissionCents);

  const preview = {
    period_start,
    period_end,
    total_orders: totalOrders,
    gross_sales_cents: grossSalesCents,
    commission_cents: commissionCents,
    commission_percentage: restaurant.commission_percentage,
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
    .select('*, restaurant:restaurants(name, commission_percentage)')
    .single();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  return NextResponse.json({ settlement, preview }, { status: 201 });
}
