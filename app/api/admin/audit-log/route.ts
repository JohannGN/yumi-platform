import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const entity_type = searchParams.get('entity_type');
    const user_id = searchParams.get('user_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = (page - 1) * limit;

    const serviceClient = createServiceClient();

    // Query audit_log WITHOUT join (avoids FK dependency issues)
    let query = serviceClient
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filters
    if (action) query = query.eq('action', action);
    if (entity_type) query = query.eq('entity_type', entity_type);
    if (user_id) query = query.eq('user_id', user_id);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data: rows, count, error } = await query;
    if (error) {
      console.error('[admin/audit-log GET]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch user names separately
    const userIds = [...new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))];
    const userMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: users } = await serviceClient
        .from('users')
        .select('id, name')
        .in('id', userIds);

      for (const u of users ?? []) {
        userMap.set(u.id, u.name);
      }
    }

    const entries = (rows ?? []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_name: userMap.get(r.user_id) ?? 'Sistema',
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      details: r.details,
      created_at: r.created_at,
    }));

    return NextResponse.json({ entries, total: count ?? entries.length });
  } catch (err) {
    console.error('[admin/audit-log GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
