import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatCentsForExport, formatDateForExport } from '@/lib/utils/export-csv';
import { creditTransactionTypeLabels } from '@/config/design-tokens';

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

  if (!dbUser || !['owner', 'city_admin'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  // Query params
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const entityType = searchParams.get('entity_type');
  const transactionType = searchParams.get('transaction_type');

  // Build query
  let query = supabase
    .from('credit_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  if (from) query = query.gte('created_at', `${from}T00:00:00`);
  if (to) query = query.lte('created_at', `${to}T23:59:59`);
  if (entityType && entityType !== 'all') query = query.eq('entity_type', entityType);
  if (transactionType && transactionType !== 'all') query = query.eq('transaction_type', transactionType);

  const { data: transactions, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve entity names
  const riderIds = [...new Set(
    (transactions ?? []).filter((t) => t.entity_type === 'rider').map((t) => t.entity_id)
  )];
  const restIds = [...new Set(
    (transactions ?? []).filter((t) => t.entity_type === 'restaurant').map((t) => t.entity_id)
  )];

  const nameMap: Record<string, string> = {};

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
      const um: Record<string, string> = {};
      (users ?? []).forEach((u) => { um[u.id] = u.name; });
      (riders ?? []).forEach((r) => { nameMap[r.id] = um[r.user_id] ?? `Rider ${r.id.slice(0, 6)}`; });
    }
  }

  if (restIds.length > 0) {
    const { data: rests } = await supabase
      .from('restaurants')
      .select('id, name')
      .in('id', restIds);
    (rests ?? []).forEach((r) => { nameMap[r.id] = r.name; });
  }

  // Resolve order codes
  const orderIds = [...new Set(
    (transactions ?? []).map((t) => t.order_id).filter(Boolean)
  )];
  const orderMap: Record<string, string> = {};
  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, code')
      .in('id', orderIds);
    (orders ?? []).forEach((o) => { orderMap[o.id] = o.code; });
  }

  // Build CSV
  const headers = [
    'Fecha', 'Tipo', 'Entidad tipo', 'Entidad nombre', 'Monto (S/)',
    'Saldo antes', 'Saldo después', 'Pedido', 'Notas',
  ];

  const rows = (transactions ?? []).map((t) => [
    formatDateForExport(t.created_at),
    creditTransactionTypeLabels[t.transaction_type] ?? t.transaction_type ?? '',
    t.entity_type === 'rider' ? 'Rider' : 'Restaurante',
    nameMap[t.entity_id] ?? t.entity_id?.slice(0, 8) ?? '',
    formatCentsForExport(t.amount_cents ?? 0),
    formatCentsForExport(t.balance_before_cents ?? 0),
    formatCentsForExport(t.balance_after_cents ?? 0),
    t.order_id ? (orderMap[t.order_id] ?? '') : '',
    t.notes ?? '',
  ]);

  const headerLine = headers.map(escapeCsv).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsv).join(','));
  const csv = BOM + [headerLine, ...dataLines].join('\r\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="transacciones_yumi_${from ?? 'all'}_${to ?? 'all'}.csv"`,
    },
  });
}
