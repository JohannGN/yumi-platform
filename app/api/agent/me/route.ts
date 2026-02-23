// ============================================================
// GET /api/agent/me — Perfil del agente + permisos
// Chat: AGENTE-1 + AGENTE-3 (added permissions)
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getAgentPermissions } from '@/lib/agent-permissions';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, phone, avatar_url, role, city_id, is_active')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.is_active || !AGENT_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Get assigned cities based on role
    let assignedCities: Array<{
      city_id: string;
      city_name: string;
      city_slug: string;
      is_active: boolean;
    }> = [];

    if (userData.role === 'owner') {
      // Owner sees all cities
      const { data: cities } = await supabase
        .from('cities')
        .select('id, name, slug, is_active')
        .order('name');

      assignedCities = (cities ?? []).map((c) => ({
        city_id: c.id,
        city_name: c.name,
        city_slug: c.slug,
        is_active: c.is_active,
      }));
    } else if (userData.role === 'city_admin') {
      // City admin sees only their city
      if (userData.city_id) {
        const { data: city } = await supabase
          .from('cities')
          .select('id, name, slug, is_active')
          .eq('id', userData.city_id)
          .single();

        if (city) {
          assignedCities = [{
            city_id: city.id,
            city_name: city.name,
            city_slug: city.slug,
            is_active: city.is_active,
          }];
        }
      }
    } else {
      // Agent sees cities from agent_cities
      const { data: agentCities } = await supabase
        .from('agent_cities')
        .select('city_id')
        .eq('user_id', user.id);

      if (agentCities && agentCities.length > 0) {
        const cityIds = agentCities.map((ac) => ac.city_id);
        const { data: cities } = await supabase
          .from('cities')
          .select('id, name, slug, is_active')
          .in('id', cityIds)
          .order('name');

        assignedCities = (cities ?? []).map((c) => ({
          city_id: c.id,
          city_name: c.name,
          city_slug: c.slug,
          is_active: c.is_active,
        }));
      }
    }

    // AGENTE-3: Fetch permissions
    const permissions = await getAgentPermissions(user.id, userData.role);

    return NextResponse.json({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      avatar_url: userData.avatar_url,
      role: userData.role,
      assigned_cities: assignedCities,
      permissions,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
