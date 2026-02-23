'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  formatCurrency,
  formatDate,
  creditTransactionTypeLabels,
  colors,
} from '@/config/tokens';
import type { CreditTransaction, CreditTransactionType } from '@/types/credit-types';

type FilterType = 'all' | 'recharge' | 'debit' | 'credit';

const filterTabs: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'recharge', label: 'Recargas' },
  { key: 'debit', label: 'Débitos' },
  { key: 'credit', label: 'Créditos' },
];

// Map filter to API type param
function getApiType(filter: FilterType): string {
  switch (filter) {
    case 'recharge': return 'recharge';
    case 'debit': return 'debit';
    case 'credit': return 'credit';
    default: return 'all';
  }
}

const DEBIT_TYPES: CreditTransactionType[] = [
  'order_food_debit',
  'order_commission_debit',
  'liquidation',
  'voided_recharge',
];

export function CreditHistory() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const LIMIT = 20;

  // Fetch transactions
  const fetchPage = useCallback(async (pageNum: number, filterType: FilterType, reset: boolean) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const apiType = getApiType(filterType);
      const res = await fetch(
        `/api/rider/credits/history?page=${pageNum}&limit=${LIMIT}&type=${apiType}`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data: CreditTransaction[] = await res.json();

      if (reset) {
        setTransactions(data);
      } else {
        setTransactions((prev) => [...prev, ...data]);
      }

      setHasMore(data.length === LIMIT);
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Initial load + filter change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchPage(1, filter, true);
  }, [filter, fetchPage]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPage(nextPage, filter, false);
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);

    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [hasMore, isLoadingMore, isLoading, page, filter, fetchPage]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">
          Historial de créditos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Todas tus transacciones
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="relative flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors"
          >
            {filter === tab.key && (
              <motion.div
                layoutId="credit-filter-tab"
                className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 ${
                filter === tab.key
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <HistorySkeleton />
      ) : transactions.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <AnimatePresence mode="popLayout">
            {transactions.map((tx, i) => (
              <TransactionRow key={tx.id} transaction={tx} index={i} />
            ))}
          </AnimatePresence>

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Sentinel for infinite scroll */}
          {hasMore && <div ref={sentinelRef} className="h-4" />}

          {/* End of list */}
          {!hasMore && transactions.length > 0 && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
              No hay más transacciones
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// === Transaction Row ===
function TransactionRow({ transaction: tx, index }: { transaction: CreditTransaction; index: number }) {
  const isNegative = DEBIT_TYPES.includes(tx.transaction_type) || tx.amount_cents < 0;
  const label = creditTransactionTypeLabels[tx.transaction_type] || tx.transaction_type;
  const icon = getTransactionIcon(tx.transaction_type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="flex items-center gap-3 py-3 px-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${
        isNegative
          ? 'bg-red-50 dark:bg-red-950/20'
          : 'bg-green-50 dark:bg-green-950/20'
      }`}>
        {icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {label}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          {formatDate(tx.created_at)}
          {tx.notes && (
            <span className="ml-1 text-gray-400">· {tx.notes}</span>
          )}
        </p>
      </div>

      {/* Amount + balance after */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${
          isNegative ? 'text-red-500' : 'text-green-600 dark:text-green-400'
        }`}>
          {isNegative ? '' : '+'}{formatCurrency(tx.amount_cents)}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
          Saldo: {formatCurrency(tx.balance_after_cents)}
        </p>
      </div>
    </motion.div>
  );
}

function getTransactionIcon(type: CreditTransactionType): string {
  switch (type) {
    case 'recharge': return '💳';
    case 'order_food_debit': return '🍽️';
    case 'order_commission_debit': return '📊';
    case 'order_credit': return '✅';
    case 'liquidation': return '💸';
    case 'refund': return '↩️';
    case 'adjustment': return '⚙️';
    case 'voided_recharge': return '🚫';
    default: return '💰';
  }
}

function EmptyState({ filter }: { filter: FilterType }) {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <span className="text-4xl mb-3">📭</span>
      <p className="text-sm font-bold text-gray-900 dark:text-white">
        Sin transacciones
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {filter === 'all'
          ? 'Aún no tienes movimientos de créditos'
          : 'No hay transacciones de este tipo'}
      </p>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-3 px-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="w-32 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-24 h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="space-y-1.5 text-right">
            <div className="w-16 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse ml-auto" />
            <div className="w-20 h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}
