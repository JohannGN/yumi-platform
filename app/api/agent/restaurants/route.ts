// ============================================================
// GET /api/agent/restaurants — Lista restaurantes de la ciudad activa
// Chat: AGENTE-3
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

const DAY_MAP: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

function shouldBeOpen(openingHours: Record<string, { open: string; close: string; closed: boolean }>): {
  shouldBeOpen: boolean;
  todaySchedule: { open: string; close: string; closed: boolean } | null;
} {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
  const dayKey = DAY_MAP[now.getDay()];
  const schedule = openingHours?.[dayKey];

  if (!schedule || schedule.closed) {
    return { shouldBeOpen: false, todaySchedule: schedule ?? null };
  }

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isInRange = currentTime >= schedule.open && currentTime <= schedule.close;

  return { shouldBeOpen: isInRange, todaySchedule: schedule };
}

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

    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('city_id');
    const statusFilter = searchParams.get('status') || 'all'; // all | open | closed | alert

    if (!cityId) {
      return NextResponse.json({ error: 'city_id requerido' }, { status: 400 });
    }

    const sc = createServiceRoleClient();

    const { data: restaurants, error: restError } = await sc
      .from('restaurants')
      .select(`
        id, name, slug, is_open, is_active, accepts_orders,
        commission_mode, phone, whatsapp, opening_hours,
        total_orders, estimated_prep_minutes,
        categories!inner(name)
      `)
      .eq('city_id', cityId)
      .eq('is_active', true)
      .order('name');

    if (restError) {
      console.error('[agent/restaurants GET]', restError);
      return NextResponse.json({ error: 'Error al consultar' }, { status: 500 });
    }

    // Process and calculate alerts
    const processed = (restaurants ?? []).map((r) => {
      const hours = (r.opening_hours ?? {}) as Record<string, { open: string; close: string; closed: boolean }>;
      const { shouldBeOpen: sbo } = shouldBeOpen(hours);
      const alert = sbo && !r.is_open;

      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        category_name: (r.categories as { name: string })?.name ?? '',
        is_open: r.is_open,
        is_active: r.is_active,
        accepts_orders: r.accepts_orders,
        commission_mode: r.commission_mode ?? 'global',
        phone: r.phone,
        whatsapp: r.whatsapp,
        opening_hours: hours,
        should_be_open: sbo,
        alert,
        total_orders: r.total_orders,
        estimated_prep_minutes: r.estimated_prep_minutes,
      };
    });

    // Filter
    let filtered = processed;
    if (statusFilter === 'open') filtered = processed.filter((r) => r.is_open);
    else if (statusFilter === 'closed') filtered = processed.filter((r) => !r.is_open);
    else if (statusFilter === 'alert') filtered = processed.filter((r) => r.alert);

    // Sort: alerts first, then open, then closed
    filtered.sort((a, b) => {
      if (a.alert && !b.alert) return -1;
      if (!a.alert && b.alert) return 1;
      if (a.is_open && !b.is_open) return -1;
      if (!a.is_open && b.is_open) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(filtered);
  } catch (err) {
    console.error('[agent/restaurants GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
