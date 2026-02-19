import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DailyRiderReport } from '@/types/admin-panel';

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

    const { searchParams } = new URL(req.url);
    // Fecha default: hoy en Lima
    const defaultDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    const dateStr = searchParams.get('date') ?? defaultDate;

    // Obtener tolerancia desde platform_settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('max_cash_discrepancy_cents')
      .single();
    const maxDiscrepancy = settings?.max_cash_discrepancy_cents ?? 500;

    // Riders que tuvieron turno ese dia (shift_logs)
    let ridersQuery = supabase
      .from('shift_logs')
      .select('rider_id, started_at, ended_at, deliveries_count, riders(id, user_id, users(id, name))')
      .gte('started_at', `${dateStr}T00:00:00-05:00`)
      .lte('started_at', `${dateStr}T23:59:59-05:00`);

    if (userData.role === 'city_admin' && userData.city_id) {
      ridersQuery = ridersQuery.eq('city_id', userData.city_id);
    }

    const { data: shiftLogs } = await ridersQuery;

    // Obtener reportes diarios para esa fecha
    const riderIdsFromShifts = [...new Set((shiftLogs ?? []).map(sl => sl.rider_id as string))];

    const { data: reports } = riderIdsFromShifts.length > 0
      ? await supabase
          .from('daily_rider_reports')
          .select('*')
          .in('rider_id', riderIdsFromShifts)
          .eq('date', dateStr)
      : { data: [] };

    const reportMap = new Map<string, typeof reports extends (infer T)[] ? T : never>();
    for (const r of reports ?? []) {
      reportMap.set(r.rider_id, r);
    }

    // Para cada rider, calcular montos esperados desde orders
    const result: DailyRiderReport[] = [];

    for (const shift of shiftLogs ?? []) {
      const riderId = shift.rider_id as string;
      const riderData = shift.riders as { id: string; users: { name: string } | null } | null;
      const riderName = riderData?.users?.name ?? 'Rider desconocido';

      // Orders entregados por este rider ese dia
      const { data: riderOrders } = await supabase
        .from('orders')
        .select('total_cents, actual_payment_method, payment_method, delivered_at')
        .eq('rider_id', riderId)
        .eq('status', 'delivered')
        .gte('delivered_at', `${dateStr}T00:00:00-05:00`)
        .lte('delivered_at', `${dateStr}T23:59:59-05:00`);

      let expectedCash = 0;
      let expectedPos = 0;
      let expectedYapePlin = 0;

      for (const o of riderOrders ?? []) {
        const method = o.actual_payment_method ?? o.payment_method;
        if (method === 'cash') expectedCash += o.total_cents ?? 0;
        else if (method === 'pos') expectedPos += o.total_cents ?? 0;
        else if (['yape', 'plin'].includes(method)) expectedYapePlin += o.total_cents ?? 0;
      }

      const report = reportMap.get(riderId);
      const declaredCash = report?.cash_collected_cents ?? 0;
      const declaredPos = report?.pos_collected_cents ?? 0;
      const declaredYapePlin = report?.yape_plin_collected_cents ?? 0;
      const cashDiscrepancy = declaredCash - expectedCash;
      const hasDiscrepancy = Math.abs(cashDiscrepancy) > maxDiscrepancy;

      result.push({
        rider_id: riderId,
        rider_name: riderName,
        report_id: report?.id ?? null,
        report_status: report?.status ?? null,
        shift_started_at: shift.started_at as string | null,
        shift_ended_at: shift.ended_at as string | null,
        total_deliveries: report?.total_deliveries ?? ((riderOrders ?? []).length),
        declared_cash_cents: declaredCash,
        declared_pos_cents: declaredPos,
        declared_yape_plin_cents: declaredYapePlin,
        notes: report?.notes ?? null,
        expected_cash_cents: expectedCash,
        expected_pos_cents: expectedPos,
        expected_yape_plin_cents: expectedYapePlin,
        cash_discrepancy_cents: cashDiscrepancy,
        has_discrepancy: hasDiscrepancy,
      });
    }

    // Ordenar: submitted primero (requieren accion), luego el resto
    result.sort((a, b) => {
      const order = { submitted: 0, rejected: 1, approved: 2, draft: 3, null: 4 };
      const aOrder = order[a.report_status as keyof typeof order] ?? 4;
      const bOrder = order[b.report_status as keyof typeof order] ?? 4;
      return aOrder - bOrder;
    });

    return NextResponse.json({ date: dateStr, reports: result });
  } catch (err) {
    console.error('[financial/daily-riders]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
