import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatCentsForExport, formatDateForExport } from '@/lib/utils/export-csv';
import { liquidationPaymentMethodLabels } from '@/config/design-tokens';

const MAX_EXPORT_ROWS = 5000;
const BOM = '\uFEFF';

function escapeCsv(field: string): string {
  const s = field ?? '';
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!dbUser || !['owner', 'city_admin', 'agent'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  // Query params
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const restaurantId = searchParams.get('restaurant_id');

  // Build query
  let query = supabase
    .from('restaurant_liquidations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  if (restaurantId) query = query.eq('restaurant_id', restaurantId);

  const { data: liquidations, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve restaurant names
  const restIds = [...new Set((liquidations ?? []).map((l) => l.restaurant_id))];
  const restMap: Record<string, string> = {};

  if (restIds.length > 0) {
    const { data: rests } = await supabase
      .from('restaurants')
      .select('id, name')
      .in('id', restIds);
    (rests ?? []).forEach((r) => { restMap[r.id] = r.name; });
  }

  // Resolve liquidator names
  const userIds = [...new Set((liquidations ?? []).map((l) => l.liquidated_by))];
  const userMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);
    (users ?? []).forEach((u) => { userMap[u.id] = u.name; });
  }

  // Build CSV
  const headers = [
    'Fecha', 'Restaurante', 'Monto (S/)', 'Créditos antes',
    'Método pago', 'Liquidado por', 'Notas',
  ];

  const rows = (liquidations ?? []).map((l) => [
    l.date ?? '',
    restMap[l.restaurant_id] ?? '',
    formatCentsForExport(l.amount_cents ?? 0),
    formatCentsForExport(l.credits_before ?? 0),
    liquidationPaymentMethodLabels[l.payment_method] ?? l.payment_method ?? '',
    userMap[l.liquidated_by] ?? '',
    l.notes ?? '',
  ]);

  const headerLine = headers.map(escapeCsv).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsv).join(','));
  const csv = BOM + [headerLine, ...dataLines].join('\r\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="liquidaciones_yumi_${from ?? 'all'}_${to ?? 'all'}.csv"`,
    },
  });
}
