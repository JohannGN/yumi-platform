import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/admin/map/data?city_id=xxx&heatmap_days=30
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
    const cityId = searchParams.get('city_id') || profile.city_id;
    const heatmapDays = parseInt(searchParams.get('heatmap_days') || '30', 10);

    if (!cityId) {
      return NextResponse.json({ error: 'city_id requerido' }, { status: 400 });
    }

    // ── 1. Riders con coordenadas ───────────────────────────────────────────
    const { data: riderRows } = await supabase
      .from('riders')
      .select(`
        id, current_lat, current_lng, is_online, is_available,
        current_order_id, vehicle_type,
        users!inner(name)
      `)
      .eq('city_id', cityId)
      .not('current_lat', 'is', null)
      .not('current_lng', 'is', null);

    const riders = (riderRows ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const u = r.users as { name: string } | null;
      return {
        id: r.id as string,
        name: u?.name ?? '',
        lat: Number(r.current_lat),
        lng: Number(r.current_lng),
        is_online: r.is_online as boolean,
        is_available: r.is_available as boolean,
        current_order_id: r.current_order_id as string | null,
        vehicle_type: r.vehicle_type as string,
      };
    });

    // ── 2. Restaurantes activos ─────────────────────────────────────────────
    const { data: restRows } = await supabase
      .from('restaurants')
      .select('id, name, lat, lng, is_open, address, category_id, opening_hours')
      .eq('city_id', cityId)
      .eq('is_active', true);

    // Lookup category names
    const catIds = [...new Set((restRows ?? []).map((r) => r.category_id))];
    let catNameMap = new Map<string, string>();
    if (catIds.length > 0) {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', catIds);
      catNameMap = new Map((cats ?? []).map((c) => [c.id, c.name]));
    }

    // Helper: check if restaurant should be open per schedule
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const nowLima = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const dayIndex = (nowLima.getDay() + 6) % 7; // 0=Mon..6=Sun
    const dayKey = DAYS[dayIndex];
    const nowTime = `${String(nowLima.getHours()).padStart(2, '0')}:${String(nowLima.getMinutes()).padStart(2, '0')}`;

    const restaurants = (restRows ?? []).map((r) => {
      const hours = r.opening_hours as Record<string, { open: string; close: string; closed: boolean }> | null;
      const todayHours = hours?.[dayKey];
      let scheduleOpen = false;
      let scheduleLabel = '';

      if (!todayHours || todayHours.closed) {
        scheduleLabel = 'Día de descanso';
      } else if (nowTime >= todayHours.open && nowTime <= todayHours.close) {
        scheduleOpen = true;
        scheduleLabel = `Horario: ${todayHours.open} - ${todayHours.close}`;
      } else if (nowTime < todayHours.open) {
        scheduleLabel = `Abre a las ${todayHours.open}`;
      } else {
        scheduleLabel = `Cerró a las ${todayHours.close}`;
      }

      return {
        id: r.id as string,
        name: r.name as string,
        lat: Number(r.lat),
        lng: Number(r.lng),
        is_open: r.is_open as boolean,
        schedule_open: scheduleOpen,
        schedule_label: scheduleLabel,
        address: (r.address as string) || '',
        category_name: catNameMap.get(r.category_id) ?? '',
      };
    });

    // ── 3. Pedidos activos (no cart, no delivered, no cancelled) ─────────────
    const activeStatuses = [
      'awaiting_confirmation', 'pending_confirmation', 'confirmed',
      'preparing', 'ready', 'assigned_rider', 'picked_up', 'in_transit',
    ];

    const { data: orderRows } = await supabase
      .from('orders')
      .select('id, code, status, delivery_lat, delivery_lng, restaurant_id, rider_id')
      .eq('city_id', cityId)
      .in('status', activeStatuses);

    // Resolver nombres de restaurante y rider
    const restIds = [...new Set((orderRows ?? []).map((o) => o.restaurant_id))];
    const riderIds = [...new Set((orderRows ?? []).filter((o) => o.rider_id).map((o) => o.rider_id!))];

    let restNameMap = new Map<string, string>();
    if (restIds.length > 0) {
      const { data: rests } = await supabase
        .from('restaurants')
        .select('id, name')
        .in('id', restIds);
      restNameMap = new Map((rests ?? []).map((r) => [r.id, r.name]));
    }

    let riderNameMap = new Map<string, string>();
    if (riderIds.length > 0) {
      const { data: rds } = await supabase
        .from('riders')
        .select('id, users!inner(name)')
        .in('id', riderIds);
      riderNameMap = new Map(
        (rds ?? []).map((r) => {
          const u = (r as Record<string, unknown>).users as { name: string } | null;
          return [r.id, u?.name ?? ''];
        })
      );
    }

    const active_orders = (orderRows ?? []).map((o) => ({
      id: o.id,
      code: o.code,
      status: o.status,
      delivery_lat: Number(o.delivery_lat),
      delivery_lng: Number(o.delivery_lng),
      restaurant_name: restNameMap.get(o.restaurant_id) ?? '',
      rider_name: o.rider_id ? (riderNameMap.get(o.rider_id) ?? null) : null,
    }));

    // ── 4. Heatmap: pedidos entregados en período ────────────────────────────
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - heatmapDays);

    const { data: heatRows } = await supabase
      .from('orders')
      .select('delivery_lat, delivery_lng')
      .eq('city_id', cityId)
      .eq('status', 'delivered')
      .gte('delivered_at', daysAgo.toISOString());

    // Agrupar por coordenadas redondeadas (4 decimales ≈ 11m precisión)
    const heatMap = new Map<string, number>();
    (heatRows ?? []).forEach((h) => {
      const key = `${Number(h.delivery_lat).toFixed(4)},${Number(h.delivery_lng).toFixed(4)}`;
      heatMap.set(key, (heatMap.get(key) || 0) + 1);
    });

    const heatmap_points = Array.from(heatMap.entries()).map(([key, weight]) => {
      const [lat, lng] = key.split(',').map(Number);
      return { lat, lng, weight };
    });

    return NextResponse.json({
      riders,
      restaurants,
      active_orders,
      heatmap_points,
    });
  } catch (err) {
    console.error('[admin/map/data GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
