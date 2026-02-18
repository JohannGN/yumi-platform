import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  // Solo owner puede editar configuración de ciudades
  if (!profile || profile.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el owner puede editar ciudades' }, { status: 403 });
  }

  const body = await request.json();
  const { name, slug, is_active, timezone, settings } = body;

  if (slug) {
    const { data: existing } = await supabase
      .from('cities')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'El slug ya existe' }, { status: 409 });
    }
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (is_active !== undefined) updates.is_active = is_active;
  if (timezone !== undefined) updates.timezone = timezone;
  if (settings !== undefined) updates.settings = settings;

  const { data: city, error } = await supabase
    .from('cities')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ city });
}
