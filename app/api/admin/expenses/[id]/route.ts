// ============================================================
// YUMI PLATFORM — EGRESOS-1
// app/api/admin/expenses/[id]/route.ts
// GET: detalle | PATCH: editar | DELETE: eliminar egreso
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAuditAction } from '@/lib/utils/audit';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data, error } = await supabase
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
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Egreso no encontrado' }, { status: 404 });
    }

    // city_admin solo puede ver egresos de su ciudad
    if (profile.role === 'city_admin' && data.city_id !== profile.city_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Aplanar joins
    const r = data as Record<string, unknown>;
    const cat = r.expense_categories as unknown as { name: string; icon: string | null } | null;
    const creator = r.users as unknown as { name: string } | null;
    const riderJoin = r.riders as unknown as { id: string; users: { name: string } | null } | null;
    const rest = r.restaurants as unknown as { name: string } | null;

    const expense = {
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

    return NextResponse.json({ expense });
  } catch (err) {
    console.error('[admin/expenses/[id] GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // city_admin solo puede editar egresos de su ciudad
    if (profile.role === 'city_admin') {
      const { data: existing } = await supabase
        .from('expenses')
        .select('city_id')
        .eq('id', id)
        .single();
      if (!existing || existing.city_id !== profile.city_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      category_id, amount_cents, description, date,
      receipt_url, recurring, recurring_period,
      linked_rider_id, linked_restaurant_id, notes,
    } = body;

    const updates: Record<string, unknown> = {};

    if (category_id !== undefined) {
      // Verificar que la categoría existe
      const { data: cat } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('id', category_id)
        .single();
      if (!cat) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
      updates.category_id = category_id;
    }

    if (amount_cents !== undefined) {
      if (typeof amount_cents !== 'number' || amount_cents <= 0) {
        return NextResponse.json({ error: 'amount_cents debe ser mayor a 0' }, { status: 400 });
      }
      updates.amount_cents = Math.round(amount_cents);
    }

    if (description !== undefined) updates.description = description.trim();
    if (date !== undefined) updates.date = date;
    if (receipt_url !== undefined) updates.receipt_url = receipt_url || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (linked_rider_id !== undefined) updates.linked_rider_id = linked_rider_id || null;
    if (linked_restaurant_id !== undefined) updates.linked_restaurant_id = linked_restaurant_id || null;

    if (recurring !== undefined) {
      updates.recurring = recurring;
      if (recurring && recurring_period) {
        if (!['daily', 'weekly', 'monthly', 'yearly'].includes(recurring_period)) {
          return NextResponse.json({ error: 'recurring_period inválido' }, { status: 400 });
        }
        updates.recurring_period = recurring_period;
      } else if (!recurring) {
        updates.recurring_period = null;
      }
    } else if (recurring_period !== undefined) {
      if (recurring_period && !['daily', 'weekly', 'monthly', 'yearly'].includes(recurring_period)) {
        return NextResponse.json({ error: 'recurring_period inválido' }, { status: 400 });
      }
      updates.recurring_period = recurring_period || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!expense) return NextResponse.json({ error: 'Egreso no encontrado' }, { status: 404 });

    logAuditAction(supabase, {
      userId: user.id,
      action: 'update',
      entityType: 'expense',
      entityId: id,
      details: updates,
    });

    return NextResponse.json({ expense });
  } catch (err) {
    console.error('[admin/expenses/[id] PATCH]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role, city_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'city_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // city_admin solo puede eliminar egresos de su ciudad
    if (profile.role === 'city_admin') {
      const { data: existing } = await supabase
        .from('expenses')
        .select('city_id')
        .eq('id', id)
        .single();
      if (!existing || existing.city_id !== profile.city_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Guardar info antes de borrar para audit
    const { data: expenseData } = await supabase
      .from('expenses')
      .select('amount_cents, description, date, category_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logAuditAction(supabase, {
      userId: user.id,
      action: 'delete',
      entityType: 'expense',
      entityId: id,
      details: expenseData ?? {},
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/expenses/[id] DELETE]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
