'use client';

import { useState } from 'react';
import { useAgent } from '@/components/agent-panel/agent-context';
import {
  GenerateRechargeCode,
  RechargeCodeList,
  LiquidateRestaurant,
  LiquidationHistory,
  RiderCreditMonitor,
} from '@/components/agent-panel/credits';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'recargas' | 'liquidaciones' | 'riders';

const tabs: { key: Tab; label: string }[] = [
  { key: 'recargas', label: 'Recargas' },
  { key: 'liquidaciones', label: 'Liquidaciones' },
  { key: 'riders', label: 'Riders' },
];

export default function AgenteCreditosPage() {
  const { hasPermission } = useAgent();
  const [activeTab, setActiveTab] = useState<Tab>('recargas');

  // Recargas state
  const [rechargeListKey, setRechargeListKey] = useState(0);

  // Liquidaciones refresh key
  const [liquidationRefreshKey, setLiquidationRefreshKey] = useState(0);

  if (!hasPermission('can_view_finance_daily')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">
          No tienes permisos para acceder a esta sección
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Gestión de créditos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Recargas, liquidaciones y monitoreo de riders
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'recargas' ? (
          <motion.div
            key="recargas"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GenerateRechargeCode
                onGenerated={() => {
                  setRechargeListKey(k => k + 1);
                }}
              />
            </div>
            <RechargeCodeList refreshKey={rechargeListKey} />
          </motion.div>
        ) : null}

        {activeTab === 'liquidaciones' ? (
          <motion.div
            key="liquidaciones"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            <LiquidateRestaurant
              onSuccess={() => setLiquidationRefreshKey(k => k + 1)}
            />
            <LiquidationHistory refreshKey={liquidationRefreshKey} />
          </motion.div>
        ) : null}

        {activeTab === 'riders' ? (
          <motion.div
            key="riders"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <RiderCreditMonitor />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
