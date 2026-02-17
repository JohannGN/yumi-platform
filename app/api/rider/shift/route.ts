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

    if (!action || !['start', 'end'].includes(action)) {
      return NextResponse.json(
        { error: 'Acción inválida. Usa "start" o "end"' },
        { status: 400 }
      );
    }

    // Get rider
    const { data: rider, error: riderError } = await supabase
      .from('riders')
      .select('id, current_order_id, shift_started_at')
      .eq('user_id', user.id)
      .single();

    if (riderError || !rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    if (action === 'start') {
      const { error } = await supabase
        .from('riders')
        .update({
          shift_started_at: new Date().toISOString(),
          shift_ended_at: null,
          is_online: true,
          is_available: true,
        })
        .eq('id', rider.id);

      if (error) {
        console.error('Start shift error:', error);
        return NextResponse.json({ error: 'Error al iniciar turno' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Turno iniciado',
        shift_started_at: new Date().toISOString(),
      });
    }

    // action === 'end'
    if (rider.current_order_id) {
      return NextResponse.json(
        { error: 'Completa tu entrega antes de cerrar turno' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('riders')
      .update({
        shift_ended_at: new Date().toISOString(),
        is_online: false,
        is_available: false,
      })
      .eq('id', rider.id);

    if (error) {
      console.error('End shift error:', error);
      return NextResponse.json({ error: 'Error al cerrar turno' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Turno finalizado',
      shift_ended_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('PATCH /api/rider/shift error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
