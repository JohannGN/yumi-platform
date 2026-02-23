'use client';

import { useState, useEffect } from 'react';
import { useAgent } from '@/components/agent-panel/agent-context';
import { creditThresholds } from '@/config/design-tokens';
import Link from 'next/link';

interface RiderBasic {
  id: string;
  pay_type: string;
  balance_cents?: number;
}

export function CreditsDashboardWidget() {
  const { hasPermission, activeCityId } = useAgent();
  const [criticalCount, setCriticalCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCityId || !hasPermission('can_view_finance_daily')) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/agent/riders?city_id=${activeCityId}`);
        if (!res.ok) throw new Error('Error');
        const json = await res.json();
        const all = (json.data || json || []) as RiderBasic[];
        const commission = all.filter(r => r.pay_type === 'commission');

        setTotalCommission(commission.length);
        setCriticalCount(
          commission.filter(r => (r.balance_cents ?? 0) < creditThresholds.minimum_cents).length
        );
        setWarningCount(
          commission.filter(r => {
            const b = r.balance_cents ?? 0;
            return b >= creditThresholds.minimum_cents && b < creditThresholds.warning_cents;
          }).length
        );
      } catch {
        setCriticalCount(0);
        setWarningCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeCityId, hasPermission]);

  if (!hasPermission('can_view_finance_daily')) return null;

  const hasCritical = criticalCount > 0;
  const hasWarning = warningCount > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Créditos riders
        </h4>
        {!loading && totalCommission > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {totalCommission} riders
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ) : totalCommission === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Sin riders comisión</p>
      ) : (
        <div className="space-y-2">
          {hasCritical && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold">
                {criticalCount}
              </span>
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                riders con créditos bajos
              </span>
            </div>
          )}

          {hasWarning && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-xs font-bold">
                {warningCount}
              </span>
              <span className="text-sm text-yellow-600 dark:text-yellow-400">
                riders en alerta
              </span>
            </div>
          )}

          {!hasCritical && !hasWarning && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Todos los riders con saldo saludable
            </p>
          )}
        </div>
      )}

      <Link
        href="/agente/creditos"
        className="mt-3 block text-sm text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 font-medium"
      >
        Ver créditos →
      </Link>
    </div>
  );
}
