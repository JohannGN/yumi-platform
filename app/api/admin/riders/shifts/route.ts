import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
    const riderId  = searchParams.get('rider_id') ?? '';
    const dateFrom = searchParams.get('date_from') ?? '';
    const dateTo   = searchParams.get('date_to') ?? '';
    const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit    = Math.min(100, parseInt(searchParams.get('limit') ?? '50', 10));
    const offset   = (page - 1) * limit;

    let query = supabase
      .from('shift_logs')
      .select(`
        id, rider_id, city_id, started_at, ended_at, duration_minutes, deliveries_count,
        riders!inner(
          users!inner(name)
        )
      `, { count: 'exact' });

    if (riderId)  query = query.eq('rider_id', riderId);
    if (dateFrom) query = query.gte('started_at', dateFrom);
    if (dateTo)   query = query.lte('started_at', dateTo);

    if (profile.role === 'city_admin' && profile.city_id) {
      query = query.eq('city_id', profile.city_id);
    }

    const { data: rows, error, count } = await query
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const shifts = (rows ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const rider = r.riders as { users: { name: string } } | null;
      return {
        ...row,
        rider_name: rider?.users?.name ?? '',
        riders: undefined,
      };
    });

    return NextResponse.json({ shifts, total: count ?? 0, page, limit });

  } catch (err) {
    console.error('[admin/riders/shifts GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
