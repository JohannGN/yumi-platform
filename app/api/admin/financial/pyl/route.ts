// ============================================================
// GET /api/admin/financial/pyl — Resumen P&L (Gestión + Contable)
// Auth: owner, city_admin
// Params: ?from=YYYY-MM-DD&to=YYYY-MM-DD&city_id=uuid
// Chat: EGRESOS-3 + Vista Contable
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

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0];
  const cityIdParam = searchParams.get('city_id');
  const cityId = profile.role === 'city_admin' ? profile.city_id : cityIdParam;

  const fromDate = `${from}T00:00:00`;
  const toDate = `${to}T23:59:59`;

  try {
    // ========================================================
    // 1. ORDERS ENTREGADAS (base para todo)
    // ========================================================
    let ordersQuery = supabase
      .from('orders')
      .select('delivery_fee_cents, restaurant_commission_cents, rounding_surplus_cents, total_cents, payment_method, actual_payment_method')
      .eq('status', 'delivered')
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    if (cityId) ordersQuery = ordersQuery.eq('city_id', cityId);
    const { data: deliveredOrders, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;

    const orders = deliveredOrders || [];
    const ordersCount = orders.length;

    // --- Vista Gestión: ingresos YUMI ---
    const deliveryFeesCents = orders.reduce((s, o) => s + (o.delivery_fee_cents || 0), 0);
    const commissionsCents = orders.reduce((s, o) => s + (o.restaurant_commission_cents || 0), 0);
    const roundingSurplusCents = orders.reduce((s, o) => s + (o.rounding_surplus_cents || 0), 0);
    const totalIncomeCents = deliveryFeesCents + commissionsCents + roundingSurplusCents;

    // --- Vista Contable: desglose por método de pago ---
    const paymentMethodMap = new Map<string, { count: number; total: number }>();
    let digitalPaymentsCents = 0;
    let cashCollectedCents = 0;

    for (const order of orders) {
      const method = order.actual_payment_method || order.payment_method || 'cash';
      const total = order.total_cents || 0;

      // Agrupar por método
      const existing = paymentMethodMap.get(method) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += total;
      paymentMethodMap.set(method, existing);

      // Clasificar flujo bancario
      // POS es de YUMI → entra directo a cuenta, igual que Yape/Plin
      if (method === 'yape' || method === 'plin' || method === 'pos') {
        digitalPaymentsCents += total;  // Entra directo a cuenta YUMI
      } else if (method === 'cash') {
        cashCollectedCents += total;    // Solo cash físico queda en tránsito
      }
    }

    const byPaymentMethod = Array.from(paymentMethodMap.entries())
      .map(([method, val]) => ({
        method,
        orders_count: val.count,
        total_cents: val.total,
      }))
      .sort((a, b) => b.total_cents - a.total_cents);

    // ========================================================
    // 2. EGRESOS OPERATIVOS (expenses table)
    // ========================================================
    let expensesQuery = supabase
      .from('expenses')
      .select('amount_cents, category_id, expense_categories(id, name, icon)')
      .gte('date', from)
      .lte('date', to);

    if (cityId) expensesQuery = expensesQuery.eq('city_id', cityId);
    const { data: expensesData, error: expensesError } = await expensesQuery;
    if (expensesError) throw expensesError;

    const expenses = expensesData || [];
    const totalExpensesCents = expenses.reduce((s, e) => s + (e.amount_cents || 0), 0);

    // Agrupar por categoría
    const categoryMap = new Map<string, { name: string; icon: string; total: number; count: number }>();
    for (const exp of expenses) {
      const cat = exp.expense_categories as unknown as { id: string; name: string; icon: string } | null;
      const catId = exp.category_id;
      if (categoryMap.has(catId)) {
        const existing = categoryMap.get(catId)!;
        existing.total += exp.amount_cents || 0;
        existing.count += 1;
      } else {
        categoryMap.set(catId, {
          name: cat?.name || 'Sin categoría',
          icon: cat?.icon || '📦',
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

    // ========================================================
    // 3. LIQUIDACIONES A RESTAURANTES (salida de cuentas YUMI)
    // ========================================================
    let liqQuery = supabase
      .from('restaurant_liquidations')
      .select('restaurant_id, amount_cents, date, payment_method, restaurants(name)')
      .gte('date', from)
      .lte('date', to);

    // city_admin filter: only restaurants in their city
    if (cityId) {
      const { data: cityRestaurants } = await supabase
        .from('restaurants')
        .select('id')
        .eq('city_id', cityId);
      const ids = (cityRestaurants || []).map(r => r.id);
      if (ids.length > 0) {
        liqQuery = liqQuery.in('restaurant_id', ids);
      }
    }

    const { data: liquidationsData } = await liqQuery;
    const liquidations = liquidationsData || [];
    const restaurantLiquidationsCents = liquidations.reduce((s, l) => s + (l.amount_cents || 0), 0);

    const liquidationsByRestaurant = liquidations.map((l) => {
      const rest = l.restaurants as unknown as { name: string } | null;
      return {
        restaurant_id: l.restaurant_id,
        restaurant_name: rest?.name || 'Restaurante',
        amount_cents: l.amount_cents,
        date: l.date,
        payment_method: l.payment_method,
      };
    }).sort((a, b) => b.amount_cents - a.amount_cents);

    // ========================================================
    // 4. RECARGAS DE RIDERS (entrada a cuentas YUMI)
    // ========================================================
    let rechargesQuery = supabase
      .from('credit_transactions')
      .select('amount_cents')
      .eq('entity_type', 'rider')
      .eq('transaction_type', 'recharge')
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    const { data: rechargesData } = await rechargesQuery;
    const riderRechargesCents = (rechargesData || []).reduce((s, r) => s + (r.amount_cents || 0), 0);

    // ========================================================
    // 5. MARGEN GESTIÓN
    // ========================================================
    const netCents = totalIncomeCents - totalExpensesCents;
    const ratio = totalExpensesCents > 0 ? totalIncomeCents / totalExpensesCents : totalIncomeCents > 0 ? Infinity : 0;
    const marginPercentage = totalIncomeCents > 0 ? (netCents / totalIncomeCents) * 100 : 0;
    const avgIncomePerOrder = ordersCount > 0 ? Math.round(totalIncomeCents / ordersCount) : 0;

    // ========================================================
    // 6. BREAKEVEN
    // ========================================================
    let fixedCostsQuery = supabase
      .from('expenses')
      .select('amount_cents, recurring_period')
      .eq('recurring', true);

    if (cityId) fixedCostsQuery = fixedCostsQuery.eq('city_id', cityId);
    const { data: fixedCostsData } = await fixedCostsQuery;

    let totalMonthlyEquivalent = 0;
    for (const exp of fixedCostsData || []) {
      const amount = exp.amount_cents || 0;
      switch (exp.recurring_period) {
        case 'daily': totalMonthlyEquivalent += amount * 30; break;
        case 'weekly': totalMonthlyEquivalent += amount * 4; break;
        case 'monthly': totalMonthlyEquivalent += amount; break;
        case 'yearly': totalMonthlyEquivalent += Math.round(amount / 12); break;
      }
    }

    const avgMarginPerOrder = ordersCount > 0 ? Math.round(totalIncomeCents / ordersCount) : 0;
    const ordersNeeded = avgMarginPerOrder > 0 ? Math.ceil(totalMonthlyEquivalent / avgMarginPerOrder) : 0;

    // ========================================================
    // 7. CONTABLE: BALANCE BANCARIO
    // ========================================================
    const accountingTotalIncome = digitalPaymentsCents + riderRechargesCents;
    const accountingTotalExpenses = restaurantLiquidationsCents + totalExpensesCents;
    const netBankBalance = accountingTotalIncome - accountingTotalExpenses;

    // ========================================================
    // RESPUESTA
    // ========================================================
    const summary: PylSummary = {
      period: { from, to },
      // Gestión
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
      // Contable
      accounting: {
        digital_payments_received_cents: digitalPaymentsCents,
        rider_recharges_cents: riderRechargesCents,
        total_income_cents: accountingTotalIncome,

        restaurant_liquidations_cents: restaurantLiquidationsCents,
        restaurant_liquidations_count: liquidations.length,
        operational_expenses_cents: totalExpensesCents,
        total_expenses_cents: accountingTotalExpenses,

        net_bank_balance_cents: netBankBalance,

        cash_collected_cents: cashCollectedCents,
        pos_collected_cents: 0,
        total_cash_in_transit_cents: cashCollectedCents,

        by_payment_method: byPaymentMethod,
        liquidations_by_restaurant: liquidationsByRestaurant,
      },
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('P&L summary error:', error);
    return NextResponse.json({ error: 'Error al calcular P&L' }, { status: 500 });
  }
}
