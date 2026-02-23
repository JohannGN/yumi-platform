'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  List,
  Map,
  RefreshCw,
  Phone,
  Star,
  Truck,
  Circle,
} from 'lucide-react';
import { useAgent } from '@/components/agent-panel/agent-context';
import { AgentRiderMap } from '@/components/agent-panel/agent-rider-map';
import { RiderCreditBadge } from '@/components/agent-panel/rider-credit-badge';
import { createClient } from '@/lib/supabase/client';
import {
  formatPhone,
  vehicleTypeLabels,
  riderPayTypeLabels,
  colors,
} from '@/config/design-tokens';
import type { AgentRider } from '@/types/agent-panel';

type ViewMode = 'map' | 'list';

interface RiderCredit {
  rider_id: string;
  balance_cents: number;
}

export default function AgentRidersPage() {
  const { activeCityId, loading: agentLoading, hasPermission } = useAgent();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [riders, setRiders] = useState<AgentRider[]>([]);
  const [creditsMap, setCreditsMap] = useState<globalThis.Map<string, number>>(new globalThis.Map());
  const [loadingList, setLoadingList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRidersAndCredits = useCallback(async () => {
    if (!activeCityId) return;
    setLoadingList(true);
    try {
      // Parallel fetch: riders API + credits from Supabase
      const [ridersRes, creditsData] = await Promise.all([
        fetch('/api/agent/riders'),
        (async () => {
          const supabase = createClient();
          const { data } = await supabase
            .from('rider_credits')
            .select('rider_id, balance_cents');
          return (data ?? []) as RiderCredit[];
        })(),
      ]);

      if (ridersRes.ok) {
        const json = await ridersRes.json();
        // API may return array or { riders: [] } or { data: [] }
        const list: AgentRider[] = Array.isArray(json)
          ? json
          : (json.riders ?? json.data ?? []);
        setRiders(list);
      }

      const map = new globalThis.Map<string, number>();
      creditsData.forEach((c) => map.set(c.rider_id, c.balance_cents));
      setCreditsMap(map);
    } catch (err) {
      console.error('AgentRidersPage: fetch error', err);
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, [activeCityId]);

  // Fetch when switching to list or on manual refresh
  useEffect(() => {
    if (viewMode === 'list' && activeCityId) {
      fetchRidersAndCredits();
    }
  }, [viewMode, activeCityId, fetchRidersAndCredits]);

  // ─── Guards ─────────────────────────────────────────────

  if (agentLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-[400px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!hasPermission('can_view_riders')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <MapPin className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-sm font-medium">Sin permiso</p>
        <p className="text-xs mt-1">No tienes acceso para ver riders</p>
      </div>
    );
  }

  if (!activeCityId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <MapPin className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-sm">Selecciona una ciudad para ver riders</p>
      </div>
    );
  }

  // ─── Sort riders: critical credit first ─────────────────

  const sortedRiders = [...riders].sort((a, b) => {
    const aComm = a.pay_type === 'commission';
    const bComm = b.pay_type === 'commission';

    // Commission riders first, sorted by balance ascending (critical first)
    if (aComm && bComm) {
      const aBal = creditsMap.get(a.id) ?? Infinity;
      const bBal = creditsMap.get(b.id) ?? Infinity;
      return aBal - bBal;
    }
    if (aComm && !bComm) return -1;
    if (!aComm && bComm) return 1;

    // Both fixed → online first, then by name
    if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // ─── Stats pills ────────────────────────────────────────

  const onlineCount = riders.filter((r) => r.is_online).length;
  const busyCount = riders.filter((r) => r.is_online && r.current_order_id).length;
  const availableCount = riders.filter((r) => r.is_online && r.is_available && !r.current_order_id).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Riders</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatPill color="green" label={`${onlineCount} online`} />
            <StatPill color="yellow" label={`${busyCount} con pedido`} />
            <StatPill color="emerald" label={`${availableCount} disponibles`} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                viewMode === 'map'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Mapa
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                viewMode === 'list'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>

          {viewMode === 'list' && (
            <button
              onClick={() => { setRefreshing(true); fetchRidersAndCredits(); }}
              disabled={loadingList}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'map' ? (
        <AgentRiderMap />
      ) : (
        <RiderListView
          riders={sortedRiders}
          creditsMap={creditsMap}
          loading={loadingList}
        />
      )}
    </div>
  );
}

// ─── Rider List View ──────────────────────────────────────

function RiderListView({
  riders,
  creditsMap,
  loading,
}: {
  riders: AgentRider[];
  creditsMap: globalThis.Map<string, number>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (riders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Truck className="w-10 h-10 mb-2 text-gray-300 dark:text-gray-600" />
        <p className="text-sm">No hay riders registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {riders.map((rider) => {
        const balance = creditsMap.get(rider.id);
        const statusColor = rider.is_online
          ? rider.current_order_id
            ? colors.riderStatus.busy
            : colors.riderStatus.available
          : colors.riderStatus.offline;
        const statusLabel = rider.is_online
          ? rider.current_order_id
            ? 'Con pedido'
            : 'Disponible'
          : 'Offline';

        return (
          <div
            key={rider.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            {/* Status dot + avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Truck className="w-5 h-5 text-gray-400" />
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900"
                style={{ backgroundColor: statusColor }}
                title={statusLabel}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {rider.name}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {vehicleTypeLabels[rider.vehicle_type] ?? rider.vehicle_type}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {riderPayTypeLabels[rider.pay_type] ?? rider.pay_type}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                {rider.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {formatPhone(rider.phone)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400" />
                  {rider.avg_rating.toFixed(1)}
                </span>
                <span>{rider.total_deliveries} entregas</span>
                {rider.current_order_code && (
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    #{rider.current_order_code}
                  </span>
                )}
              </div>
            </div>

            {/* Credit badge (commission only) */}
            <div className="flex-shrink-0">
              {rider.pay_type === 'commission' && typeof balance === 'number' ? (
                <RiderCreditBadge
                  balanceCents={balance}
                  payType={rider.pay_type}
                  compact
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────

function StatPill({ color, label }: { color: string; label: string }) {
  const styles: Record<string, string> = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[color] ?? styles.green}`}>
      {label}
    </span>
  );
}
