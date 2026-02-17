import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'rider') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { lat, lng } = body as { lat: number; lng: number };

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 });
    }

    if (lat < -20 || lat > 1 || lng < -82 || lng > -68) {
      return NextResponse.json({ error: 'Coordenadas fuera de rango' }, { status: 400 });
    }

    const { data: rider, error: riderError } = await supabase
      .from('riders')
      .select('id, is_online')
      .eq('user_id', user.id)
      .single();

    if (riderError || !rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    if (!rider.is_online) {
      return NextResponse.json(
        { error: 'Debes estar en línea para enviar ubicación' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('riders')
      .update({
        current_lat: lat,
        current_lng: lng,
        last_location_update: new Date().toISOString(),
      })
      .eq('id', rider.id);

    if (updateError) {
      return NextResponse.json({ error: 'Error al actualizar ubicación' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/rider/location error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
