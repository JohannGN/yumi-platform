'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { RestaurantCreditBalance } from '@/components/restaurant-panel/restaurant-credit-balance';
import { RestaurantCreditTransactions } from '@/components/restaurant-panel/restaurant-credit-transactions';
import { RestaurantLiquidationHistory } from '@/components/restaurant-panel/restaurant-liquidation-history';

interface CreditsData {
  credits: {
    balance_cents: number;
    total_earned_cents: number;
    total_liquidated_cents: number;
  };
  restaurant_id?: string;
  recent_transactions: Array<{
    id: string;
    transaction_type: string;
    amount_cents: number;
    balance_after_cents: number;
    order_id: string | null;
    notes: string | null;
    created_at: string;
  }>;
  recent_liquidations: Array<{
    id: string;
    date: string;
    amount_cents: number;
    payment_method: string;
    proof_url: string | null;
    created_at: string;
  }>;
}

type TabKey = 'transactions' | 'liquidations';

export default function RestauranteCreditsPage() {
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('transactions');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const fetchCredits = async () => {
    try {
      setError(null);
      const res = await fetch('/api/restaurant/credits');
      if (!res.ok) {
        if (res.status === 404) {
          setData(null);
          return;
        }
        throw new Error('Error al cargar créditos');
      }
      const json = await res.json();
      setData(json);
      if (json.restaurant_id) setRestaurantId(json.restaurant_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'transactions', label: 'Transacciones' },
    { key: 'liquidations', label: 'Liquidaciones' },
  ];

  // Skeleton loading
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-7 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="h-40 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-10 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Link href="/restaurante" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Créditos</h1>
        </div>
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 text-center">
          <p className="text-red-700 dark:text-red-300 mb-3">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchCredits(); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // No credits row (restaurant without commission)
  if (!data) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Link href="/restaurante" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Créditos</h1>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center">
          <Coins className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Tu restaurante aún no tiene créditos activos.
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
            Contacta a tu agente YUMI para más información.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/restaurante" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden">
          <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Créditos</h1>
      </div>

      {/* Balance card */}
      <RestaurantCreditBalance
        credits={data.credits}
        restaurantId={restaurantId}
        onBalanceUpdate={fetchCredits}
      />

      {/* Tabs */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'transactions' ? (
          <motion.div
            key="transactions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <RestaurantCreditTransactions transactions={data.recent_transactions} />
          </motion.div>
        ) : (
          <motion.div
            key="liquidations"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <RestaurantLiquidationHistory liquidations={data.recent_liquidations} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
