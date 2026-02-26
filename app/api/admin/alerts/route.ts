// ============================================================
// GET /api/admin/alerts — Alertas operativas calculadas en tiempo real
// No se almacenan — se calculan en cada request
// Auth: owner + city_admin + agent
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { OperationalAlert, AlertsSummary } from '@/types/admin-panel-additions';

// Day keys matching our schema convention
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function getLimaDayAndTime(): { dayKey: string; currentMinutes: number; nowISO: string } {
  const now = new Date();
  // Lima is UTC-5
  const limaOffset = -5 * 60;
  const localOffset = now.getTimezoneOffset();
  const limaTime = new Date(now.getTime() + (localOffset + limaOffset) * 60000);
  const jsDay = limaTime.getDay(); // 0=Sun
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // Mon=0, Sun=6
  const currentMinutes = limaTime.getHours() * 60 + limaTime.getMinutes();
  return { dayKey: DAY_KEYS[dayIndex], currentMinutes, nowISO: now.toISOString() };
}

function minutesSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let cityId = searchParams.get('city_id');

    // city_admin auto-filter
    if (profile.role === 'city_admin') cityId = profile.city_id;

    // Agent: use first assigned city if no city_id passed
    if (profile.role === 'agent' && !cityId) {
      const { data: agentCities } = await supabase
        .from('agent_cities')
        .select('city_id')
        .eq('agent_id', user.id)
        .limit(1);
      cityId = agentCities?.[0]?.city_id ?? null;
    }

    if (!cityId) {
      return NextResponse.json({ alerts: [], summary: { critical: 0, high: 0, warning: 0, total: 0 } });
    }

    const { dayKey, currentMinutes, nowISO } = getLimaDayAndTime();
    const alerts: OperationalAlert[] = [];

    // ── 1. Restaurantes que no abrieron a su hora ──
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('id, name, is_open, is_active, opening_hours, daily_opening_time')
      .eq('city_id', cityId)
      .eq('is_active', true)
      .eq('is_open', false);

    for (const r of restaurants ?? []) {
      const daySchedule = r.opening_hours?.[dayKey];
      if (!daySchedule || daySchedule.closed) continue;

      const [openH, openM] = daySchedule.open.split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      // 30 min tolerance after scheduled opening
      if (currentMinutes > openMinutes + 30 && currentMinutes < openMinutes + 480) {
        const elapsed = currentMinutes - openMinutes;
        alerts.push({
          type: 'restaurant_not_opened',
          priority: 'warning',
          message: `${r.name} debió abrir a las ${daySchedule.open} y lleva ${elapsed} min sin abrir`,
          entity_type: 'restaurant',
          entity_id: r.id,
          entity_link: '/admin/restaurantes',
          created_at: nowISO,
          minutes_elapsed: elapsed,
        });
      }
    }

    // ── 2. Riders offline en horario de turno ──
    const { data: offlineRiders } = await supabase
      .from('riders')
      .select('id, user_id, is_online, users:user_id(name)')
      .eq('city_id', cityId)
      .eq('is_online', false);

    if (offlineRiders && offlineRiders.length > 0) {
      const riderIds = offlineRiders.map((r) => r.id);
      const jsDayOfWeek = new Date().getDay();
      const schemaDay = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;

      const { data: shifts } = await supabase
        .from('shift_schedules')
        .select('rider_id, scheduled_start, scheduled_end')
        .in('rider_id', riderIds)
        .eq('day_of_week', schemaDay)
        .eq('is_active', true);

      for (const shift of shifts ?? []) {
        const [startH, startM] = shift.scheduled_start.split(':').map(Number);
        const [endH, endM] = shift.scheduled_end.split(':').map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;

        if (currentMinutes >= startMin && currentMinutes <= endMin) {
          const rider = offlineRiders.find((r) => r.id === shift.rider_id);
          const riderName = (rider?.users as unknown as { name: string } | null)?.name ?? 'Rider';
          const elapsed = currentMinutes - startMin;
          alerts.push({
            type: 'rider_offline_in_shift',
            priority: 'warning',
            message: `${riderName} debería estar conectado (turno ${shift.scheduled_start}-${shift.scheduled_end})`,
            entity_type: 'rider',
            entity_id: shift.rider_id,
            entity_link: '/admin/riders',
            created_at: nowISO,
            minutes_elapsed: elapsed,
          });
        }
      }
    }

    // ── 3. Pedidos estancados en pending_confirmation > 15 min ──
    const { data: stuckPending } = await supabase
      .from('orders')
      .select('id, code, created_at')
      .eq('city_id', cityId)
      .eq('status', 'pending_confirmation')
      .lt('created_at', new Date(Date.now() - 15 * 60000).toISOString());

    for (const o of stuckPending ?? []) {
      const elapsed = minutesSince(o.created_at);
      alerts.push({
        type: 'order_stuck_pending',
        priority: 'high',
        message: `Pedido ${o.code} lleva ${elapsed} min sin confirmar por restaurante`,
        entity_type: 'order',
        entity_id: o.id,
        entity_link: '/admin/pedidos',
        created_at: nowISO,
        minutes_elapsed: elapsed,
      });
    }

    // ── 4. Pedidos estancados en preparing > 30 min ──
    const { data: stuckPreparing } = await supabase
      .from('orders')
      .select('id, code, restaurant_confirmed_at, created_at')
      .eq('city_id', cityId)
      .eq('status', 'preparing');

    for (const o of stuckPreparing ?? []) {
      const refTime = o.restaurant_confirmed_at ?? o.created_at;
      const elapsed = minutesSince(refTime);
      if (elapsed > 30) {
        alerts.push({
          type: 'order_stuck_preparing',
          priority: 'high',
          message: `Pedido ${o.code} lleva ${elapsed} min preparándose`,
          entity_type: 'order',
          entity_id: o.id,
          entity_link: '/admin/pedidos',
          created_at: nowISO,
          minutes_elapsed: elapsed,
        });
      }
    }

    // ── 5. Riders desaparecidos (online pero sin GPS > 10 min) ──
    const { data: disappearedRiders } = await supabase
      .from('riders')
      .select('id, user_id, last_location_update, users:user_id(name)')
      .eq('city_id', cityId)
      .eq('is_online', true)
      .lt('last_location_update', new Date(Date.now() - 10 * 60000).toISOString());

    for (const r of disappearedRiders ?? []) {
      const riderName = (r.users as unknown as { name: string } | null)?.name ?? 'Rider';
      const elapsed = r.last_location_update ? minutesSince(r.last_location_update) : 99;
      alerts.push({
        type: 'rider_disappeared',
        priority: 'critical',
        message: `${riderName} está online pero sin señal GPS hace ${elapsed} min`,
        entity_type: 'rider',
        entity_id: r.id,
        entity_link: '/admin/riders',
        created_at: nowISO,
        minutes_elapsed: elapsed,
      });
    }

    // ── 6. Pedidos listos sin rider > 10 min ──
    const { data: noRiderOrders } = await supabase
      .from('orders')
      .select('id, code, ready_at, created_at')
      .eq('city_id', cityId)
      .eq('status', 'ready')
      .is('rider_id', null);

    for (const o of noRiderOrders ?? []) {
      const refTime = o.ready_at ?? o.created_at;
      const elapsed = minutesSince(refTime);
      if (elapsed > 10) {
        alerts.push({
          type: 'order_no_rider',
          priority: 'critical',
          message: `Pedido ${o.code} listo hace ${elapsed} min sin rider asignado`,
          entity_type: 'order',
          entity_id: o.id,
          entity_link: '/admin/pedidos',
          created_at: nowISO,
          minutes_elapsed: elapsed,
        });
      }
    }

    // ── Sort: critical first, then high, then warning ──
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, warning: 2 };
    alerts.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));

    const summary: AlertsSummary = {
      critical: alerts.filter((a) => a.priority === 'critical').length,
      high: alerts.filter((a) => a.priority === 'high').length,
      warning: alerts.filter((a) => a.priority === 'warning').length,
      total: alerts.length,
    };

    return NextResponse.json({ alerts, summary });
  } catch (err) {
    console.error('[admin/alerts GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
