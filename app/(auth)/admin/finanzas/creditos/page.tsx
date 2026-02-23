'use client';

import { useState } from 'react';
import { CreditsSummaryCards } from '@/components/admin-panel/credits-summary-cards';
import { CreditsTransactionsTable } from '@/components/admin-panel/credits-transactions-table';
import { CreditsAdjustmentForm } from '@/components/admin-panel/credits-adjustment-form';
import { CreditsRechargeViewer } from '@/components/admin-panel/credits-recharge-viewer';

type Tab = 'resumen' | 'transacciones' | 'ajustes' | 'codigos';

const tabs: { key: Tab; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'transacciones', label: 'Transacciones' },
  { key: 'ajustes', label: 'Ajustes' },
  { key: 'codigos', label: 'Códigos recarga' },
];

export default function AdminCreditsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('resumen');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Gestión de Créditos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Saldos globales, transacciones y ajustes del sistema de créditos
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
              ${activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'resumen' && <CreditsSummaryCards />}
      {activeTab === 'transacciones' && <CreditsTransactionsTable />}
      {activeTab === 'ajustes' && <CreditsAdjustmentForm />}
      {activeTab === 'codigos' && <CreditsRechargeViewer />}
    </div>
  );
}
