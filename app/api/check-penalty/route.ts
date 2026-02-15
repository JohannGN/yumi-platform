// ============================================================
// GET /api/check-penalty?phone=+51XXXXXXXXX
// Verifica penalidades del cliente por teléfono
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone || !/^\+51\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Teléfono requerido en formato +51XXXXXXXXX' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      'check_customer_penalty',
      { p_phone: phone },
    );

    if (error) {
      console.error('Error checking penalty:', error);
      return NextResponse.json(
        { error: 'Error verificando estado del cliente' },
        { status: 500 },
      );
    }

    const penalty = data?.[0];

    if (!penalty) {
      return NextResponse.json({
        is_banned: false,
        penalty_level: 'none',
        banned_until: null,
        total_penalties: 0,
      });
    }

    return NextResponse.json({
      is_banned: penalty.is_banned,
      penalty_level: penalty.p_level,
      banned_until: penalty.banned_until,
      total_penalties: penalty.total_penalties,
    });
  } catch (error) {
    console.error('Check penalty error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
