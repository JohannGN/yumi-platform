// ============================================================
// PATCH /api/restaurant/toggle-open
// Toggle is_open for the authenticated restaurant
// Chat 5 — Fragment 1/7
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(request: NextRequest) {
  try {
    // 1. Auth
    const supabase = await createAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Verify role
    const serviceClient = createServiceClient();
    const { data: userData } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'restaurant') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // 3. Parse body
    const body = await request.json();
    const { is_open } = body;

    if (typeof is_open !== 'boolean') {
      return NextResponse.json(
        { error: 'Se requiere is_open (boolean)' },
        { status: 400 }
      );
    }

    // 4. Update restaurant
    const { data: restaurant, error: updateError } = await serviceClient
      .from('restaurants')
      .update({
        is_open,
        // Also update accepts_orders to match
        accepts_orders: is_open,
      })
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .select('id, name, is_open, accepts_orders')
      .single();

    if (updateError || !restaurant) {
      return NextResponse.json(
        { error: 'Error al actualizar estado' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      is_open: restaurant.is_open,
      message: restaurant.is_open
        ? '¡Restaurante abierto! Ya puedes recibir pedidos.'
        : 'Restaurante cerrado. No recibirás pedidos nuevos.',
    });
  } catch (err) {
    console.error('[/api/restaurant/toggle-open] Error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
