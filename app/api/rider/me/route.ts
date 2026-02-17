import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verify role
    const { data: userData } = await supabase
      .from('users')
      .select('role, name, phone, email, avatar_url')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'rider') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Get rider with city name
    const { data: rider, error } = await supabase
      .from('riders')
      .select(`
        *,
        city:cities!riders_city_id_fkey(name)
      `)
      .eq('user_id', user.id)
      .single();

    if (error || !rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    const cityName = (rider.city as { name: string } | null)?.name ?? '';

    return NextResponse.json({
      id: rider.id,
      user_id: rider.user_id,
      city_id: rider.city_id,
      city_name: cityName,
      name: userData.name,
      phone: userData.phone,
      email: userData.email,
      avatar_url: userData.avatar_url,
      vehicle_type: rider.vehicle_type,
      vehicle_plate: rider.vehicle_plate,
      is_online: rider.is_online,
      is_available: rider.is_available,
      current_order_id: rider.current_order_id,
      whatsapp_last_message_at: rider.whatsapp_last_message_at,
      shift_started_at: rider.shift_started_at,
      shift_ended_at: rider.shift_ended_at,
      total_deliveries: rider.total_deliveries,
      avg_rating: parseFloat(String(rider.avg_rating)) || 0,
      total_ratings: rider.total_ratings,
      pay_type: rider.pay_type,
      show_earnings: rider.show_earnings,
      commission_percentage: rider.commission_percentage
        ? parseFloat(String(rider.commission_percentage))
        : null,
      created_at: rider.created_at,
    });
  } catch (err) {
    console.error('GET /api/rider/me error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
