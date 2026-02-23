// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// app/api/agent/recharge-codes/[id]/void/route.ts
// POST: Anular un código de recarga pendiente
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Auth: verificar agente
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!userData || !['owner', 'city_admin', 'agent'].includes(userData.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Buscar código
    const { data: code, error: codeErr } = await supabase
      .from('recharge_codes')
      .select('id, status, code, generated_by')
      .eq('id', id)
      .single();

    if (codeErr || !code) {
      return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 });
    }

    // Solo se pueden anular códigos pendientes
    if (code.status === 'redeemed') {
      return NextResponse.json(
        { error: 'No se puede anular un código ya canjeado' },
        { status: 400 }
      );
    }

    if (code.status === 'voided') {
      return NextResponse.json(
        { error: 'Este código ya está anulado' },
        { status: 400 }
      );
    }

    // Agente solo puede anular los que él generó
    if (userData.role === 'agent' && code.generated_by !== user.id) {
      return NextResponse.json(
        { error: 'Solo puedes anular códigos que tú generaste' },
        { status: 403 }
      );
    }

    // Anular
    const { error: updateErr } = await supabase
      .from('recharge_codes')
      .update({ status: 'voided' })
      .eq('id', id)
      .eq('status', 'pending');

    if (updateErr) {
      return NextResponse.json({ error: 'Error al anular código' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      code: code.code,
      message: 'Código anulado exitosamente',
    });
  } catch (err) {
    console.error('[API] POST /api/agent/recharge-codes/[id]/void error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
