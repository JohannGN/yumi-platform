'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/config/tokens';
import {
  SettlementPreview,
  RestaurantSettlement,
  RiderSettlement,
} from '@/types/settlement-types';

interface Props {
  type: 'restaurant' | 'rider';
  onSuccess: (settlement: RestaurantSettlement | RiderSettlement) => void;
  onClose: () => void;
}

interface SelectOption { id: string; label: string }

// ─── Helpers ────────────────────────────────────────────────
function getMonthRange(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = `${yearMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function getCurrentYearMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ─── Component ──────────────────────────────────────────────
export function CreateSettlementForm({ type, onSuccess, onClose }: Props) {
  const supabase = createClient();

  // Entity selection
  const [options, setOptions]       = useState<SelectOption[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [optsFetched, setOptsFetched] = useState(false);

  // Form fields
  const [yearMonth, setYearMonth]   = useState(getCurrentYearMonth());
  const [fuel, setFuel]             = useState(''); // only for riders

  // Preview
  const [preview, setPreview]       = useState<SettlementPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError]     = useState('');

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── Load options on focus ──────────────────────────────
  const loadOptions = useCallback(async () => {
    if (optsFetched) return;
    setLoadingOpts(true);
    try {
      if (type === 'restaurant') {
        const { data } = await supabase
          .from('restaurants')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        setOptions((data ?? []).map(r => ({ id: r.id, label: r.name })));
      } else {
        const { data } = await supabase
          .from('riders')
          .select('id, user:users(name)')
          .order('id');
        setOptions(
          (data ?? []).map(r => ({
            id: r.id,
            label: (r.user as { name?: string } | null)?.name ?? r.id,
          }))
        );
      }
      setOptsFetched(true);
    } finally {
      setLoadingOpts(false);
    }
  }, [type, optsFetched, supabase]);

  // ── Fetch preview ─────────────────────────────────────
  const fetchPreview = useCallback(async (entityId: string, ym: string, fuelValue: string) => {
    if (!entityId || !ym) return;
    setLoadingPreview(true);
    setPreviewError('');
    setPreview(null);

    const { start, end } = getMonthRange(ym);
    const endpoint = `/api/admin/settlements/${type === 'restaurant' ? 'restaurants' : 'riders'}`;

    const body: Record<string, unknown> = {
      [`${type === 'restaurant' ? 'restaurant' : 'rider'}_id`]: entityId,
      period_start: start,
      period_end: end,
      dry_run: true,
    };
    if (type === 'rider' && fuelValue) {
      body.fuel_reimbursement_cents = Math.round(parseFloat(fuelValue) * 100);
    }

    try {
      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setPreviewError(json.error ?? 'Error al calcular preview');
      } else {
        setPreview(json.preview);
      }
    } catch {
      setPreviewError('Error de red');
    } finally {
      setLoadingPreview(false);
    }
  }, [type]);

  // ── Handlers ─────────────────────────────────────────
  const handleEntityChange = (id: string) => {
    setSelectedId(id);
    setPreview(null);
    if (id) fetchPreview(id, yearMonth, fuel);
  };

  const handleMonthChange = (ym: string) => {
    setYearMonth(ym);
    setPreview(null);
    if (selectedId) fetchPreview(selectedId, ym, fuel);
  };

  const handleFuelBlur = () => {
    if (selectedId) fetchPreview(selectedId, yearMonth, fuel);
  };

  // ── Submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setSubmitError('');

    const { start, end } = getMonthRange(yearMonth);
    const endpoint = `/api/admin/settlements/${type === 'restaurant' ? 'restaurants' : 'riders'}`;
    const body: Record<string, unknown> = {
      [`${type === 'restaurant' ? 'restaurant' : 'rider'}_id`]: selectedId,
      period_start: start,
      period_end: end,
    };
    if (type === 'rider' && fuel) {
      body.fuel_reimbursement_cents = Math.round(parseFloat(fuel) * 100);
    }

    try {
      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error ?? 'Error al crear liquidación');
      } else {
        onSuccess(json.settlement);
      }
    } catch {
      setSubmitError('Error de red');
    } finally {
      setSubmitting(false);
    }
  };

  const entityLabel = type === 'restaurant' ? 'Restaurante' : 'Rider';
  const { start: pStart, end: pEnd } = getMonthRange(yearMonth);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Nueva liquidación — {entityLabel}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Entity selector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {entityLabel}
            </label>
            <select
              value={selectedId}
              onChange={e => handleEntityChange(e.target.value)}
              onFocus={loadOptions}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">
                {loadingOpts ? 'Cargando...' : `Seleccionar ${entityLabel.toLowerCase()}`}
              </option>
              {options.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Month picker */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mes
            </label>
            <input
              type="month"
              value={yearMonth}
              onChange={e => handleMonthChange(e.target.value)}
              max={getCurrentYearMonth()}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Período: {pStart} – {pEnd}
            </p>
          </div>

          {/* Fuel (riders only) */}
          {type === 'rider' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reembolso combustible (S/)
              </label>
              <input
                type="number"
                min="0"
                step="0.10"
                placeholder="0.00"
                value={fuel}
                onChange={e => setFuel(e.target.value)}
                onBlur={handleFuelBlur}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          {/* Preview */}
          {loadingPreview && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 animate-pulse space-y-2">
              <div className="h-3 w-48 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          )}

          {previewError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-xs text-red-700 dark:text-red-400">{previewError}</p>
            </div>
          )}

          {preview && !previewError && (
            <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 space-y-2">
              <p className="text-xs font-semibold text-orange-800 dark:text-orange-300 uppercase tracking-wide">
                Preview
              </p>
              {type === 'restaurant' ? (
                <>
                  <Row label="Pedidos" value={String(preview.total_orders ?? 0)} />
                  <Row label="Ventas brutas" value={formatCurrency(preview.gross_sales_cents ?? 0)} />
                  <Row label={`Comisión YUMI (${preview.commission_percentage ?? 0}%)`} value={`-${formatCurrency(preview.commission_cents ?? 0)}`} />
                  <div className="border-t border-orange-200 dark:border-orange-700 pt-2 mt-2">
                    <Row label="Neto a pagar" value={formatCurrency(preview.net_payout_cents)} bold />
                  </div>
                </>
              ) : (
                <>
                  <Row label="Entregas" value={String(preview.total_deliveries ?? 0)} />
                  <Row label="Fees delivery" value={formatCurrency(preview.delivery_fees_cents ?? 0)} />
                  <Row label="Bonos" value={formatCurrency(preview.bonuses_cents ?? 0)} />
                  <Row label="Combustible" value={formatCurrency(preview.fuel_reimbursement_cents ?? 0)} />
                  <div className="border-t border-orange-200 dark:border-orange-700 pt-2 mt-2">
                    <Row label="Neto a pagar" value={formatCurrency(preview.net_payout_cents)} bold />
                  </div>
                </>
              )}
            </div>
          )}

          {submitError && (
            <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-200 dark:border-gray-700 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedId || !preview || submitting || !!previewError}
            className="flex-[2] rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed py-2 text-sm font-semibold text-white transition-colors"
          >
            {submitting ? 'Creando...' : 'Crear liquidación'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row helper ─────────────────────────────────────────────
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-orange-700 dark:text-orange-400">{label}</span>
      <span className={bold
        ? 'font-bold text-orange-900 dark:text-orange-200 text-sm'
        : 'font-medium text-orange-900 dark:text-orange-200'
      }>
        {value}
      </span>
    </div>
  );
}
