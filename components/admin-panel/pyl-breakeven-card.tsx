'use client';

// ============================================================
// PylBreakevenCard — Card de punto de equilibrio
// Solo se muestra en vista Gestión
// Chat: EGRESOS-3
// ============================================================

import { Target, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { formatCurrency } from '@/config/tokens';
import type { PylSummary } from '@/types/pyl';

interface PylBreakevenCardProps {
  summary: PylSummary;
}

export function PylBreakevenCard({ summary }: PylBreakevenCardProps) {
  const { breakeven, orders_count } = summary;
  const hasFixedCosts = breakeven.monthly_fixed_costs_cents > 0;
  const hasMargin = breakeven.avg_margin_per_order_cents > 0;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const periodFrom = new Date(summary.period.from);
  const periodTo = new Date(summary.period.to);
  const periodDays = Math.max(1, Math.ceil((periodTo.getTime() - periodFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const dailyOrderRate = orders_count / periodDays;
  const projectedMonthlyOrders = Math.round(dailyOrderRate * daysInMonth);

  const isBreakevenReached = hasFixedCosts && hasMargin && projectedMonthlyOrders >= breakeven.orders_needed;
  const progressPercent = hasFixedCosts && breakeven.orders_needed > 0
    ? Math.min(100, Math.round((projectedMonthlyOrders / breakeven.orders_needed) * 100))
    : 0;

  if (!hasFixedCosts) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Punto de equilibrio
          </h3>
        </div>
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
          <Info className="w-4 h-4" />
          <p>
            No hay egresos recurrentes registrados. Agrega gastos fijos mensuales en la sección de Egresos para calcular el punto de equilibrio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 border-2 transition-colors ${
      isBreakevenReached
        ? 'border-green-300 dark:border-green-700'
        : 'border-orange-300 dark:border-orange-700'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Punto de equilibrio
          </h3>
        </div>
        {isBreakevenReached ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Rentable este mes
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Faltan pedidos
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Costos fijos mensuales</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(breakeven.monthly_fixed_costs_cents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ingreso promedio/pedido</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(breakeven.avg_margin_per_order_cents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pedidos necesarios/mes</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {breakeven.orders_needed}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>
            Proyección mensual: ~{projectedMonthlyOrders} pedidos
            <span className="text-gray-400 dark:text-gray-500 ml-1">
              ({dailyOrderRate.toFixed(1)}/día × {daysInMonth}d)
            </span>
          </span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPercent >= 100
                ? 'bg-green-500'
                : progressPercent >= 70
                  ? 'bg-orange-400'
                  : 'bg-red-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
        Cálculo: costos fijos mensuales ÷ ingreso promedio por pedido = pedidos mínimos para cubrir gastos fijos.
      </p>
    </div>
  );
}
