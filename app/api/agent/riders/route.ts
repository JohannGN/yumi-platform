// ============================================================
// GET /api/agent/riders — Lista riders con ubicación y pedido actual
// Chat: AGENTE-3
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { checkAgentPermission } from '@/lib/agent-permissions';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !AGENT_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Check permission
    const canView = await checkAgentPermission(user.id, userData.role, 'can_view_riders');
    if (!canView) {
      return NextResponse.json({ error: 'No tienes permiso para ver riders' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('city_id');

    if (!cityId) {
      return NextResponse.json({ error: 'city_id requerido' }, { status: 400 });
    }

    const sc = createServiceRoleClient();

    // Riders with user info
    const { data: riders, error: ridersError } = await sc
      .from('riders')
      .select(`
        id, user_id, vehicle_type, is_online, is_available,
        current_lat, current_lng, last_location_update,
        current_order_id, pay_type, total_deliveries, avg_rating,
        users!inner(name, phone)
      `)
      .eq('city_id', cityId)
      .order('is_online', { ascending: false });

    if (ridersError) {
      console.error('[agent/riders GET]', ridersError);
      return NextResponse.json({ error: 'Error al consultar' }, { status: 500 });
    }

    // Get current order codes for busy riders
    const busyRiderOrderIds = (riders ?? [])
      .filter((r) => r.current_order_id)
      .map((r) => r.current_order_id as string);

    let orderMap: Record<string, { code: string; status: string }> = {};
    if (busyRiderOrderIds.length > 0) {
      const { data: orders } = await sc
        .from('orders')
        .select('id, code, status')
        .in('id', busyRiderOrderIds);

      (orders ?? []).forEach((o) => {
        orderMap[o.id] = { code: o.code, status: o.status };
      });
    }

    // Flatten
    const result = (riders ?? []).map((r) => {
      const userInfo = r.users as { name: string; phone: string };
      const currentOrder = r.current_order_id ? orderMap[r.current_order_id] : null;

      return {
        id: r.id,
        user_id: r.user_id,
        name: userInfo.name,
        phone: userInfo.phone,
        vehicle_type: r.vehicle_type,
        is_online: r.is_online,
        is_available: r.is_available,
        current_lat: r.current_lat,
        current_lng: r.current_lng,
        last_location_update: r.last_location_update,
        current_order_id: r.current_order_id,
        current_order_code: currentOrder?.code ?? null,
        current_order_status: currentOrder?.status ?? null,
        pay_type: r.pay_type,
        total_deliveries: r.total_deliveries,
        avg_rating: r.avg_rating,
      };
    });

    // Sort: online first, then available, then offline
    result.sort((a, b) => {
      if (a.is_online && !b.is_online) return -1;
      if (!a.is_online && b.is_online) return 1;
      if (a.is_available && !b.is_available) return -1;
      if (!a.is_available && b.is_available) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[agent/riders GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
