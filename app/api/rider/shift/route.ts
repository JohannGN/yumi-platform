// app/api/rider/shift/route.ts — MODIFICACIÓN Chat 7A
// Cambio: integrar shift_logs al iniciar y finalizar turno

// ============================================================
// INSTRUCCIÓN: Modificar app/api/rider/shift/route.ts
// ============================================================

// AGREGAR después de actualizar riders.is_online=true (acción 'start'):
/*
  // ── Chat 7A: Crear shift_log al iniciar turno ──
  await supabase.from('shift_logs').insert({
    rider_id: riderId,
    city_id: rider.city_id,
    started_at: new Date().toISOString(),
  });
  // ── Fin Chat 7A ──
*/

// AGREGAR después de actualizar riders.is_online=false (acción 'end'):
/*
  // ── Chat 7A: Cerrar shift_log al finalizar turno ──
  const { data: openShift } = await supabase
    .from('shift_logs')
    .select('id, started_at')
    .eq('rider_id', riderId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (openShift) {
    const startedAt = new Date(openShift.started_at);
    const endedAt = new Date();
    const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

    // Contar entregas realizadas durante este turno
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('rider_id', riderId)
      .eq('status', 'delivered')
      .gte('delivered_at', openShift.started_at)
      .lte('delivered_at', endedAt.toISOString());

    await supabase
      .from('shift_logs')
      .update({
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes,
        deliveries_count: count || 0,
      })
      .eq('id', openShift.id);
  }
  // ── Fin Chat 7A ──
*/

// ============================================================
// El archivo completo modificado se encuentra abajo.
// REEMPLAZAR app/api/rider/shift/route.ts con esta versión:
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action } = await request.json() as { action: 'start' | 'end' };
    if (!['start', 'end'].includes(action)) {
      return NextResponse.json({ error: 'action must be start or end' }, { status: 400 });
    }

    // Get rider record
    const { data: rider } = await supabase
      .from('riders')
      .select('id, city_id, current_order_id, is_online')
      .eq('user_id', user.id)
      .single();

    if (!rider) return NextResponse.json({ error: 'Rider not found' }, { status: 404 });

    const riderId = rider.id;

    if (action === 'start') {
      // Start shift
      const { error } = await supabase
        .from('riders')
        .update({
          is_online: true,
          is_available: true,
          shift_started_at: new Date().toISOString(),
          shift_ended_at: null,
        })
        .eq('id', riderId);

      if (error) throw error;

      // ── Chat 7A: Registrar inicio de turno ──
      await supabase.from('shift_logs').insert({
        rider_id: riderId,
        city_id: rider.city_id,
        started_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, action: 'started' });
    }

    // End shift
    if (rider.current_order_id) {
      return NextResponse.json(
        { error: 'No puedes finalizar el turno con un pedido activo' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('riders')
      .update({
        is_online: false,
        is_available: false,
        shift_ended_at: new Date().toISOString(),
        current_order_id: null,
      })
      .eq('id', riderId);

    if (error) throw error;

    // ── Chat 7A: Cerrar shift_log ──
    const { data: openShift } = await supabase
      .from('shift_logs')
      .select('id, started_at')
      .eq('rider_id', riderId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (openShift) {
      const startedAt = new Date(openShift.started_at);
      const endedAt = new Date();
      const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('rider_id', riderId)
        .eq('status', 'delivered')
        .gte('delivered_at', openShift.started_at)
        .lte('delivered_at', endedAt.toISOString());

      await supabase
        .from('shift_logs')
        .update({
          ended_at: endedAt.toISOString(),
          duration_minutes: durationMinutes,
          deliveries_count: count || 0,
        })
        .eq('id', openShift.id);
    }

    return NextResponse.json({ success: true, action: 'ended' });
  } catch (error) {
    console.error('[rider/shift]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
