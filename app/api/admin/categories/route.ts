import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Obtener categorías con conteo de restaurantes activos
  const { data, error } = await supabase
    .from('categories')
    .select(`
      id, name, slug, emoji, icon_url, description, display_order, is_visible, created_at,
      restaurants!inner(id)
    `)
    .order('display_order', { ascending: true });

  if (error) {
    // Fallback sin el join si falla
    const { data: cats, error: catsError } = await supabase
      .from('categories')
      .select('id, name, slug, emoji, icon_url, description, display_order, is_visible, created_at')
      .order('display_order', { ascending: true });
    if (catsError) return NextResponse.json({ error: catsError.message }, { status: 500 });
    return NextResponse.json({ categories: (cats ?? []).map(c => ({ ...c, restaurant_count: 0 })) });
  }

  // Contar restaurantes por categoría de forma separada
  const { data: restCounts } = await supabase
    .from('restaurants')
    .select('category_id')
    .eq('is_active', true);

  const countMap: Record<string, number> = {};
  (restCounts ?? []).forEach(r => {
    if (r.category_id) {
      countMap[r.category_id] = (countMap[r.category_id] ?? 0) + 1;
    }
  });

  // Re-fetch sin el join problemático
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, emoji, icon_url, description, display_order, is_visible, created_at')
    .order('display_order', { ascending: true });

  return NextResponse.json({
    categories: (categories ?? []).map(c => ({
      ...c,
      restaurant_count: countMap[c.id] ?? 0,
    })),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, slug, emoji, description, is_visible, display_order } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: 'name y slug son obligatorios' }, { status: 400 });
  }

  // Validar slug único
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'El slug ya existe' }, { status: 409 });
  }

  // Calcular display_order si no se pasa
  let order = display_order;
  if (order === undefined) {
    const { count } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true });
    order = (count ?? 0) + 1;
  }

  const { data: category, error } = await supabase
    .from('categories')
    .insert({ name, slug, emoji: emoji || null, description: description || null, is_visible: is_visible ?? true, display_order: order })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const body = await request.json();
  const { name, slug, emoji, description, is_visible } = body;

  if (slug) {
    const { data: existing } = await supabase
      .from('categories')
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
  if (emoji !== undefined) updates.emoji = emoji || null;
  if (description !== undefined) updates.description = description || null;
  if (is_visible !== undefined) updates.is_visible = is_visible;

  const { data: category, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'city_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  // No eliminar si tiene restaurantes
  const { count } = await supabase
    .from('restaurants')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
    .eq('is_active', true);

  if (count && count > 0) {
    return NextResponse.json({
      error: `No se puede eliminar: tiene ${count} restaurante(s) vinculado(s)`,
    }, { status: 409 });
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
