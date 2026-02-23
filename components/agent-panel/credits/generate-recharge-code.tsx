'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgent } from '@/components/agent-panel/agent-context';
import { RechargeCodeResult } from './recharge-code-result';
import { formatCurrency } from '@/config/design-tokens';
import type { RechargeCode } from '@/types/credit-types';
import type { AgentRider } from '@/types/agent-panel';
import { Loader2, Coins } from 'lucide-react';

interface RiderOption {
  id: string;
  name: string;
  phone: string;
}

export function GenerateRechargeCode({ onGenerated }: { onGenerated?: () => void }) {
  const { activeCityId } = useAgent();

  // Form state
  const [amountText, setAmountText] = useState('');
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [notes, setNotes] = useState('');

  // Riders list
  const [riders, setRiders] = useState<RiderOption[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(true);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<RechargeCode | null>(null);
  const [selectedRiderPhone, setSelectedRiderPhone] = useState<string | null>(null);

  // Fetch commission riders
  const fetchRiders = useCallback(async () => {
    if (!activeCityId) return;
    setLoadingRiders(true);
    try {
      const res = await fetch(`/api/agent/riders?city_id=${activeCityId}`);
      if (!res.ok) throw new Error('Error al cargar riders');
      const data = await res.json();
      // Filter commission riders only
      const list: AgentRider[] = Array.isArray(data) ? data : data.data ?? [];
      const commissionRiders = list
        .filter((r) => r.pay_type === 'commission')
        .map((r) => ({ id: r.id, name: r.name, phone: r.phone }));
      setRiders(commissionRiders);
    } catch {
      setRiders([]);
    } finally {
      setLoadingRiders(false);
    }
  }, [activeCityId]);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  // Validation
  const amountCents = Math.round(parseFloat(amountText || '0') * 100);
  const isValidAmount = amountCents > 0 && amountCents <= 500000; // max S/5,000

  async function handleSubmit() {
    if (!isValidAmount || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { amount_cents: amountCents };
      if (selectedRiderId) body.intended_rider_id = selectedRiderId;
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch('/api/agent/recharge-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? 'Error al generar código');
      }

      const code: RechargeCode = await res.json();
      const rider = riders.find((r) => r.id === selectedRiderId);
      setSelectedRiderPhone(rider?.phone ?? null);
      setGeneratedCode(code);
      onGenerated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setGeneratedCode(null);
    setAmountText('');
    setSelectedRiderId('');
    setNotes('');
    setError(null);
    setSelectedRiderPhone(null);
  }

  // Show result after generation
  if (generatedCode) {
    const rider = riders.find((r) => r.id === selectedRiderId);
    return (
      <RechargeCodeResult
        code={generatedCode}
        riderName={rider?.name ?? null}
        riderPhone={selectedRiderPhone}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
          <Coins className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Generar código de recarga
        </h3>
      </div>

      <div className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Monto (S/)
          </label>
          <input
            type="number"
            step="0.10"
            min="1"
            max="5000"
            placeholder="100.00"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-colors"
          />
          {amountText && !isValidAmount && (
            <p className="text-xs text-red-500 mt-1">
              {amountCents <= 0 ? 'El monto debe ser mayor a 0' : 'Máximo S/ 5,000.00'}
            </p>
          )}
          {isValidAmount && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatCurrency(amountCents)}
            </p>
          )}
        </div>

        {/* Rider selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rider destino (opcional)
          </label>
          {loadingRiders ? (
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ) : (
            <select
              value={selectedRiderId}
              onChange={(e) => setSelectedRiderId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-colors"
            >
              <option value="">Cualquier rider (genérico)</option>
              {riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {selectedRiderId
              ? 'Solo este rider podrá canjear el código'
              : 'Cualquier rider de comisión puede canjearlo'}
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: Recarga lunes, pago en efectivo recibido"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-colors resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValidAmount || submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Coins className="w-4 h-4" />
              Generar código
            </>
          )}
        </button>
      </div>
    </div>
  );
}
