import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['owner', 'city_admin'];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !ADMIN_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    const { data: agent, error } = await serviceClient
      .from('users')
      .select('id, name, email, phone, is_active, role, created_at')
      .eq('id', id)
      .eq('role', 'agent')
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Get assigned cities
    const { data: agentCities } = await serviceClient
      .from('agent_cities')
      .select('city_id')
      .eq('user_id', id);

    const cityIds = (agentCities ?? []).map((ac: { city_id: string }) => ac.city_id);
    const { data: cities } = cityIds.length > 0
      ? await serviceClient.from('cities').select('id, name').in('id', cityIds)
      : { data: [] };

    return NextResponse.json({
      ...agent,
      assigned_cities: (cities ?? []).map((c: { id: string; name: string }) => ({
        city_id: c.id,
        city_name: c.name,
      })),
    });
  } catch (err) {
    console.error('[admin/agents/[id]] GET', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !ADMIN_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, is_active } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('users')
      .update(updates)
      .eq('id', id)
      .eq('role', 'agent')
      .select('id, name, phone, is_active')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Error al actualizar agente' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[admin/agents/[id]] PUT', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
