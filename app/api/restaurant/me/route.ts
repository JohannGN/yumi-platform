// ============================================================
// GET /api/restaurant/me
// Returns the restaurant belonging to the authenticated user
// Chat 5 — Fragment 1/7
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper: create authenticated Supabase client from cookies
async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

// Service role client for queries that need to bypass RLS
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    // 1. Get authenticated user
    const supabase = await createAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // 2. Verify user role = 'restaurant'
    const serviceClient = createServiceClient();
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('id, role, city_id, name')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (userData.role !== 'restaurant') {
      return NextResponse.json(
        { error: 'Acceso denegado — se requiere rol "restaurant"' },
        { status: 403 }
      );
    }

    // 3. Get restaurant owned by this user
    const { data: restaurant, error: restError } = await serviceClient
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .single();

    if (restError || !restaurant) {
      return NextResponse.json(
        { error: 'No tienes un restaurante asignado. Contacta al administrador.' },
        { status: 404 }
      );
    }

    // 4. Get city info
    const { data: city } = await serviceClient
      .from('cities')
      .select('id, name, slug')
      .eq('id', restaurant.city_id)
      .single();

    return NextResponse.json({
      restaurant,
      city: city || null,
      user: {
        id: userData.id,
        name: userData.name,
        role: userData.role,
      },
    });
  } catch (err) {
    console.error('[/api/restaurant/me] Error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
