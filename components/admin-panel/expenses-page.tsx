'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Tags } from 'lucide-react';
import { ExpensesTable } from './expenses-table';
import { ExpenseCategoriesManager } from './expense-categories-manager';

const tabs = [
  { id: 'expenses' as const, label: 'Egresos', icon: Receipt },
  { id: 'categories' as const, label: 'Categorías', icon: Tags },
];

type TabId = (typeof tabs)[number]['id'];

export function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('expenses');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Egresos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Registro y gestión de gastos operativos
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${isActive
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'expenses' ? (
          <motion.div
            key="expenses"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ExpensesTable />
          </motion.div>
        ) : (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ExpenseCategoriesManager />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
