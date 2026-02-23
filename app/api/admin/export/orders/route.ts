import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatCentsForExport, formatDateForExport } from '@/lib/utils/export-csv';
import { orderStatusLabels, paymentMethodLabels, paymentStatusLabels } from '@/config/design-tokens';

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
    .select('role, city_id')
    .eq('id', user.id)
    .single();

  if (!dbUser || !['owner', 'city_admin', 'agent'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  // Query params
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const status = searchParams.get('status');
  const cityId = searchParams.get('city_id');

  // Build query
  let query = supabase
    .from('orders')
    .select(`
      code, created_at, customer_name, customer_phone,
      status, payment_method, payment_status,
      subtotal_cents, delivery_fee_cents, total_cents,
      restaurant_id, rider_id
    `)
    .neq('status', 'cart')
    .order('created_at', { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  if (from) query = query.gte('created_at', `${from}T00:00:00`);
  if (to) query = query.lte('created_at', `${to}T23:59:59`);
  if (status && status !== 'all') query = query.eq('status', status);
  if (cityId) query = query.eq('city_id', cityId);
  if (dbUser.role === 'city_admin' && dbUser.city_id) {
    query = query.eq('city_id', dbUser.city_id);
  }

  const { data: orders, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch restaurant and rider names for mapping
  const restIds = [...new Set((orders ?? []).map((o) => o.restaurant_id).filter(Boolean))];
  const riderIds = [...new Set((orders ?? []).map((o) => o.rider_id).filter(Boolean))];

  const restMap: Record<string, string> = {};
  const riderMap: Record<string, string> = {};

  if (restIds.length > 0) {
    const { data: rests } = await supabase
      .from('restaurants')
      .select('id, name')
      .in('id', restIds);
    (rests ?? []).forEach((r) => { restMap[r.id] = r.name; });
  }

  if (riderIds.length > 0) {
    const { data: riders } = await supabase
      .from('riders')
      .select('id, user_id')
      .in('id', riderIds);
    const userIds = (riders ?? []).map((r) => r.user_id);
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);
      const userMap: Record<string, string> = {};
      (users ?? []).forEach((u) => { userMap[u.id] = u.name; });
      (riders ?? []).forEach((r) => { riderMap[r.id] = userMap[r.user_id] ?? ''; });
    }
  }

  // Build CSV
  const headers = [
    'Código', 'Fecha', 'Restaurante', 'Cliente', 'Teléfono',
    'Estado', 'Método pago', 'Estado pago',
    'Subtotal', 'Delivery', 'Total', 'Rider',
  ];

  const rows = (orders ?? []).map((o) => [
    o.code ?? '',
    formatDateForExport(o.created_at),
    restMap[o.restaurant_id] ?? '',
    o.customer_name ?? '',
    o.customer_phone ?? '',
    orderStatusLabels[o.status] ?? o.status ?? '',
    paymentMethodLabels[o.payment_method] ?? o.payment_method ?? '',
    paymentStatusLabels[o.payment_status] ?? o.payment_status ?? '',
    formatCentsForExport(o.subtotal_cents ?? 0),
    formatCentsForExport(o.delivery_fee_cents ?? 0),
    formatCentsForExport(o.total_cents ?? 0),
    riderMap[o.rider_id] ?? '',
  ]);

  const headerLine = headers.map(escapeCsv).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsv).join(','));
  const csv = BOM + [headerLine, ...dataLines].join('\r\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pedidos_yumi_${from ?? 'all'}_${to ?? 'all'}.csv"`,
    },
  });
}
