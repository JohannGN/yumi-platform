import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAuditAction } from '@/lib/utils/audit';

// GET /api/admin/penalties?phone=+51987654321
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
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const phone = new URL(request.url).searchParams.get('phone');
    if (!phone) {
      return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
    }

    const { data: penalty } = await supabase
      .from('customer_penalties')
      .select('phone, penalty_level, total_penalties, reasons, banned_until')
      .eq('phone', phone)
      .single();

    if (!penalty) {
      return NextResponse.json({
        phone,
        penalty_level: 'none',
        total_penalties: 0,
        reasons: [],
        banned_until: null,
      });
    }

    return NextResponse.json(penalty);
  } catch (err) {
    console.error('[admin/penalties GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST /api/admin/penalties
// Body: { phone, level, reason, banned_days?, instant_ban? }
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

    if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { phone, level, reason, banned_days = 7, instant_ban = false } = body;

    if (!phone || !level || !reason) {
      return NextResponse.json(
        { error: 'phone, level y reason son obligatorios' },
        { status: 400 }
      );
    }

    // Validar formato teléfono
    if (!/^\+51\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Formato de teléfono inválido. Usar +51XXXXXXXXX' },
        { status: 400 }
      );
    }

    // Validar level
    if (!['warning', 'restricted', 'banned'].includes(level)) {
      return NextResponse.json(
        { error: 'Nivel inválido. Usar: warning, restricted, banned' },
        { status: 400 }
      );
    }

    // Buscar penalty existente
    const { data: existing } = await supabase
      .from('customer_penalties')
      .select('*')
      .eq('phone', phone)
      .single();

    const bannedUntil = level === 'banned'
      ? new Date(Date.now() + banned_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const newReason = {
      date: new Date().toISOString(),
      reason,
      manual: true,
      applied_by: user.id,
      instant_ban: instant_ban || false,
    };

    if (existing) {
      // Update existente
      const updatedReasons = [...(existing.reasons as unknown[]), newReason];
      const newTotal = (existing.total_penalties as number) + 1;

      const { error } = await supabase
        .from('customer_penalties')
        .update({
          penalty_level: level,
          total_penalties: newTotal,
          reasons: updatedReasons,
          banned_until: bannedUntil,
          notes: instant_ban ? 'Ban instantáneo por abuso' : null,
        })
        .eq('phone', phone);

      if (error) throw error;
    } else {
      // Insert nuevo
      const { error } = await supabase
        .from('customer_penalties')
        .insert({
          phone,
          penalty_level: level,
          total_penalties: 1,
          reasons: [newReason],
          banned_until: bannedUntil,
          notes: instant_ban ? 'Ban instantáneo por abuso' : null,
        });

      if (error) throw error;
    }

    // Audit log (fire-and-forget)
    logAuditAction(supabase, {
      userId: user.id,
      action: 'create',
      entityType: 'penalty',
      entityId: phone,
      details: { phone, level, reason, instant_ban, banned_days: level === 'banned' ? banned_days : null },
    });

    return NextResponse.json({
      success: true,
      phone,
      level,
      banned_until: bannedUntil,
    });
  } catch (err) {
    console.error('[admin/penalties POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
