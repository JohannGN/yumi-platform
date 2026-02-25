// ============================================================
// GET /api/admin/financial/pyl — Resumen P&L
// Auth: owner, city_admin
// Params: ?from=YYYY-MM-DD&to=YYYY-MM-DD&city_id=uuid
// Chat: EGRESOS-3
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { PylSummary } from '@/types/pyl';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role, city_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'city_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  // Parse params
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0];
  const cityIdParam = searchParams.get('city_id');

  // city_admin auto-filtered
  const cityId = profile.role === 'city_admin' ? profile.city_id : cityIdParam;

  // Date range for queries (inclusive)
  const fromDate = `${from}T00:00:00`;
  const toDate = `${to}T23:59:59`;

  try {
    // === INGRESOS: orders delivered in range ===
    let ordersQuery = supabase
      .from('orders')
      .select('delivery_fee_cents, restaurant_commission_cents, rounding_surplus_cents')
      .eq('status', 'delivered')
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    if (cityId) ordersQuery = ordersQuery.eq('city_id', cityId);

    const { data: deliveredOrders, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;

    const orders = deliveredOrders || [];
    const ordersCount = orders.length;

    const deliveryFeesCents = orders.reduce((sum, o) => sum + (o.delivery_fee_cents || 0), 0);
    const commissionsCents = orders.reduce((sum, o) => sum + (o.restaurant_commission_cents || 0), 0);
    const roundingSurplusCents = orders.reduce((sum, o) => sum + (o.rounding_surplus_cents || 0), 0);
    const totalIncomeCents = deliveryFeesCents + commissionsCents + roundingSurplusCents;

    // === EGRESOS: expenses in range ===
    let expensesQuery = supabase
      .from('expenses')
      .select('amount_cents, category_id, expense_categories(id, name, icon)')
      .gte('date', from)
      .lte('date', to);

    if (cityId) expensesQuery = expensesQuery.eq('city_id', cityId);

    const { data: expensesData, error: expensesError } = await expensesQuery;
    if (expensesError) throw expensesError;

    const expenses = expensesData || [];
    const totalExpensesCents = expenses.reduce((sum, e) => sum + (e.amount_cents || 0), 0);

    // Group expenses by category
    const categoryMap = new Map<string, { name: string; icon: string; total: number; count: number }>();
    for (const exp of expenses) {
      const cat = exp.expense_categories as unknown as { id: string; name: string; icon: string } | null;
      const catId = exp.category_id;
      const catName = cat?.name || 'Sin categoría';
      const catIcon = cat?.icon || '📦';

      if (categoryMap.has(catId)) {
        const existing = categoryMap.get(catId)!;
        existing.total += exp.amount_cents || 0;
        existing.count += 1;
      } else {
        categoryMap.set(catId, {
          name: catName,
          icon: catIcon,
          total: exp.amount_cents || 0,
          count: 1,
        });
      }
    }

    const byCategory = Array.from(categoryMap.entries())
      .map(([id, val]) => ({
        category_id: id,
        category_name: val.name,
        category_icon: val.icon,
        total_cents: val.total,
        count: val.count,
      }))
      .sort((a, b) => b.total_cents - a.total_cents);

    // === MARGEN ===
    const netCents = totalIncomeCents - totalExpensesCents;
    const ratio = totalExpensesCents > 0 ? totalIncomeCents / totalExpensesCents : totalIncomeCents > 0 ? Infinity : 0;
    const marginPercentage = totalIncomeCents > 0 ? (netCents / totalIncomeCents) * 100 : 0;
    const avgIncomePerOrder = ordersCount > 0 ? Math.round(totalIncomeCents / ordersCount) : 0;

    // === PUNTO DE EQUILIBRIO ===
    // Costos fijos mensuales: expenses recurrentes con period='monthly'
    let fixedCostsQuery = supabase
      .from('expenses')
      .select('amount_cents')
      .eq('recurring', true)
      .eq('recurring_period', 'monthly');

    if (cityId) fixedCostsQuery = fixedCostsQuery.eq('city_id', cityId);

    const { data: fixedCostsData } = await fixedCostsQuery;
    const monthlyFixedCostsCents = (fixedCostsData || []).reduce(
      (sum, e) => sum + (e.amount_cents || 0), 0
    );

    // Also include daily recurring * 30 + weekly * 4 + yearly / 12
    let otherRecurringQuery = supabase
      .from('expenses')
      .select('amount_cents, recurring_period')
      .eq('recurring', true)
      .neq('recurring_period', 'monthly');

    if (cityId) otherRecurringQuery = otherRecurringQuery.eq('city_id', cityId);

    const { data: otherRecurring } = await otherRecurringQuery;
    let totalMonthlyEquivalent = monthlyFixedCostsCents;
    for (const exp of otherRecurring || []) {
      const amount = exp.amount_cents || 0;
      switch (exp.recurring_period) {
        case 'daily': totalMonthlyEquivalent += amount * 30; break;
        case 'weekly': totalMonthlyEquivalent += amount * 4; break;
        case 'yearly': totalMonthlyEquivalent += Math.round(amount / 12); break;
      }
    }

    const avgMarginPerOrder = ordersCount > 0 ? Math.round(totalIncomeCents / ordersCount) : 0;
    const ordersNeeded = avgMarginPerOrder > 0 ? Math.ceil(totalMonthlyEquivalent / avgMarginPerOrder) : 0;

    const summary: PylSummary = {
      period: { from, to },
      income: {
        delivery_fees_cents: deliveryFeesCents,
        commissions_cents: commissionsCents,
        rounding_surplus_cents: roundingSurplusCents,
        total_cents: totalIncomeCents,
      },
      expenses: {
        total_cents: totalExpensesCents,
        by_category: byCategory,
      },
      margin: {
        net_cents: netCents,
        ratio: ratio === Infinity ? 999 : Math.round(ratio * 100) / 100,
        margin_percentage: Math.round(marginPercentage * 100) / 100,
      },
      orders_count: ordersCount,
      avg_income_per_order_cents: avgIncomePerOrder,
      breakeven: {
        monthly_fixed_costs_cents: totalMonthlyEquivalent,
        avg_margin_per_order_cents: avgMarginPerOrder,
        orders_needed: ordersNeeded,
      },
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('P&L summary error:', error);
    return NextResponse.json({ error: 'Error al calcular P&L' }, { status: 500 });
  }
}
