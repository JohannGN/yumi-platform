// ============================================================
// YUMI PLATFORM — EGRESOS-1
// app/api/admin/expenses/route.ts
// GET: listar egresos con filtros + paginación | POST: crear egreso
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
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const city_id = searchParams.get('city_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const category_id = searchParams.get('category_id');
    const recurring = searchParams.get('recurring');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // ── Build query ──────────────────────────────────────────
    let query = supabase
      .from('expenses')
      .select(`
        id, city_id, category_id, amount_cents, description, date,
        receipt_url, recurring, recurring_period,
        linked_rider_id, linked_restaurant_id, created_by, notes,
        created_at, updated_at,
        expense_categories:category_id ( name, icon ),
        users:created_by ( name ),
        riders:linked_rider_id ( id, users:user_id ( name ) ),
        restaurants:linked_restaurant_id ( name )
      `, { count: 'exact' })
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    // city_admin filtra automáticamente por su ciudad
    if (profile.role === 'city_admin') {
      query = query.eq('city_id', profile.city_id);
    } else if (city_id) {
      query = query.eq('city_id', city_id);
    }

    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);
    if (category_id) query = query.eq('category_id', category_id);
    if (recurring !== null && recurring !== '') {
      query = query.eq('recurring', recurring === 'true');
    }

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ── Aplanar joins ────────────────────────────────────────
    const expenses = (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const cat = r.expense_categories as { name: string; icon: string | null } | null;
      const creator = r.users as { name: string } | null;
      const riderJoin = r.riders as { id: string; users: { name: string } | null } | null;
      const rest = r.restaurants as { name: string } | null;

      return {
        id: r.id,
        city_id: r.city_id,
        category_id: r.category_id,
        category_name: cat?.name ?? '',
        category_icon: cat?.icon ?? null,
        amount_cents: r.amount_cents,
        description: r.description,
        date: r.date,
        receipt_url: r.receipt_url,
        recurring: r.recurring,
        recurring_period: r.recurring_period,
        linked_rider_id: r.linked_rider_id,
        linked_rider_name: riderJoin?.users?.name ?? null,
        linked_restaurant_id: r.linked_restaurant_id,
        linked_restaurant_name: rest?.name ?? null,
        created_by: r.created_by,
        creator_name: creator?.name ?? '',
        notes: r.notes,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    return NextResponse.json({
      expenses,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[admin/expenses GET]', err);
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
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      city_id, category_id, amount_cents, description, date,
      receipt_url, recurring, recurring_period,
      linked_rider_id, linked_restaurant_id, notes,
    } = body;

    // ── Validaciones ─────────────────────────────────────────
    if (!city_id || !category_id || !amount_cents || !description || !date) {
      return NextResponse.json({
        error: 'Campos obligatorios: city_id, category_id, amount_cents, description, date',
      }, { status: 400 });
    }

    if (typeof amount_cents !== 'number' || amount_cents <= 0) {
      return NextResponse.json({ error: 'amount_cents debe ser mayor a 0' }, { status: 400 });
    }

    if (recurring && !recurring_period) {
      return NextResponse.json({ error: 'recurring_period requerido si recurring=true' }, { status: 400 });
    }

    if (recurring_period && !['daily', 'weekly', 'monthly', 'yearly'].includes(recurring_period)) {
      return NextResponse.json({ error: 'recurring_period inválido' }, { status: 400 });
    }

    // city_admin solo puede crear en su ciudad
    const targetCityId = profile.role === 'city_admin' ? profile.city_id : city_id;

    // Verificar que la categoría existe y está activa
    const { data: category } = await supabase
      .from('expense_categories')
      .select('id, is_active')
      .eq('id', category_id)
      .single();

    if (!category) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }
    if (!category.is_active) {
      return NextResponse.json({ error: 'Categoría inactiva' }, { status: 400 });
    }

    // ── Insertar ─────────────────────────────────────────────
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        city_id: targetCityId,
        category_id,
        amount_cents: Math.round(amount_cents),
        description: description.trim(),
        date,
        receipt_url: receipt_url || null,
        recurring: recurring ?? false,
        recurring_period: recurring ? recurring_period : null,
        linked_rider_id: linked_rider_id || null,
        linked_restaurant_id: linked_restaurant_id || null,
        created_by: user.id,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit log (fire-and-forget)
    logAuditAction(supabase, {
      userId: user.id,
      action: 'create',
      entityType: 'expense',
      entityId: expense.id,
      details: {
        amount_cents,
        category_id,
        city_id: targetCityId,
        description: description.trim(),
        date,
        recurring: recurring ?? false,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    console.error('[admin/expenses POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
