import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { CashInFieldResponse } from '@/types/admin-panel';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!userData || !['owner', 'city_admin', 'agent'].includes(userData.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Inicio del dia en Lima
    const nowLima = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
    nowLima.setHours(0, 0, 0, 0);
    const dayStartUTC = new Date(nowLima.getTime() - nowLima.getTimezoneOffset() * 60000).toISOString();

    // Pedidos activos (en tránsito) con efectivo
    let activeQuery = supabase
      .from('orders')
      .select('rider_id, total_cents, actual_payment_method, payment_method')
      .not('status', 'in', '("delivered","cancelled","cart","rejected")')
      .or('actual_payment_method.eq.cash,and(actual_payment_method.is.null,payment_method.eq.cash)')
      .gte('created_at', dayStartUTC);

    if (userData.role === 'city_admin' && userData.city_id) {
      activeQuery = activeQuery.eq('city_id', userData.city_id);
    }

    const { data: activeOrders } = await activeQuery;

    // Pedidos entregados hoy con efectivo
    let deliveredQuery = supabase
      .from('orders')
      .select('rider_id, total_cents, actual_payment_method, payment_method')
      .eq('status', 'delivered')
      .or('actual_payment_method.eq.cash,and(actual_payment_method.is.null,payment_method.eq.cash)')
      .gte('delivered_at', dayStartUTC);

    if (userData.role === 'city_admin' && userData.city_id) {
      deliveredQuery = deliveredQuery.eq('city_id', userData.city_id);
    }

    const { data: deliveredOrders } = await deliveredQuery;

    // Obtener info de todos los riders relevantes
    const riderIds = new Set<string>();
    for (const o of [...(activeOrders ?? []), ...(deliveredOrders ?? [])]) {
      if (o.rider_id) riderIds.add(o.rider_id);
    }

    if (riderIds.size === 0) {
      const response: CashInFieldResponse = { riders: [], total_cash_in_field_cents: 0 };
      return NextResponse.json(response);
    }

    const { data: ridersData } = await supabase
      .from('riders')
      .select('id, is_online, users(name)')
      .in('id', Array.from(riderIds));

    // Agregar por rider
    const riderMap = new Map<string, {
      rider_id: string;
      rider_name: string;
      is_online: boolean;
      active_orders_count: number;
      delivered_today_count: number;
      active_cash_cents: number;
      delivered_cash_cents: number;
      total_cash_cents: number;
    }>();

    for (const r of ridersData ?? []) {
      const users = r.users as unknown as { name: string } | null;
      riderMap.set(r.id, {
        rider_id: r.id,
        rider_name: users?.name ?? 'Rider desconocido',
        is_online: r.is_online,
        active_orders_count: 0,
        delivered_today_count: 0,
        active_cash_cents: 0,
        delivered_cash_cents: 0,
        total_cash_cents: 0,
      });
    }

    for (const o of activeOrders ?? []) {
      if (!o.rider_id) continue;
      const entry = riderMap.get(o.rider_id);
      if (!entry) continue;
      entry.active_orders_count++;
      entry.active_cash_cents += o.total_cents ?? 0;
    }

    for (const o of deliveredOrders ?? []) {
      if (!o.rider_id) continue;
      const entry = riderMap.get(o.rider_id);
      if (!entry) continue;
      entry.delivered_today_count++;
      entry.delivered_cash_cents += o.total_cents ?? 0;
    }

    const riders = Array.from(riderMap.values()).map(r => ({
      ...r,
      total_cash_cents: r.active_cash_cents + r.delivered_cash_cents,
    })).sort((a, b) => b.total_cash_cents - a.total_cash_cents);

    const totalCashInField = riders.reduce((sum, r) => sum + r.total_cash_cents, 0);

    const response: CashInFieldResponse = {
      riders,
      total_cash_in_field_cents: totalCashInField,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[financial/cash-in-field]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
