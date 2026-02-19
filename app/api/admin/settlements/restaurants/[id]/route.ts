import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function assertAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  return data;
}

// ─── PATCH /api/admin/settlements/restaurants/[id] ─────────
// Acciones: marcar paid, disputed o pending; actualizar notas
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

  // Verificar que existe
  const { data: existing, error: eErr } = await supabase
    .from('restaurant_settlements')
    .select('id, status, paid_at')
    .eq('id', id)
    .single();

  if (eErr || !existing)
    return NextResponse.json({ error: 'Liquidación no encontrada' }, { status: 404 });

  const body = await request.json();
  const { status, notes } = body as {
    status?: 'paid' | 'disputed' | 'pending';
    notes?: string;
  };

  // Marcar pagado es IRREVERSIBLE — el frontend debe confirmar antes de llamar
  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined)  updates.notes  = notes;

  // Auto-completar paid_at al marcar como pagado
  if (status === 'paid' && !existing.paid_at) {
    updates.paid_at = new Date().toISOString();
  }
  // Si se revierte desde paid (solo owner puede), limpiar paid_at
  if (status !== 'paid' && existing.paid_at) {
    updates.paid_at = null;
  }

  const { data: settlement, error: uErr } = await supabase
    .from('restaurant_settlements')
    .update(updates)
    .eq('id', id)
    .select('*, restaurant:restaurants(name, commission_percentage)')
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ settlement });
}

// ─── GET /api/admin/settlements/restaurants/[id] ────────────
// Detalle completo + pedidos del período
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
    .from('restaurant_settlements')
    .select('*, restaurant:restaurants(name, commission_percentage, city_id)')
    .eq('id', id)
    .single();

  if (error || !settlement)
    return NextResponse.json({ error: 'Liquidación no encontrada' }, { status: 404 });

  // Pedidos del período
  const { data: orders } = await supabase
    .from('orders')
    .select('id, code, subtotal_cents, delivery_fee_cents, total_cents, delivered_at, payment_method, status')
    .eq('restaurant_id', settlement.restaurant_id)
    .eq('status', 'delivered')
    .gte('delivered_at', `${settlement.period_start}T00:00:00.000Z`)
    .lte('delivered_at', `${settlement.period_end}T23:59:59.999Z`)
    .order('delivered_at', { ascending: false });

  return NextResponse.json({ settlement, orders: orders ?? [] });
}
