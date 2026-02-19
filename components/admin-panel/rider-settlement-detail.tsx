'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDateShort, formatDate } from '@/config/tokens';
import {
  RiderSettlement,
  SETTLEMENT_STATUS_CONFIG,
} from '@/types/settlement-types';

// ─── Types ─────────────────────────────────────────────────
interface OrderRow {
  id: string;
  code: string;
  delivery_fee_cents: number;
  rider_bonus_cents: number;
  actual_payment_method: string | null;
  payment_method: string;
  total_cents: number;
  delivered_at: string;
  customer_name: string;
}

// ─── KPI Card ──────────────────────────────────────────────
function KpiCard({ label, value, sub, note, color = 'gray' }: {
  label: string; value: string; sub?: string; note?: string;
  color?: 'gray' | 'orange' | 'green' | 'blue' | 'red';
}) {
  const bg = {
    gray:   'bg-gray-50 dark:bg-gray-800/60',
    orange: 'bg-orange-50 dark:bg-orange-900/20',
    green:  'bg-green-50 dark:bg-green-900/20',
    blue:   'bg-blue-50 dark:bg-blue-900/20',
    red:    'bg-red-50 dark:bg-red-900/20',
  };
  return (
    <div className={`rounded-xl p-3 ${bg[color]}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-tight">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
      {sub  && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      {note && <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">{note}</p>}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="grid grid-cols-2 gap-3">
        {[0,1,2,3].map(i => (
          <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
      <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 rounded bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}

// ─── Confirm Modal ─────────────────────────────────────────
function ConfirmModal({
  title, message, amount, confirmLabel, confirmClass, onConfirm, onCancel, loading,
}: {
  title: string; message: string; amount?: string;
  confirmLabel: string; confirmClass?: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl">
      <div className="w-80 rounded-xl bg-white dark:bg-gray-900 shadow-2xl p-5 mx-4">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{message}</p>
        {amount && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-3 mb-4 text-center">
            <p className="text-xs text-green-700 dark:text-green-400">Neto a pagar al rider</p>
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
            className={`flex-[2] rounded-lg py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${confirmClass ?? 'bg-green-600 hover:bg-green-700'}`}
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
  onUpdate: (s: RiderSettlement) => void;
}

// ─── Main Component ────────────────────────────────────────
export function RiderSettlementDetail({ settlementId, onUpdate }: Props) {
  const [settlement, setSettlement]         = useState<RiderSettlement | null>(null);
  const [orders, setOrders]                 = useState<OrderRow[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [actionLoading, setActionLoading]   = useState(false);
  const [confirmMode, setConfirmMode]       = useState<'paid' | 'disputed' | null>(null);
  const [editFuel, setEditFuel]             = useState('');
  const [savingFuel, setSavingFuel]         = useState(false);
  const [fuelError, setFuelError]           = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/admin/settlements/riders/${settlementId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error');
      setSettlement(json.settlement);
      setOrders(json.orders ?? []);
      setEditFuel(((json.settlement.fuel_reimbursement_cents ?? 0) / 100).toFixed(2));
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
      const res  = await fetch(`/api/admin/settlements/riders/${settlement.id}`, {
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

  const saveFuel = async () => {
    if (!settlement) return;
    setSavingFuel(true);
    setFuelError('');
    try {
      const fuelCents = Math.round(parseFloat(editFuel || '0') * 100);
      const res = await fetch(`/api/admin/settlements/riders/${settlement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fuel_reimbursement_cents: fuelCents }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error');
      setSettlement(json.settlement);
      onUpdate(json.settlement);
    } catch (e) {
      setFuelError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSavingFuel(false);
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
  const rider     = settlement.rider;
  const riderName = rider?.user?.name ?? '—';
  const isCommission = rider?.pay_type === 'commission';

  // Pay method label
  const payTypeBadge = isCommission
    ? { label: 'Comisión', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' }
    : { label: 'Sueldo fijo', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' };

  return (
    <div className="relative h-full overflow-y-auto">
      {/* Overlays */}
      {confirmMode === 'paid' && (
        <ConfirmModal
          title="¿Marcar como pagado?"
          message="Esta acción es irreversible. Confirma que el rider recibió su pago."
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
          message="Se marcará como en disputa. Revisa los montos con el rider."
          confirmLabel="Marcar en disputa"
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={() => doAction('disputed')}
          onCancel={() => setConfirmMode(null)}
          loading={actionLoading}
        />
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{riderName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {formatDateShort(settlement.period_start)} – {formatDateShort(settlement.period_end)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${payTypeBadge.cls}`}>
              {payTypeBadge.label}
            </span>
          </div>
        </div>

        {/* KPI Cards - layout según pay_type */}
        {isCommission ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Entregas" value={String(settlement.total_deliveries)} color="gray" />
              <KpiCard
                label="Fees delivery"
                value={formatCurrency(settlement.delivery_fees_cents)}
                sub="Lo que paga YUMI al rider"
                color="blue"
              />
              <KpiCard label="Bonos" value={formatCurrency(settlement.bonuses_cents)} color="orange" />
              <KpiCard
                label="Reembolso combustible"
                value={formatCurrency(settlement.fuel_reimbursement_cents)}
                color="gray"
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <KpiCard
                label="Neto a pagar al rider"
                value={formatCurrency(settlement.net_payout_cents)}
                note="Fees + Bonos + Combustible"
                color="green"
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Entregas" value={String(settlement.total_deliveries)} color="gray" />
              <KpiCard
                label="Sueldo fijo"
                value={formatCurrency(rider?.fixed_salary_cents ?? 0)}
                color="blue"
              />
              <KpiCard label="Bonos" value={formatCurrency(settlement.bonuses_cents)} color="orange" />
              <KpiCard
                label="Reembolso combustible"
                value={formatCurrency(settlement.fuel_reimbursement_cents)}
                color="gray"
              />
            </div>
            <div className="grid grid-cols-1">
              <KpiCard
                label="Neto a pagar al rider"
                value={formatCurrency(settlement.net_payout_cents)}
                note="Sueldo + Bonos + Combustible"
                color="green"
              />
            </div>
          </>
        )}

        {/* Efectivo en manos del rider (info) */}
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Efectivo recaudado (ya en manos del rider)
          </p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-gray-500 dark:text-gray-500">Efectivo</p>
              <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {formatCurrency(settlement.cash_collected_cents)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-500">POS</p>
              <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {formatCurrency(settlement.pos_collected_cents)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-500">Yape/Plin</p>
              <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {formatCurrency(settlement.yape_plin_collected_cents)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            El efectivo no suma al pago de YUMI al rider — ya está en su poder.
          </p>
        </div>

        {/* Edit fuel (only if pending or disputed) */}
        {settlement.status !== 'paid' && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Ajustar reembolso combustible (S/)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.10"
                value={editFuel}
                onChange={e => setEditFuel(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={saveFuel}
                disabled={savingFuel}
                className="px-4 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-sm font-semibold text-white transition-colors"
              >
                {savingFuel ? '...' : 'Guardar'}
              </button>
            </div>
            {fuelError && <p className="text-xs text-red-500 mt-1">{fuelError}</p>}
          </div>
        )}

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
              Resolver y pagar
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
            Entregas del período ({orders.length})
          </p>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin entregas en este período</p>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="grid grid-cols-4 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <span>Código</span>
                <span>Fecha</span>
                <span className="text-right">Fee</span>
                <span className="text-right">Bono</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
                {orders.map(o => (
                  <div key={o.id} className="grid grid-cols-4 px-3 py-2.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                      {o.code}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatDateShort(o.delivered_at)}
                    </span>
                    <span className="text-right text-gray-900 dark:text-gray-100">
                      {formatCurrency(o.delivery_fee_cents ?? 0)}
                    </span>
                    <span className="text-right text-orange-600 dark:text-orange-400">
                      {o.rider_bonus_cents ? formatCurrency(o.rider_bonus_cents) : '—'}
                    </span>
                  </div>
                ))}
              </div>
              {/* Totals */}
              <div className="grid grid-cols-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-3 py-2.5 text-xs font-bold">
                <span className="text-gray-700 dark:text-gray-300 col-span-2">Total</span>
                <span className="text-right text-gray-900 dark:text-gray-100">
                  {formatCurrency(settlement.delivery_fees_cents)}
                </span>
                <span className="text-right text-orange-600 dark:text-orange-400">
                  {formatCurrency(settlement.bonuses_cents)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
