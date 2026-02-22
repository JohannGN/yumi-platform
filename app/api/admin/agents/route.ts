import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['owner', 'city_admin'];

export async function GET() {
  try {
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

    // Get all agents
    const { data: agents, error: agentsError } = await serviceClient
      .from('users')
      .select('id, name, email, phone, is_active, created_at')
      .eq('role', 'agent')
      .order('name');

    if (agentsError) {
      return NextResponse.json({ error: 'Error al cargar agentes' }, { status: 500 });
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json([]);
    }

    // Get all agent_cities
    const agentIds = agents.map((a) => a.id);
    const { data: agentCities } = await serviceClient
      .from('agent_cities')
      .select('user_id, city_id')
      .in('user_id', agentIds);

    // Get city names
    const cityIds = [...new Set((agentCities ?? []).map((ac) => ac.city_id))];
    const { data: cities } = cityIds.length > 0
      ? await serviceClient.from('cities').select('id, name').in('id', cityIds)
      : { data: [] };

    const cityMap: Record<string, string> = {};
    for (const c of cities ?? []) {
      cityMap[c.id] = c.name;
    }

    // Flatten
    const result = agents.map((agent) => {
      const assignedCities = (agentCities ?? [])
        .filter((ac) => ac.user_id === agent.id)
        .map((ac) => ({
          city_id: ac.city_id,
          city_name: cityMap[ac.city_id] ?? 'Desconocida',
        }));

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        is_active: agent.is_active,
        created_at: agent.created_at,
        assigned_cities: assignedCities,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[admin/agents]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
