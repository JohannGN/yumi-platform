'use client';

import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  creditTransactionTypeLabels,
  formatCurrency,
  formatDate,
} from '@/config/tokens';

interface Transaction {
  id: string;
  transaction_type: string;
  amount_cents: number;
  balance_after_cents: number;
  order_id: string | null;
  notes: string | null;
  created_at: string;
}

interface RestaurantCreditTransactionsProps {
  transactions: Transaction[];
}

const PAGE_SIZE = 10;

const POSITIVE_TYPES = new Set(['order_credit', 'refund']);

function isPositive(type: string, amount: number): boolean {
  if (POSITIVE_TYPES.has(type)) return true;
  if (type === 'adjustment') return amount > 0;
  return false;
}

export function RestaurantCreditTransactions({ transactions }: RestaurantCreditTransactionsProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const paginated = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
        <Receipt className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Aún no hay transacciones registradas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {paginated.map((tx) => {
        const positive = isPositive(tx.transaction_type, tx.amount_cents);
        const label = creditTransactionTypeLabels[tx.transaction_type] || tx.transaction_type;

        return (
          <div
            key={tx.id}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              {/* Left: icon + info */}
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`flex-shrink-0 p-1.5 rounded-lg ${
                    positive
                      ? 'bg-green-50 dark:bg-green-950/30'
                      : 'bg-red-50 dark:bg-red-950/30'
                  }`}
                >
                  {positive ? (
                    <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {label}
                  </p>
                  {tx.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {tx.notes}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {formatDate(tx.created_at)}
                  </p>
                </div>
              </div>

              {/* Right: amount + balance after */}
              <div className="text-right flex-shrink-0">
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    positive
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {positive ? '+' : '-'}{formatCurrency(Math.abs(tx.amount_cents))}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums mt-0.5">
                  Saldo: {formatCurrency(tx.balance_after_cents)}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
