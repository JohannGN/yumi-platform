import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { FinancialSummary, DailyFinancialBreakdown } from '@/types/admin-panel';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth check
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

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get('period') ?? 'today') as 'today' | 'week' | 'month';
    const cityId = searchParams.get('city_id') ?? null;

    // Usar timezone Lima para calculos
    const tzOffset = '-05:00';

    // Calcular rango de fechas
    const now = new Date();
    let startDate: string;
    const endDate = now.toISOString();

    if (period === 'today') {
      const todayLima = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
      todayLima.setHours(0, 0, 0, 0);
      startDate = new Date(todayLima.getTime() - todayLima.getTimezoneOffset() * 60000).toISOString();
    } else if (period === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString();
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString();
    }

    // Query base de orders entregados en el periodo
    let ordersQuery = supabase
      .from('orders')
      .select('total_cents, delivery_fee_cents, rider_bonus_cents, actual_payment_method, payment_method, delivered_at, city_id')
      .eq('status', 'delivered')
      .gte('delivered_at', startDate)
      .lte('delivered_at', endDate);

    if (cityId) ordersQuery = ordersQuery.eq('city_id', cityId);
    else if (userData.role === 'city_admin' && userData.city_id) {
      ordersQuery = ordersQuery.eq('city_id', userData.city_id);
    }

    const { data: orders, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;

    // KPIs agregados
    let totalRevenueCents = 0;
    let deliveryFeesCents = 0;
    let riderBonusesCents = 0;
    let cashCents = 0;
    let posCents = 0;
    let yapePlinCents = 0;

    for (const o of orders ?? []) {
      const method = o.actual_payment_method ?? o.payment_method;
      totalRevenueCents += o.total_cents ?? 0;
      deliveryFeesCents += o.delivery_fee_cents ?? 0;
      riderBonusesCents += o.rider_bonus_cents ?? 0;
      if (method === 'cash') cashCents += o.total_cents ?? 0;
      else if (method === 'pos') posCents += o.total_cents ?? 0;
      else if (['yape', 'plin'].includes(method)) yapePlinCents += o.total_cents ?? 0;
    }

    // Efectivo en calle (pedidos activos con pago en efectivo ahora mismo)
    let cashInFieldQuery = supabase
      .from('orders')
      .select('total_cents, actual_payment_method, payment_method')
      .not('status', 'in', '("delivered","cancelled","cart")')
      .or('actual_payment_method.eq.cash,and(actual_payment_method.is.null,payment_method.eq.cash)');

    if (cityId) cashInFieldQuery = cashInFieldQuery.eq('city_id', cityId);
    else if (userData.role === 'city_admin' && userData.city_id) {
      cashInFieldQuery = cashInFieldQuery.eq('city_id', userData.city_id);
    }

    const { data: activeOrders } = await cashInFieldQuery;
    const cashInFieldCents = (activeOrders ?? []).reduce((sum, o) => sum + (o.total_cents ?? 0), 0);

    // Pendientes de validar
    const { count: pendingCount } = await supabase
      .from('daily_rider_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'submitted');

    // Daily breakdown — ultimos 7 dias siempre (para el grafico)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let breakdownQuery = supabase
      .from('orders')
      .select('total_cents, actual_payment_method, payment_method, delivered_at')
      .eq('status', 'delivered')
      .gte('delivered_at', sevenDaysAgo.toISOString());

    if (cityId) breakdownQuery = breakdownQuery.eq('city_id', cityId);
    else if (userData.role === 'city_admin' && userData.city_id) {
      breakdownQuery = breakdownQuery.eq('city_id', userData.city_id);
    }

    const { data: breakdownOrders } = await breakdownQuery;

    // Agrupar por dia Lima
    const dayMap = new Map<string, DailyFinancialBreakdown>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      dayMap.set(dateStr, { date: dateStr, cash_cents: 0, pos_cents: 0, yape_plin_cents: 0, total_cents: 0 });
    }

    for (const o of breakdownOrders ?? []) {
      if (!o.delivered_at) continue;
      const dateStr = new Date(o.delivered_at).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const entry = dayMap.get(dateStr);
      if (!entry) continue;
      const method = o.actual_payment_method ?? o.payment_method;
      entry.total_cents += o.total_cents ?? 0;
      if (method === 'cash') entry.cash_cents += o.total_cents ?? 0;
      else if (method === 'pos') entry.pos_cents += o.total_cents ?? 0;
      else if (['yape', 'plin'].includes(method)) entry.yape_plin_cents += o.total_cents ?? 0;
    }

    const summary: FinancialSummary = {
      period,
      total_revenue_cents: totalRevenueCents,
      delivery_fees_cents: deliveryFeesCents,
      rider_bonuses_cents: riderBonusesCents,
      cash_in_field_cents: cashInFieldCents,
      pending_validations_count: pendingCount ?? 0,
      by_payment_method: {
        cash_cents: cashCents,
        pos_cents: posCents,
        yape_plin_cents: yapePlinCents,
      },
      daily_breakdown: Array.from(dayMap.values()),
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error('[financial/summary]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
