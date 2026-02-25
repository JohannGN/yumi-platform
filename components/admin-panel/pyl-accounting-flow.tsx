'use client';

// ============================================================
// PylAccountingFlow — Flujo visual de dinero + desglose por método
// Muestra de dónde viene y a dónde va cada sol
// Chat: EGRESOS-3 + Vista Contable
// ============================================================

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { ArrowRight, Wallet, Banknote } from 'lucide-react';
import { formatCurrency } from '@/config/tokens';
import { paymentMethodLabels } from '@/config/design-tokens';
import type { PylSummary } from '@/types/pyl';

interface PylAccountingFlowProps {
  summary: PylSummary;
}

const PAYMENT_COLORS: Record<string, string> = {
  yape: '#8B5CF6',
  plin: '#06B6D4',
  cash: '#F59E0B',
  pos: '#3B82F6',
};

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { fill: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.payload.fill }} />
        <span className="font-medium text-gray-900 dark:text-white">{entry.name}</span>
      </div>
      <p className="text-gray-600 dark:text-gray-300">{formatCurrency(entry.value)}</p>
    </div>
  );
}

export function PylAccountingFlow({ summary }: PylAccountingFlowProps) {
  const { accounting } = summary;

  const paymentData = useMemo(
    () => accounting.by_payment_method.map((pm) => ({
      name: paymentMethodLabels[pm.method] || pm.method,
      value: pm.total_cents,
      count: pm.orders_count,
      method: pm.method,
    })),
    [accounting.by_payment_method]
  );

  const totalOrders = paymentData.reduce((s, p) => s + p.count, 0);
  const totalAmount = paymentData.reduce((s, p) => s + p.value, 0);
  const hasData = paymentData.length > 0 && totalAmount > 0;

  // Split into bank vs cash
  const bankMethods = paymentData.filter(p => p.method === 'yape' || p.method === 'plin' || p.method === 'pos');
  const cashMethods = paymentData.filter(p => p.method === 'cash');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Payment method breakdown pie chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Distribución por método de pago
        </h3>

        {hasData ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {paymentData.map((entry) => (
                    <Cell key={entry.method} fill={PAYMENT_COLORS[entry.method] || '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full sm:w-52 space-y-2">
              {paymentData.map((pm) => {
                const pct = totalAmount > 0 ? ((pm.value / totalAmount) * 100).toFixed(1) : '0';
                return (
                  <div key={pm.method} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PAYMENT_COLORS[pm.method] || '#9CA3AF' }} />
                    <span className="text-gray-600 dark:text-gray-300 flex-1 truncate">
                      {pm.name}
                    </span>
                    <span className="text-gray-400 text-xs">{pm.count}</span>
                    <span className="font-medium text-gray-900 dark:text-white text-xs">
                      {pct}%
                    </span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500">
                {totalOrders} pedidos · {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
            Sin datos de pago en el período
          </div>
        )}
      </div>

      {/* Flow visualization: bank vs cash */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Flujo de dinero
        </h3>

        <div className="space-y-4">
          {/* Bank flow */}
          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Pasa por banco (Yape/Plin/POS)
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Recibido de clientes</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  +{formatCurrency(accounting.digital_payments_received_cents)}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Pagado a restaurantes</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  -{formatCurrency(accounting.restaurant_liquidations_cents)}
                </p>
              </div>
            </div>
            {bankMethods.length > 0 && (
              <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-700 text-xs text-purple-600 dark:text-purple-400">
                {bankMethods.map(m => `${m.name}: ${m.count} pedidos`).join(' · ')}
              </div>
            )}
          </div>

          {/* Cash flow */}
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Efectivo (rider cobra)
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Cash cobrado por riders</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(accounting.cash_collected_cents)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-1 border-t border-amber-200 dark:border-amber-700">
                <span className="font-medium text-amber-700 dark:text-amber-300">Pendiente de bancarizar</span>
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  {formatCurrency(accounting.total_cash_in_transit_cents)}
                </span>
              </div>
            </div>
            {cashMethods.length > 0 && (
              <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700 text-xs text-amber-600 dark:text-amber-400">
                {cashMethods.map(m => `${m.name}: ${m.count} pedidos`).join(' · ')}
              </div>
            )}
          </div>

          {/* Recharges */}
          {accounting.rider_recharges_cents > 0 && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300 font-medium">
                  💳 Recargas de riders
                </span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  +{formatCurrency(accounting.rider_recharges_cents)}
                </span>
              </div>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                Depósitos de riders para créditos operativos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
