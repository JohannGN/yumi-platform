'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDateShort, formatDate } from '@/config/tokens';
import {
  RestaurantSettlement,
  SETTLEMENT_STATUS_CONFIG,
} from '@/types/settlement-types';

// ─── Types ─────────────────────────────────────────────────
interface OrderRow {
  id: string;
  code: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  delivered_at: string;
  payment_method: string;
  status: string;
}

// ─── KPI Card ──────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'gray' }: {
  label: string; value: string; sub?: string;
  color?: 'gray' | 'orange' | 'green' | 'red';
}) {
  const colors = {
    gray:   'bg-gray-50 dark:bg-gray-800/60',
    orange: 'bg-orange-50 dark:bg-orange-900/20',
    green:  'bg-green-50 dark:bg-green-900/20',
    red:    'bg-red-50 dark:bg-red-900/20',
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="grid grid-cols-3 gap-3">
        {[0,1,2].map(i => (
          <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 rounded bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}

// ─── Confirm Modal ─────────────────────────────────────────
function ConfirmModal({
  title, message, amount, confirmLabel, onConfirm, onCancel, loading,
}: {
  title: string; message: string; amount?: string;
  confirmLabel: string; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl">
      <div className="w-80 rounded-xl bg-white dark:bg-gray-900 shadow-2xl p-5 mx-4">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{message}</p>
        {amount && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-3 mb-4 text-center">
            <p className="text-xs text-green-700 dark:text-green-400">Monto a pagar</p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-300">{amount}</p>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-[2] rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 py-2 text-sm font-semibold text-white transition-colors"
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────
interface Props {
  settlementId: string;
  onUpdate: (s: RestaurantSettlement) => void;
}

// ─── Main Component ────────────────────────────────────────
export function RestaurantSettlementDetail({ settlementId, onUpdate }: Props) {
  const [settlement, setSettlement] = useState<RestaurantSettlement | null>(null);
  const [orders, setOrders]         = useState<OrderRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmMode, setConfirmMode]     = useState<'paid' | 'disputed' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/admin/settlements/restaurants/${settlementId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error');
      setSettlement(json.settlement);
      setOrders(json.orders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [settlementId]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (status: 'paid' | 'disputed' | 'pending') => {
    if (!settlement) return;
    setActionLoading(true);
    try {
      const res  = await fetch(`/api/admin/settlements/restaurants/${settlement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error');
      setSettlement(json.settlement);
      onUpdate(json.settlement);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(false);
      setConfirmMode(null);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (error)   return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={load} className="text-xs text-orange-500 hover:underline">Reintentar</button>
    </div>
  );
  if (!settlement) return null;

  const statusCfg = SETTLEMENT_STATUS_CONFIG[settlement.status];

  return (
    <div className="relative h-full overflow-y-auto">
      {/* Confirm overlay */}
      {confirmMode === 'paid' && (
        <ConfirmModal
          title="¿Marcar como pagado?"
          message="Esta acción es irreversible. Una vez marcado como pagado, no se puede deshacer."
          amount={formatCurrency(settlement.net_payout_cents)}
          confirmLabel="Confirmar pago"
          onConfirm={() => doAction('paid')}
          onCancel={() => setConfirmMode(null)}
          loading={actionLoading}
        />
      )}
      {confirmMode === 'disputed' && (
        <ConfirmModal
          title="¿Marcar como en disputa?"
          message="Se marcará esta liquidación como disputada. Podrás resolverla más adelante."
          confirmLabel="Marcar en disputa"
          onConfirm={() => doAction('disputed')}
          onCancel={() => setConfirmMode(null)}
          loading={actionLoading}
        />
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {settlement.restaurant?.name ?? '—'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {formatDateShort(settlement.period_start)} – {formatDateShort(settlement.period_end)}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard
            label="Ventas brutas"
            value={formatCurrency(settlement.gross_sales_cents)}
            sub={`${settlement.total_orders} pedidos`}
            color="gray"
          />
          <KpiCard
            label={`Comisión YUMI (${settlement.restaurant?.commission_percentage ?? 0}%)`}
            value={formatCurrency(settlement.commission_cents)}
            color="orange"
          />
          <KpiCard
            label="Neto a pagar"
            value={formatCurrency(settlement.net_payout_cents)}
            sub={settlement.paid_at ? `Pagado ${formatDateShort(settlement.paid_at)}` : undefined}
            color="green"
          />
        </div>

        {/* Action buttons */}
        {settlement.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmMode('paid')}
              className="flex-[2] rounded-xl bg-green-600 hover:bg-green-700 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              ✓ Marcar como pagado
            </button>
            <button
              onClick={() => setConfirmMode('disputed')}
              className="flex-1 rounded-xl border border-red-300 dark:border-red-700 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Disputar
            </button>
          </div>
        )}
        {settlement.status === 'paid' && (
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 flex items-center gap-2">
            <span className="text-green-600 dark:text-green-400">✓</span>
            <p className="text-sm text-green-700 dark:text-green-400">
              Pagado el {formatDate(settlement.paid_at!)}
            </p>
          </div>
        )}
        {settlement.status === 'disputed' && (
          <div className="flex gap-2">
            <button
              onClick={() => doAction('pending')}
              disabled={actionLoading}
              className="flex-1 rounded-xl border border-amber-300 dark:border-amber-700 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
            >
              Volver a pendiente
            </button>
            <button
              onClick={() => setConfirmMode('paid')}
              className="flex-[2] rounded-xl bg-green-600 hover:bg-green-700 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Resolver y marcar pagado
            </button>
          </div>
        )}

        {/* Notes */}
        {settlement.notes && (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notas</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{settlement.notes}</p>
          </div>
        )}

        {/* Orders table */}
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Pedidos del período ({orders.length})
          </p>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin pedidos en este período</p>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="grid grid-cols-4 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <span>Código</span>
                <span>Fecha</span>
                <span className="text-right">Subtotal</span>
                <span className="text-right">Comisión</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
                {orders.map(o => {
                  const commission = Math.round(
                    (o.subtotal_cents ?? 0) * (settlement.restaurant?.commission_percentage ?? 0) / 100
                  );
                  return (
                    <div key={o.id} className="grid grid-cols-4 px-3 py-2.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                        {o.code}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatDateShort(o.delivered_at)}
                      </span>
                      <span className="text-right text-gray-900 dark:text-gray-100">
                        {formatCurrency(o.subtotal_cents ?? 0)}
                      </span>
                      <span className="text-right text-orange-600 dark:text-orange-400">
                        {formatCurrency(commission)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Totals */}
              <div className="grid grid-cols-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-3 py-2.5 text-xs font-bold">
                <span className="text-gray-700 dark:text-gray-300 col-span-2">Total</span>
                <span className="text-right text-gray-900 dark:text-gray-100">
                  {formatCurrency(settlement.gross_sales_cents)}
                </span>
                <span className="text-right text-orange-600 dark:text-orange-400">
                  {formatCurrency(settlement.commission_cents)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
