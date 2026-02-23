'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAgent } from '@/components/agent-panel/agent-context';
import { CreditsDashboardWidget } from '@/components/agent-panel/credits';
import {
  orderStatusLabels,
  escalationPriorityLabels,
  escalationReasonLabels,
  formatCurrency,
  formatTime,
  formatOrderCode,
  formatPhone,
  colors,
} from '@/config/design-tokens';
import type { AgentOrder, AgentEscalation, PaginatedResponse } from '@/types/agent-panel';
import {
  ShoppingBag,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Loader2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface DashboardKPIs {
  ordersToday: number;
  activeOrders: number;
  deliveredToday: number;
  pendingEscalations: number;
}

const ACTIVE_STATUSES = [
  'awaiting_confirmation', 'pending_confirmation', 'confirmed',
  'preparing', 'ready', 'assigned_rider', 'picked_up', 'in_transit',
];

function KPICard({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          {loading ? (
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = colors.orderStatus[status as keyof typeof colors.orderStatus] ?? '#6B7280';
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />;
}

export function AgentDashboard() {
  const { activeCityId, agent, cities, hasPermission } = useAgent();
  const router = useRouter();
  const activeCity = cities.find((c) => c.city_id === activeCityId);

  const [kpis, setKPIs] = useState<DashboardKPIs>({ ordersToday: 0, activeOrders: 0, deliveredToday: 0, pendingEscalations: 0 });
  const [recentOrders, setRecentOrders] = useState<AgentOrder[]>([]);
  const [pendingEscalations, setPendingEscalations] = useState<AgentEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchDashboard = useCallback(async () => {
    if (!activeCityId) return;
    try {
      // Fetch orders (page 1, all statuses)
      const ordersRes = await fetch(`/api/agent/orders?city_id=${activeCityId}&page=1`);
      const ordersData: PaginatedResponse<AgentOrder> = ordersRes.ok ? await ordersRes.json() : { data: [], total: 0, page: 1, per_page: 20, total_pages: 0 };

      // Fetch escalations
      const escRes = await fetch(`/api/agent/escalations?city_id=${activeCityId}&status=pending`);
      const escData: AgentEscalation[] = escRes.ok ? await escRes.json() : [];

      // Calculate KPIs from orders
      const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Lima' });
      const todayOrders = ordersData.data.filter((o) => {
        const orderDate = new Date(o.created_at).toLocaleDateString('en-US', { timeZone: 'America/Lima' });
        return orderDate === today;
      });

      const activeOrders = ordersData.data.filter((o) => ACTIVE_STATUSES.includes(o.status));
      const deliveredToday = todayOrders.filter((o) => o.status === 'delivered');

      setKPIs({
        ordersToday: todayOrders.length,
        activeOrders: activeOrders.length,
        deliveredToday: deliveredToday.length,
        pendingEscalations: escData.length,
      });

      // Last 5 active orders
      setRecentOrders(activeOrders.slice(0, 5));
      setPendingEscalations(escData.slice(0, 5));
      setLastRefresh(new Date());
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [activeCityId]);

  useEffect(() => {
    setLoading(true);
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Panel Agente</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeCity?.city_name} · {agent?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 hidden sm:inline">
            {formatTime(lastRefresh)}
          </span>
          <button
            onClick={() => { setLoading(true); fetchDashboard(); }}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={ShoppingBag} label="Pedidos hoy" value={kpis.ordersToday} color="#3B82F6" loading={loading} />
        <KPICard icon={TrendingUp} label="Activos ahora" value={kpis.activeOrders} color="#F59E0B" loading={loading} />
        <KPICard icon={CheckCircle2} label="Entregados hoy" value={kpis.deliveredToday} color="#22C55E" loading={loading} />
        <KPICard icon={AlertTriangle} label="Escalaciones" value={kpis.pendingEscalations} color="#EF4444" loading={loading} />
      </div>

      {/* Credits Widget + Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Active Orders */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pedidos activos</h3>
            <button
              onClick={() => router.push('/agente/pedidos')}
              className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">Sin pedidos activos</p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => router.push('/agente/pedidos')}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot status={order.status} />
                      <span className="text-xs font-mono font-semibold text-gray-900 dark:text-white">
                        {formatOrderCode(order.code)}
                      </span>
                      <span className="text-[10px] text-gray-400 hidden sm:inline">
                        {orderStatusLabels[order.status]}
                      </span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                      {formatCurrency(order.total_cents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-gray-500 truncate max-w-[200px]">{order.restaurant_name}</span>
                    <span className="text-[10px] text-gray-400 tabular-nums">{formatTime(order.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Escalations */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Escalaciones pendientes</h3>
            <button
              onClick={() => router.push('/agente/escalaciones')}
              className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {pendingEscalations.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">Sin escalaciones pendientes</p>
              </div>
            ) : (
              pendingEscalations.map((esc) => (
                <div
                  key={esc.id}
                  onClick={() => router.push('/agente/escalaciones')}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {escalationReasonLabels[esc.escalation_reason] ?? esc.escalation_reason}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: esc.priority === 'urgent' ? '#DC262618' : esc.priority === 'high' ? '#EF444418' : '#F59E0B18',
                        color: esc.priority === 'urgent' ? '#DC2626' : esc.priority === 'high' ? '#EF4444' : '#F59E0B',
                      }}
                    >
                      {escalationPriorityLabels[esc.priority]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                    <span>{formatPhone(esc.customer_phone)}</span>
                    <span>·</span>
                    <span>{formatTime(esc.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Credits Dashboard Widget — solo si tiene permiso financiero */}
      {hasPermission('can_view_finance_daily') && (
        <CreditsDashboardWidget />
      )}
    </div>
  );
}
