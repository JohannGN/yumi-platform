import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['owner', 'city_admin'];

async function checkAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || !ADMIN_ROLES.includes(userData.role)) return null;
  return user;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await checkAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const { city_id } = await request.json();
    if (!city_id) {
      return NextResponse.json({ error: 'city_id requerido' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Check if already assigned
    const { data: existing } = await serviceClient
      .from('agent_cities')
      .select('id')
      .eq('user_id', id)
      .eq('city_id', city_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: 'Ciudad ya asignada' });
    }

    const { error } = await serviceClient
      .from('agent_cities')
      .insert({ user_id: id, city_id });

    if (error) {
      return NextResponse.json({ error: 'Error al asignar ciudad' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Ciudad asignada' });
  } catch (err) {
    console.error('[admin/agents/[id]/cities] POST', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await checkAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const { city_id } = await request.json();
    if (!city_id) {
      return NextResponse.json({ error: 'city_id requerido' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    const { error } = await serviceClient
      .from('agent_cities')
      .delete()
      .eq('user_id', id)
      .eq('city_id', city_id);

    if (error) {
      return NextResponse.json({ error: 'Error al desasignar ciudad' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Ciudad desasignada' });
  } catch (err) {
    console.error('[admin/agents/[id]/cities] DELETE', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
