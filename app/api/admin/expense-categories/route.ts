// ============================================================
// YUMI PLATFORM — EGRESOS-1
// app/api/admin/expense-categories/route.ts
// GET: listar categorías de egreso | POST: crear categoría
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAuditAction } from '@/lib/utils/audit';

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    let query = supabase
      .from('expense_categories')
      .select('id, name, slug, icon, is_active, display_order, created_at, updated_at')
      .order('display_order', { ascending: true });

    if (!all) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ categories: data ?? [] });
  } catch (err) {
    console.error('[admin/expense-categories GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, icon, display_order } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'name y slug son obligatorios' }, { status: 400 });
    }

    // Validar slug formato URL-safe
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json({ error: 'Slug debe ser URL-safe (minúsculas, guiones)' }, { status: 400 });
    }

    // Verificar slug único
    const { data: existing } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'El slug ya existe' }, { status: 409 });
    }

    const { data: category, error } = await supabase
      .from('expense_categories')
      .insert({
        name,
        slug,
        icon: icon || null,
        display_order: display_order ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit log
    logAuditAction(supabase, {
      userId: user.id,
      action: 'create',
      entityType: 'expense_category',
      entityId: category.id,
      details: { name, slug },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error('[admin/expense-categories POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
