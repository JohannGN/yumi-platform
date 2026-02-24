import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verify rider role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'rider') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Get current rider state
    const { data: rider, error: riderError } = await supabase
      .from('riders')
      .select('id, is_online, is_available, current_order_id, current_lat, current_lng, city_id')
      .eq('user_id', user.id)
      .single();

    if (riderError || !rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    // Block going offline with active order
    if (rider.is_online && rider.current_order_id) {
      return NextResponse.json(
        { error: 'Completa tu entrega antes de desconectarte' },
        { status: 400 }
      );
    }

    const newOnline = !rider.is_online;

    const { error: updateError } = await supabase
      .from('riders')
      .update({
        is_online: newOnline,
        is_available: newOnline, // Available = online when no active order
      })
      .eq('id', rider.id);

    if (updateError) {
      console.error('Toggle online error:', updateError);
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }

    // Check coverage when going online
    if (newOnline && rider.current_lat && rider.current_lng && rider.city_id) {
      const { data: coverage } = await supabase.rpc('check_rider_coverage', {
        p_rider_lat: rider.current_lat,
        p_rider_lng: rider.current_lng,
        p_city_id: rider.city_id,
      });

      const hasCoverage = coverage?.[0]?.has_coverage ?? false;

      if (!hasCoverage) {
        return NextResponse.json({
          is_online: newOnline,
          is_available: newOnline,
          warning: 'Tu ubicación actual está fuera de las zonas de cobertura. No recibirás pedidos hasta que estés dentro de una zona activa.',
        });
      }
    }

    return NextResponse.json({
      is_online: newOnline,
      is_available: newOnline,
    });
  } catch (err) {
    console.error('PATCH /api/rider/toggle-online error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
