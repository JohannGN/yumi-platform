'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgent } from '@/components/agent-panel/agent-context';
import {
  creditThresholds,
  getCreditStatusColor,
  getCreditStatusLabel,
  formatCurrency,
} from '@/config/design-tokens';
import { motion, AnimatePresence } from 'framer-motion';

interface RiderBasic {
  id: string;
  name: string;
  pay_type: string;
  is_online: boolean;
  phone?: string;
  balance_cents?: number;
}

interface RiderDetail {
  rider: { id: string; name: string; pay_type: string; is_online: boolean };
  credits: { balance_cents: number; status: string; can_receive_cash_orders: boolean };
  shift_summary: {
    deliveries: number;
    total_food_debit_cents: number;
    total_commission_debit_cents: number;
    total_earned_delivery_cents: number;
    cash_collected_cents: number;
    digital_collected_cents: number;
  };
}

function sortByPriority(riders: RiderBasic[]): RiderBasic[] {
  const getPriority = (r: RiderBasic) => {
    const bal = r.balance_cents ?? 0;
    if (bal < creditThresholds.minimum_cents) return 0; // critical first
    if (bal < creditThresholds.warning_cents) return 1;
    return 2;
  };
  return [...riders].sort((a, b) => getPriority(a) - getPriority(b));
}

function timeSince(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  return `Hace ${Math.floor(diff / 3600)}h`;
}

export function RiderCreditMonitor() {
  const { activeCityId } = useAgent();

  const [riders, setRiders] = useState<RiderBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RiderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchRiders = useCallback(async () => {
    if (!activeCityId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agent/riders?city_id=${activeCityId}`);
      if (!res.ok) throw new Error('Error');
      const json = await res.json();
      const all = (json.data || json || []) as RiderBasic[];
      // #117: solo commission
      const commission = all.filter(r => r.pay_type === 'commission');
      setRiders(sortByPriority(commission));
      setLastRefresh(Date.now());
    } catch {
      setRiders([]);
    } finally {
      setLoading(false);
    }
  }, [activeCityId]);

  useEffect(() => { fetchRiders(); }, [fetchRiders]);

  const fetchDetail = async (riderId: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/agent/riders/${riderId}/credits`);
      if (!res.ok) throw new Error('Error');
      const json = await res.json();
      setDetail(json);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleExpand = (riderId: string) => {
    if (expandedId === riderId) {
      setExpandedId(null);
      setDetail(null);
    } else {
      setExpandedId(riderId);
      fetchDetail(riderId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Monitor riders comisión
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {timeSince(lastRefresh)}
          </span>
          <button
            onClick={fetchRiders}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Skeleton */}
      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : riders.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          No hay riders por comisión activos
        </div>
      ) : (
        <div className="grid gap-3">
          {riders.map(rider => {
            const balance = rider.balance_cents ?? 0;
            const statusColor = getCreditStatusColor(balance);
            const statusLabel = getCreditStatusLabel(balance);
            const isExpanded = expandedId === rider.id;

            return (
              <div key={rider.id}>
                <button
                  onClick={() => toggleExpand(rider.id)}
                  className="w-full text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-orange-300 dark:hover:border-orange-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Online dot */}
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: rider.is_online ? '#22C55E' : '#6B7280' }}
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {rider.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {rider.is_online ? 'En línea' : 'Desconectado'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums" style={{ color: statusColor }}>
                        {formatCurrency(balance)}
                      </p>
                      <p className="text-xs" style={{ color: statusColor }}>
                        {statusLabel}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Detalle expandido */}
                <AnimatePresence mode="wait">
                  {isExpanded ? (
                    <motion.div
                      key={`detail-${rider.id}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-2 mt-1 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 border-t-0 rounded-b-lg">
                        {detailLoading ? (
                          <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            ))}
                          </div>
                        ) : detail ? (
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Resumen del turno ({detail.shift_summary.deliveries} entregas)
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <DetailRow
                                label="Comida descontada"
                                value={formatCurrency(Math.abs(detail.shift_summary.total_food_debit_cents))}
                                color="#EF4444"
                              />
                              <DetailRow
                                label="Comisión YUMI"
                                value={formatCurrency(Math.abs(detail.shift_summary.total_commission_debit_cents))}
                                color="#EF4444"
                              />
                              <DetailRow
                                label="Ganado delivery"
                                value={formatCurrency(detail.shift_summary.total_earned_delivery_cents)}
                                color="#22C55E"
                              />
                              <DetailRow
                                label="Efectivo cobrado"
                                value={formatCurrency(detail.shift_summary.cash_collected_cents)}
                                color="#3B82F6"
                              />
                              <DetailRow
                                label="Digital cobrado"
                                value={formatCurrency(detail.shift_summary.digital_collected_cents)}
                                color="#8B5CF6"
                              />
                              <DetailRow
                                label="Puede recibir cash"
                                value={detail.credits.can_receive_cash_orders ? 'Sí' : 'No'}
                                color={detail.credits.can_receive_cash_orders ? '#22C55E' : '#EF4444'}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Error cargando detalle</p>
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center py-1 px-2 bg-white dark:bg-gray-800 rounded">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-semibold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}
