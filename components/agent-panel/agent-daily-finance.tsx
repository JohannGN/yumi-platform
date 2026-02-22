'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgent } from '@/components/agent-panel/agent-context';
import { formatCurrency, formatTime } from '@/config/design-tokens';
import {
  DollarSign,
  Banknote,
  Bike,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface RiderCash {
  rider_id: string;
  rider_name: string;
  is_online: boolean;
  active_orders_count: number;
  delivered_today_count: number;
  active_cash_cents: number;
  delivered_cash_cents: number;
  total_cash_cents: number;
}

interface CashInFieldData {
  riders: RiderCash[];
  total_cash_in_field_cents: number;
}

export function AgentDailyFinance() {
  const { activeCityId, cities } = useAgent();
  const activeCity = cities.find((c) => c.city_id === activeCityId);
  const [data, setData] = useState<CashInFieldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    if (!activeCityId) return;
    try {
      setError(null);
      const res = await fetch('/api/admin/financial/cash-in-field');
      if (!res.ok) throw new Error('Error al cargar datos financieros');
      const json: CashInFieldData = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [activeCityId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="text-xs text-red-600 dark:text-red-400 underline mt-1"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const totalCash = data?.total_cash_in_field_cents ?? 0;
  const onlineRiders = data?.riders.filter((r) => r.is_online) ?? [];
  const totalDelivered = data?.riders.reduce((s, r) => s + r.delivered_today_count, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Finanzas del día</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeCity?.city_name} · {new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 hidden sm:inline">{formatTime(lastRefresh)}</span>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <Banknote className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Efectivo en calle</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                {formatCurrency(totalCash)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Bike className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Riders activos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                {onlineRiders.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Entregas hoy</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                {totalDelivered}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Riders table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Efectivo por rider</h3>
        </div>

        {data?.riders.length === 0 ? (
          <div className="py-12 text-center">
            <DollarSign className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Sin movimientos de efectivo hoy</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rider</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Activos</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Entregados</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">En tránsito</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Entregado</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {data?.riders.map((rider) => (
                  <tr key={rider.rider_id} className="border-b border-gray-50 dark:border-gray-800/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white text-xs">{rider.rider_name}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={[
                        'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full',
                        rider.is_online
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500',
                      ].join(' ')}>
                        <span className={[
                          'w-1.5 h-1.5 rounded-full',
                          rider.is_online ? 'bg-green-500' : 'bg-gray-400',
                        ].join(' ')} />
                        {rider.is_online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums text-gray-600 dark:text-gray-400">
                      {rider.active_orders_count}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums text-gray-600 dark:text-gray-400">
                      {rider.delivered_today_count}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-gray-600 dark:text-gray-400">
                      {formatCurrency(rider.active_cash_cents)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-gray-600 dark:text-gray-400">
                      {formatCurrency(rider.delivered_cash_cents)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(rider.total_cash_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
