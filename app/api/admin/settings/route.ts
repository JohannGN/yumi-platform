import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { PlatformSettings } from '@/types/admin-panel';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['owner', 'city_admin', 'agent'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: settings, error } = await supabase
      .from('platform_settings')
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: 'Settings not found' }, { status: 404 });

    return NextResponse.json(settings as PlatformSettings);
  } catch (error) {
    console.error('[admin/settings GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Solo owner puede modificar settings
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can modify platform settings' }, { status: 403 });
    }

    const body = await request.json() as Partial<PlatformSettings>;

    // Validar campos
    const updates: Partial<PlatformSettings> = {};
    if (typeof body.pos_surcharge_enabled === 'boolean') {
      updates.pos_surcharge_enabled = body.pos_surcharge_enabled;
    }
    if (typeof body.pos_commission_rate === 'number') {
      if (body.pos_commission_rate < 0 || body.pos_commission_rate > 0.20) {
        return NextResponse.json({ error: 'pos_commission_rate must be between 0 and 0.20' }, { status: 400 });
      }
      updates.pos_commission_rate = body.pos_commission_rate;
    }
    if (typeof body.pos_igv_rate === 'number') {
      if (body.pos_igv_rate < 0 || body.pos_igv_rate > 0.25) {
        return NextResponse.json({ error: 'pos_igv_rate must be between 0 and 0.25' }, { status: 400 });
      }
      updates.pos_igv_rate = body.pos_igv_rate;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // platform_settings tiene exactamente 1 fila.
    // Supabase v2 bloquea update() sin filtro WHERE → primero obtenemos el id.
    const { data: existing, error: fetchError } = await supabase
      .from('platform_settings')
      .select('id')
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Settings row not found' }, { status: 404 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('platform_settings')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[admin/settings PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
