// ============================================================
// PATCH /api/restaurant/profile
// Update restaurant profile: name, description, phone, hours, theme, prep time, min order
// Chat 5 — Fragment 4/7
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

const VALID_THEMES = ['orange', 'red', 'green', 'blue', 'purple'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export async function PATCH(request: NextRequest) {
  try {
    // 1. Auth
    const supabase = await createAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Get restaurant
    const serviceClient = createServiceClient();
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Sin restaurante' }, { status: 404 });
    }

    // 3. Parse body
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Validate and pick allowed fields
    if (body.description !== undefined) {
      updateData.description = (body.description || '').slice(0, 500);
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone || null;
    }
    if (body.whatsapp !== undefined) {
      updateData.whatsapp = body.whatsapp || null;
    }
    if (body.theme_color !== undefined) {
      if (VALID_THEMES.includes(body.theme_color)) {
        updateData.theme_color = body.theme_color;
      }
    }
    if (body.estimated_prep_minutes !== undefined) {
      const prep = parseInt(body.estimated_prep_minutes);
      if (!isNaN(prep) && prep >= 5 && prep <= 120) {
        updateData.estimated_prep_minutes = prep;
      }
    }
    if (body.min_order_cents !== undefined) {
      const min = parseInt(body.min_order_cents);
      if (!isNaN(min) && min >= 0 && min <= 100000) {
        updateData.min_order_cents = min;
      }
    }
    if (body.opening_hours !== undefined) {
      // Validate structure
      const hours = body.opening_hours;
      const isValid = DAYS.every((day) => {
        const d = hours[day];
        return d && typeof d.open === 'string' && typeof d.close === 'string' && typeof d.closed === 'boolean';
      });
      if (isValid) {
        updateData.opening_hours = hours;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    // 4. Update
    const { data: updated, error: updateError } = await serviceClient
      .from('restaurants')
      .update(updateData)
      .eq('id', restaurant.id)
      .select()
      .single();

    if (updateError) {
      console.error('[/api/restaurant/profile] Update error:', updateError);
      return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
    }

    return NextResponse.json({ restaurant: updated });
  } catch (err) {
    console.error('[/api/restaurant/profile] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
