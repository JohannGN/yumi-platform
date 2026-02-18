import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'city_admin', 'agent'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { order } = body as { order: Array<{ id: string; display_order: number }> };

  if (!order || !Array.isArray(order)) {
    return NextResponse.json({ error: 'order array requerido' }, { status: 400 });
  }

  // Actualizar en lote usando múltiples updates
  const updates = order.map(({ id, display_order }) =>
    supabase
      .from('categories')
      .update({ display_order })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(r => r.error);
  if (hasError) {
    return NextResponse.json({ error: 'Error al reordenar categorías' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
