import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { roundUpCents } from '@/lib/utils/rounding';

async function assertAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  return data;
}

// ─── GET /api/admin/settlements/riders ─────────────────────
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const profile = await assertAdmin(supabase);
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!['owner', 'city_admin', 'agent'].includes(profile.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status   = searchParams.get('status');
  const rider_id = searchParams.get('rider_id');
  const month    = searchParams.get('month'); // YYYY-MM
  const page     = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit    = Math.min(50, parseInt(searchParams.get('limit') || '20'));
  const offset   = (page - 1) * limit;

  let query = supabase
    .from('rider_settlements')
    .select(
      `*, rider:riders(pay_type, fixed_salary_cents, commission_percentage, user:users(name))`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status)   query = query.eq('status', status);
  if (rider_id) query = query.eq('rider_id', rider_id);
  if (month) {
    const [year, m] = month.split('-').map(Number);
    const start = `${month}-01`;
    const end   = new Date(year, m, 0).toISOString().split('T')[0];
    query = query.gte('period_start', start).lte('period_end', end);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ settlements: data ?? [], total: count ?? 0, page, limit });
}

// ─── POST /api/admin/settlements/riders ─────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const profile = await assertAdmin(supabase);
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!['owner', 'city_admin'].includes(profile.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const body = await request.json();
  const { rider_id, period_start, period_end, fuel_reimbursement_cents = 0, notes, dry_run } = body as {
    rider_id: string;
    period_start: string;
    period_end: string;
    fuel_reimbursement_cents?: number;
    notes?: string;
    dry_run?: boolean;
  };

  if (!rider_id || !period_start || !period_end)
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });

  // ── Solapamiento ───────────────────────────────────────
  const { data: overlap } = await supabase
    .from('rider_settlements')
    .select('id, period_start, period_end')
    .eq('rider_id', rider_id)
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

  // ── Datos del rider ────────────────────────────────────
  const { data: rider, error: rErr } = await supabase
    .from('riders')
    .select('pay_type, fixed_salary_cents, commission_percentage, user:users(name)')
    .eq('id', rider_id)
    .single();

  if (rErr || !rider)
    return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });

  // ── Órdenes del período ────────────────────────────────
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select(
      'id, code, delivery_fee_cents, rider_bonus_cents, actual_payment_method, payment_method, total_cents, delivered_at'
    )
    .eq('rider_id', rider_id)
    .eq('status', 'delivered')
    .gte('delivered_at', `${period_start}T00:00:00.000Z`)
    .lte('delivered_at', `${period_end}T23:59:59.999Z`);

  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

  const deliveredOrders = orders ?? [];
  const totalDeliveries = deliveredOrders.length;

  // Efectivo cobrado = pedidos cuyo método efectivo sea cash
  const cashOrders = deliveredOrders.filter(
    o => (o.actual_payment_method ?? o.payment_method) === 'cash'
  );
  const posOrders = deliveredOrders.filter(
    o => (o.actual_payment_method ?? o.payment_method) === 'pos'
  );
  const digitalOrders = deliveredOrders.filter(
    o => ['yape', 'plin'].includes(o.actual_payment_method ?? o.payment_method)
  );

  const cashCollected        = cashOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const posCollected         = posOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const yapePlinCollected    = digitalOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const deliveryFeesCents    = deliveredOrders.reduce((s, o) => s + (o.delivery_fee_cents ?? 0), 0);
  const bonusesCents         = deliveredOrders.reduce((s, o) => s + (o.rider_bonus_cents ?? 0), 0);
  const fuelCents            = roundUpCents(fuel_reimbursement_cents);

  // ── FIX-6: Cálculo net_payout según pay_type ──────────
  let netPayoutCents: number;
  if (rider.pay_type === 'commission') {
    // FIX-6: Rider commission = % of delivery_fee_cents per order (#108)
    // Math.floor per order: YUMI keeps residuo (#122)
    const commRate = parseFloat(String(rider.commission_percentage ?? 0)) / 100;
    const riderCommissionCents = deliveredOrders.reduce(
      (sum, o) => sum + Math.floor((o.delivery_fee_cents ?? 0) * commRate),
      0
    );
    netPayoutCents = riderCommissionCents + bonusesCents + fuelCents;
  } else {
    // fixed_salary — sin cambios
    netPayoutCents = (rider.fixed_salary_cents ?? 0) + bonusesCents + fuelCents;
  }
  netPayoutCents = Math.max(0, netPayoutCents);

  const preview = {
    period_start,
    period_end,
    total_deliveries: totalDeliveries,
    delivery_fees_cents: deliveryFeesCents,
    bonuses_cents: bonusesCents,
    fuel_reimbursement_cents: fuelCents,
    net_payout_cents: netPayoutCents,
    pay_type: rider.pay_type,
    commission_percentage: rider.commission_percentage, // FIX-6: expose for UI
    fixed_salary_cents: rider.fixed_salary_cents,
    has_overlap: false,
    cash_collected_cents: cashCollected,
    pos_collected_cents: posCollected,
    yape_plin_collected_cents: yapePlinCollected,
  };

  if (dry_run) return NextResponse.json({ preview });

  // ── Persistir ──────────────────────────────────────────
  const { data: settlement, error: sErr } = await supabase
    .from('rider_settlements')
    .insert({
      rider_id,
      period_start,
      period_end,
      total_deliveries: totalDeliveries,
      cash_collected_cents: cashCollected,
      pos_collected_cents: posCollected,
      yape_plin_collected_cents: yapePlinCollected,
      delivery_fees_cents: deliveryFeesCents,
      bonuses_cents: bonusesCents,
      fuel_reimbursement_cents: fuelCents,
      net_payout_cents: netPayoutCents,
      status: 'pending',
      notes: notes ?? null,
    })
    .select(`*, rider:riders(pay_type, fixed_salary_cents, commission_percentage, user:users(name))`)
    .single();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  return NextResponse.json({ settlement, preview }, { status: 201 });
}
