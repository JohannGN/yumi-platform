import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    const { data: rider } = await supabase
      .from('riders')
      .select('id, show_earnings, pay_type, commission_percentage')
      .eq('user_id', user.id)
      .single();

    if (!rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    // Parse period filter
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';

    // Calculate date range (Lima timezone UTC-5)
    const now = new Date();
    const limaOffset = -5 * 60;
    const limaTime = new Date(now.getTime() + (now.getTimezoneOffset() + limaOffset) * 60000);

    let startDate: Date;
    switch (period) {
      case 'week': {
        startDate = new Date(limaTime);
        const day = startDate.getDay();
        const diff = day === 0 ? 6 : day - 1;
        startDate.setDate(startDate.getDate() - diff);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'month': {
        startDate = new Date(limaTime);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      default: { // today
        startDate = new Date(limaTime);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
    }

    // Convert back to UTC
    const startDateUTC = new Date(startDate.getTime() - (now.getTimezoneOffset() + limaOffset) * 60000);

    // Fetch orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id, code, total_cents, payment_method, actual_payment_method,
        customer_rating, delivered_at, rider_bonus_cents,
        restaurant:restaurants!orders_restaurant_id_fkey(name)
      `)
      .eq('rider_id', rider.id)
      .eq('status', 'delivered')
      .gte('delivered_at', startDateUTC.toISOString())
      .order('delivered_at', { ascending: false })
      .limit(100);

    if (ordersError) {
      console.error('History query error:', ordersError);
      return NextResponse.json({ error: 'Error al cargar historial' }, { status: 500 });
    }

    const commRate = rider.show_earnings && rider.pay_type === 'commission' && rider.commission_percentage
      ? parseFloat(String(rider.commission_percentage)) / 100
      : null;

    const history = (orders ?? []).map((o) => {
      const restaurant = o.restaurant as { name: string } | null;
      const result: Record<string, unknown> = {
        id: o.id,
        code: o.code,
        restaurant_name: restaurant?.name ?? '',
        total_cents: o.total_cents,
        actual_payment_method: o.actual_payment_method,
        payment_method: o.payment_method,
        customer_rating: o.customer_rating,
        delivered_at: o.delivered_at,
      };

      // Earnings only if show_earnings + commission
      if (commRate !== null) {
        result.earnings_cents = Math.round(o.total_cents * commRate) + (o.rider_bonus_cents || 0);
      }

      return result;
    });

    return NextResponse.json(history);
  } catch (err) {
    console.error('GET /api/rider/history error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
