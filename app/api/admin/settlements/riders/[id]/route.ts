import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { roundUpCents } from '@/lib/utils/rounding';

async function assertAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  return data;
}

// ─── GET /api/admin/settlements/riders/[id] ─────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const profile = await assertAdmin(supabase);
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!['owner', 'city_admin', 'agent'].includes(profile.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { data: settlement, error } = await supabase
    .from('rider_settlements')
    .select(`*, rider:riders(pay_type, fixed_salary_cents, commission_percentage, user:users(name))`)
    .eq('id', id)
    .single();

  if (error || !settlement)
    return NextResponse.json({ error: 'Liquidación no encontrada' }, { status: 404 });

  // Entregas del período para el detalle
  const { data: orders } = await supabase
    .from('orders')
    .select(
      'id, code, delivery_fee_cents, rider_bonus_cents, actual_payment_method, payment_method, total_cents, delivered_at, customer_name'
    )
    .eq('rider_id', settlement.rider_id)
    .eq('status', 'delivered')
    .gte('delivered_at', `${settlement.period_start}T00:00:00.000Z`)
    .lte('delivered_at', `${settlement.period_end}T23:59:59.999Z`)
    .order('delivered_at', { ascending: false });

  return NextResponse.json({ settlement, orders: orders ?? [] });
}

// ─── PATCH /api/admin/settlements/riders/[id] ───────────────
// Marcar paid/disputed, editar combustible, agregar notas
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const profile = await assertAdmin(supabase);
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!['owner', 'city_admin'].includes(profile.role))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  // FIX-6: Added commission_percentage to rider join + fuel_reimbursement_cents to select
  const { data: existing, error: eErr } = await supabase
    .from('rider_settlements')
    .select('id, status, paid_at, delivery_fees_cents, bonuses_cents, fuel_reimbursement_cents, net_payout_cents, rider:riders(pay_type, fixed_salary_cents, commission_percentage)')
    .eq('id', id)
    .single();

  if (eErr || !existing)
    return NextResponse.json({ error: 'Liquidación no encontrada' }, { status: 404 });

  const body = await request.json();
  const { status, notes, fuel_reimbursement_cents } = body as {
    status?: 'paid' | 'disputed' | 'pending';
    notes?: string;
    fuel_reimbursement_cents?: number;
  };

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (notes  !== undefined) updates.notes  = notes;

  if (status === 'paid' && !existing.paid_at) {
    updates.paid_at = new Date().toISOString();
  }
  if (status !== 'paid' && existing.paid_at) {
    updates.paid_at = null;
  }

  // Recalcular net_payout si cambia el combustible
  if (fuel_reimbursement_cents !== undefined) {
    const fuelCents = roundUpCents(fuel_reimbursement_cents);
    updates.fuel_reimbursement_cents = fuelCents;

    const rider = existing.rider as {
      pay_type: string;
      fixed_salary_cents: number | null;
      commission_percentage: number | null;
    } | null;

    if (rider?.pay_type === 'commission') {
      // FIX-6: Rider commission = % of delivery_fee_cents (#108)
      // Approximate recalc: floor(total_delivery_fees * commission% / 100)
      // Slight rounding diff vs per-order floor, acceptable for PATCH recalc
      const commRate = parseFloat(String(rider.commission_percentage ?? 0)) / 100;
      const riderCommissionCents = Math.floor((existing.delivery_fees_cents ?? 0) * commRate);
      updates.net_payout_cents = Math.max(
        0,
        riderCommissionCents + (existing.bonuses_cents ?? 0) + fuelCents
      );
    } else {
      updates.net_payout_cents = Math.max(
        0,
        (rider?.fixed_salary_cents ?? 0) +
        (existing.bonuses_cents ?? 0) +
        fuelCents
      );
    }
  }

  const { data: settlement, error: uErr } = await supabase
    .from('rider_settlements')
    .update(updates)
    .eq('id', id)
    .select(`*, rider:riders(pay_type, fixed_salary_cents, commission_percentage, user:users(name))`)
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ settlement });
}
