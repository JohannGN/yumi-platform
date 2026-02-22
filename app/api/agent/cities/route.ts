import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const AGENT_ROLES = ['owner', 'city_admin', 'agent'];

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, city_id, is_active')
      .eq('id', user.id)
      .single();

    if (!userData || !userData.is_active || !AGENT_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (userData.role === 'owner') {
      const { data: cities } = await supabase
        .from('cities')
        .select('id, name, slug, is_active, settings, created_at')
        .order('name');

      return NextResponse.json(cities ?? []);
    }

    if (userData.role === 'city_admin') {
      if (!userData.city_id) {
        return NextResponse.json([]);
      }
      const { data: cities } = await supabase
        .from('cities')
        .select('id, name, slug, is_active, settings, created_at')
        .eq('id', userData.city_id);

      return NextResponse.json(cities ?? []);
    }

    // Agent: from agent_cities
    const { data: agentCities } = await supabase
      .from('agent_cities')
      .select('city_id')
      .eq('user_id', user.id);

    if (!agentCities || agentCities.length === 0) {
      return NextResponse.json([]);
    }

    const cityIds = agentCities.map((ac) => ac.city_id);
    const { data: cities } = await supabase
      .from('cities')
      .select('id, name, slug, is_active, settings, created_at')
      .in('id', cityIds)
      .order('name');

    return NextResponse.json(cities ?? []);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
