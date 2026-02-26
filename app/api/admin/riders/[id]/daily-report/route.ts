import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DailyRiderReport, ApproveDailyReportPayload } from '@/types/admin-panel';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: riderId } = await params;

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
    const dateStr = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

    // Info del rider
    const { data: riderData } = await supabase
      .from('riders')
      .select('id, users(name)')
      .eq('id', riderId)
      .single();

    if (!riderData) return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });

    const riderUsers = riderData.users as unknown as { name: string } | null;

    // Reporte del dia
    const { data: report } = await supabase
      .from('daily_rider_reports')
      .select('*')
      .eq('rider_id', riderId)
      .eq('date', dateStr)
      .single();

    // Orders entregados ese dia
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

    // Tolerancia
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('max_cash_discrepancy_cents')
      .single();
    const maxDiscrepancy = settings?.max_cash_discrepancy_cents ?? 500;

    const declaredCash = report?.cash_collected_cents ?? 0;
    const declaredPos = report?.pos_collected_cents ?? 0;
    const declaredYapePlin = report?.yape_plin_collected_cents ?? 0;
    const cashDiscrepancy = declaredCash - expectedCash;
    const hasDiscrepancy = Math.abs(cashDiscrepancy) > maxDiscrepancy;

    // Turno del dia
    const { data: shiftLog } = await supabase
      .from('shift_logs')
      .select('started_at, ended_at')
      .eq('rider_id', riderId)
      .gte('started_at', `${dateStr}T00:00:00-05:00`)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    const result: DailyRiderReport = {
      rider_id: riderId,
      rider_name: riderUsers?.name ?? 'Rider desconocido',
      report_id: report?.id ?? null,
      report_status: report?.status ?? null,
      shift_started_at: shiftLog?.started_at ?? report?.shift_started_at ?? null,
      shift_ended_at: shiftLog?.ended_at ?? report?.shift_ended_at ?? null,
      total_deliveries: report?.total_deliveries ?? (riderOrders?.length ?? 0),
      declared_cash_cents: declaredCash,
      declared_pos_cents: declaredPos,
      declared_yape_plin_cents: declaredYapePlin,
      notes: report?.notes ?? null,
      expected_cash_cents: expectedCash,
      expected_pos_cents: expectedPos,
      expected_yape_plin_cents: expectedYapePlin,
      cash_discrepancy_cents: cashDiscrepancy,
      has_discrepancy: hasDiscrepancy,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[riders/daily-report GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: riderId } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Solo owner y city_admin pueden aprobar/rechazar
    if (!userData || !['owner', 'city_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 });
    }

    const body = await req.json() as ApproveDailyReportPayload;
    const { status, admin_notes } = body;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Estado invalido' }, { status: 400 });
    }

    if (status === 'rejected' && !admin_notes?.trim()) {
      return NextResponse.json({ error: 'La nota es obligatoria al rechazar' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

    // Buscar el reporte
    const { data: report } = await supabase
      .from('daily_rider_reports')
      .select('id, status')
      .eq('rider_id', riderId)
      .eq('date', dateStr)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }

    if (report.status !== 'submitted') {
      return NextResponse.json({ error: 'Solo se pueden procesar reportes en estado "submitted"' }, { status: 409 });
    }

    const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (admin_notes) updateData.notes = admin_notes;

    const { error: updateError } = await supabase
      .from('daily_rider_reports')
      .update(updateData)
      .eq('id', report.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, report_id: report.id, status });
  } catch (err) {
    console.error('[riders/daily-report PATCH]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
