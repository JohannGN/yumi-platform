'use client';

// ============================================================
// PylAccountingCards — KPI cards para vista Contable (SUNAT)
// Flujo bancario real: entradas, salidas, balance, efectivo
// Chat: EGRESOS-3 + Vista Contable
// ============================================================

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Landmark,
  Banknote,
  CreditCard,
  Store,
} from 'lucide-react';
import { formatCurrency } from '@/config/tokens';
import type { PylSummary } from '@/types/pyl';

interface PylAccountingCardsProps {
  summary: PylSummary;
}

export function PylAccountingCards({ summary }: PylAccountingCardsProps) {
  const { accounting } = summary;
  const isPositiveBalance = accounting.net_bank_balance_cents >= 0;

  const cards = [
    {
      label: 'Entradas a banco',
      value: formatCurrency(accounting.total_income_cents),
      icon: ArrowDownToLine,
      iconColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      sub: `Yape/Plin/POS: ${formatCurrency(accounting.digital_payments_received_cents)} + Recargas: ${formatCurrency(accounting.rider_recharges_cents)}`,
      borderColor: 'border-green-200 dark:border-green-800',
    },
    {
      label: 'Salidas de banco',
      value: formatCurrency(accounting.total_expenses_cents),
      icon: ArrowUpFromLine,
      iconColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      sub: `Restaurantes: ${formatCurrency(accounting.restaurant_liquidations_cents)} + Gastos: ${formatCurrency(accounting.operational_expenses_cents)}`,
      borderColor: 'border-red-200 dark:border-red-800',
    },
    {
      label: 'Balance bancario neto',
      value: formatCurrency(accounting.net_bank_balance_cents),
      icon: Landmark,
      iconColor: isPositiveBalance ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      iconBg: isPositiveBalance ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30',
      sub: `Entradas - Salidas del período`,
      highlight: true,
      highlightPositive: isPositiveBalance,
      borderColor: '',
    },
    {
      label: 'Efectivo en tránsito',
      value: formatCurrency(accounting.total_cash_in_transit_cents),
      icon: Banknote,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      sub: `Cash físico cobrado por riders`,
      borderColor: 'border-amber-200 dark:border-amber-800',
    },
    {
      label: 'Pagos a restaurantes',
      value: formatCurrency(accounting.restaurant_liquidations_cents),
      icon: Store,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      sub: `${accounting.restaurant_liquidations_count} liquidaciones`,
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
      label: 'Pagos digitales + POS',
      value: formatCurrency(accounting.digital_payments_received_cents),
      icon: CreditCard,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      sub: `Yape/Plin/POS de ${accounting.by_payment_method.filter(m => m.method === 'yape' || m.method === 'plin' || m.method === 'pos').reduce((s, m) => s + m.orders_count, 0)} pedidos`,
      borderColor: 'border-purple-200 dark:border-purple-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`bg-white dark:bg-gray-800 rounded-xl p-5 border transition-colors ${
              card.highlight
                ? card.highlightPositive
                  ? 'border-green-300 dark:border-green-700 ring-1 ring-green-200 dark:ring-green-800'
                  : 'border-red-300 dark:border-red-700 ring-1 ring-red-200 dark:ring-red-800'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {card.label}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {card.value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {card.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
}
