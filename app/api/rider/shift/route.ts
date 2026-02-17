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
    const { action } = body as { action: 'start' | 'end' };

    if (!['start', 'end'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    const { data: rider, error: riderError } = await supabase
      .from('riders')
      .select('id, is_online, current_order_id, shift_started_at, shift_ended_at')
      .eq('user_id', user.id)
      .single();

    if (riderError || !rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    if (action === 'start') {
      if (rider.is_online) {
        return NextResponse.json({ error: 'Ya tienes un turno activo' }, { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('riders')
        .update({
          is_online: true,
          is_available: true,
          shift_started_at: new Date().toISOString(),
          shift_ended_at: null,
        })
        .eq('id', rider.id);

      if (updateError) {
        return NextResponse.json({ error: 'Error al iniciar turno' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'started' });
    }

    // action === 'end'
    if (!rider.is_online) {
      return NextResponse.json({ error: 'No tienes un turno activo' }, { status: 400 });
    }

    if (rider.current_order_id) {
      return NextResponse.json(
        { error: 'Completa tu entrega actual antes de finalizar turno' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('riders')
      .update({
        is_online: false,
        is_available: false,
        shift_ended_at: new Date().toISOString(),
      })
      .eq('id', rider.id);

    if (updateError) {
      return NextResponse.json({ error: 'Error al finalizar turno' }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: 'ended' });
  } catch (err) {
    console.error('PATCH /api/rider/shift error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
