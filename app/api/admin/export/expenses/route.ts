import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Role check — only owner + city_admin can export
  const { data: userData } = await supabase
    .from('users')
    .select('role, city_id')
    .eq('id', user.id)
    .single();

  if (!userData || !['owner', 'city_admin'].includes(userData.role)) {
    return NextResponse.json({ error: 'Sin permisos para exportar' }, { status: 403 });
  }

  // Parse filters
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get('city_id');
  const categoryId = searchParams.get('category_id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const recurring = searchParams.get('recurring');

  // Build query
  let query = supabase
    .from('expenses')
    .select(`
      id, date, amount_cents, description, recurring, recurring_period, notes,
      category:expense_categories!category_id(name, icon),
      city:cities!city_id(name),
      creator:users!created_by(name),
      linked_rider:riders!linked_rider_id(id, user_id, users:users!user_id(name)),
      linked_restaurant:restaurants!linked_restaurant_id(name)
    `)
    .order('date', { ascending: false })
    .limit(5000);

  // city_admin: only their city
  if (userData.role === 'city_admin' && userData.city_id) {
    query = query.eq('city_id', userData.city_id);
  } else if (cityId) {
    query = query.eq('city_id', cityId);
  }

  if (categoryId) query = query.eq('category_id', categoryId);
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  if (recurring === 'true') query = query.eq('recurring', true);
  if (recurring === 'false') query = query.eq('recurring', false);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map recurring periods
  const periodLabels: Record<string, string> = {
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual',
    yearly: 'Anual',
  };

  // Build CSV rows
  const headers = [
    'Fecha',
    'Categoría',
    'Descripción',
    'Monto (S/)',
    'Ciudad',
    'Recurrente',
    'Período',
    'Rider vinculado',
    'Restaurante vinculado',
    'Creado por',
    'Notas',
  ];

  const rows = (data || []).map((row) => {
    // Flatten joins safely
    const categoryData = row.category as { name?: string; icon?: string } | null;
    const cityData = row.city as { name?: string } | null;
    const creatorData = row.creator as { name?: string } | null;
    const linkedRider = row.linked_rider as { users?: { name?: string } } | null;
    const linkedRestaurant = row.linked_restaurant as { name?: string } | null;

    const riderName = linkedRider?.users?.name || '';
    const restaurantName = linkedRestaurant?.name || '';

    return [
      row.date,
      categoryData?.name || '',
      row.description,
      (row.amount_cents / 100).toFixed(2),
      cityData?.name || '',
      row.recurring ? 'Sí' : 'No',
      row.recurring && row.recurring_period ? (periodLabels[row.recurring_period] || row.recurring_period) : '',
      riderName,
      restaurantName,
      creatorData?.name || '',
      row.notes || '',
    ];
  });

  // Build CSV string with BOM + CRLF
  const BOM = '\uFEFF';
  const escapeCSV = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ];

  const csvContent = BOM + csvLines.join('\r\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="egresos-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
