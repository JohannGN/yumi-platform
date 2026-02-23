'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgent } from '@/components/agent-panel/agent-context';
import { createClient } from '@/lib/supabase/client';
import {
  liquidationPaymentMethodLabels,
  formatCurrency,
} from '@/config/design-tokens';
import { motion, AnimatePresence } from 'framer-motion';

interface RestaurantOption {
  id: string;
  name: string;
  balance_cents: number;
}

export function LiquidateRestaurant({ onSuccess }: { onSuccess?: () => void }) {
  const { activeCityId } = useAgent();

  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [amountSoles, setAmountSoles] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('yape');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId);
  const amountCents = Math.round(parseFloat(amountSoles || '0') * 100);
  const proofHint = paymentMethod === 'cash'
    ? 'Documento firmado con huella del encargado'
    : 'Captura de pantalla del pago';

  // Fetch restaurants with credits
  const fetchRestaurants = useCallback(async () => {
    if (!activeCityId) return;
    setLoadingRestaurants(true);
    try {
      const res = await fetch(`/api/agent/restaurants?city_id=${activeCityId}`);
      if (!res.ok) throw new Error('Error cargando restaurantes');
      const json = await res.json();
      const list = (json.data || json || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        balance_cents: ((r as Record<string, Record<string, unknown>>).credits?.balance_cents as number) ?? 0,
      }));
      setRestaurants(list);
    } catch {
      setRestaurants([]);
    } finally {
      setLoadingRestaurants(false);
    }
  }, [activeCityId]);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  // Preview de imagen
  useEffect(() => {
    if (!proofFile) { setProofPreview(null); return; }
    const url = URL.createObjectURL(proofFile);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  const resetForm = () => {
    setSelectedRestaurantId('');
    setAmountSoles('');
    setPaymentMethod('yape');
    setProofFile(null);
    setNotes('');
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    // Validaciones
    if (!selectedRestaurantId) { setError('Selecciona un restaurante'); return; }
    if (amountCents <= 0) { setError('El monto debe ser mayor a 0'); return; }
    if (selectedRestaurant && amountCents > selectedRestaurant.balance_cents) {
      setError(`El monto excede el saldo disponible (${formatCurrency(selectedRestaurant.balance_cents)})`);
      return;
    }
    if (!proofFile) {
      setError(
        paymentMethod === 'cash'
          ? 'Adjunta foto del documento firmado con huella del encargado'
          : 'Adjunta captura de pantalla del pago'
      );
      return;
    }

    setSubmitting(true);
    try {
      let proof_url: string | null = null;

      // Upload foto si existe
      if (proofFile) {
        const supabase = createClient();
        const ext = proofFile.name.split('.').pop() || 'jpg';
        const path = `liquidations/${selectedRestaurantId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('yumi-evidence')
          .upload(path, proofFile, { contentType: proofFile.type });
        if (uploadErr) throw new Error('Error subiendo comprobante: ' + uploadErr.message);

        const { data: signedData } = await supabase.storage
          .from('yumi-evidence')
          .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 año
        proof_url = signedData?.signedUrl ?? null;
      }

      const res = await fetch('/api/agent/liquidations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: selectedRestaurantId,
          amount_cents: amountCents,
          payment_method: paymentMethod,
          proof_url,
          notes: notes.trim() || null,
        }),
      });

      if (res.status === 409) {
        setError('Ya existe una liquidación para este restaurante hoy. Intenta mañana.');
        return;
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error((errJson as { error?: string }).error || 'Error al crear liquidación');
      }

      setSuccess(true);
      resetForm();
      onSuccess?.();
      setTimeout(() => setSuccess(false), 4000);
      fetchRestaurants(); // Refresh saldos
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Nueva liquidación
      </h3>

      <div className="space-y-4">
        {/* Restaurante */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Restaurante
          </label>
          {loadingRestaurants ? (
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <select
              value={selectedRestaurantId}
              onChange={e => setSelectedRestaurantId(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Seleccionar restaurante...</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} — Saldo: {formatCurrency(r.balance_cents)}
                </option>
              ))}
            </select>
          )}
          <AnimatePresence mode="wait">
            {selectedRestaurant ? (
              <motion.p
                key="balance"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1 text-sm text-gray-500 dark:text-gray-400"
              >
                Saldo disponible: <span className="font-semibold">{formatCurrency(selectedRestaurant.balance_cents)}</span>
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Monto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Monto a liquidar (S/)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountSoles}
            onChange={e => setAmountSoles(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Método de pago */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Método de pago
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(liquidationPaymentMethodLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPaymentMethod(key)}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  paymentMethod === key
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-orange-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Foto comprobante */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Comprobante <span className="text-red-500">*</span>
            <span className="font-normal text-gray-400 dark:text-gray-500 ml-1">— {proofHint}</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setProofFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 dark:file:bg-orange-900/20 file:text-orange-600 dark:file:text-orange-400 hover:file:bg-orange-100 dark:hover:file:bg-orange-900/30 file:cursor-pointer"
          />
          <AnimatePresence mode="wait">
            {proofPreview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <img
                  src={proofPreview}
                  alt="Preview comprobante"
                  className="w-32 h-32 object-cover rounded-md border border-gray-300 dark:border-gray-600"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Liquidación diaria, pago por Yape..."
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        {/* Errores y éxito */}
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400"
            >
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-700 dark:text-green-400"
            >
              Liquidación registrada exitosamente
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Botón submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedRestaurantId || amountCents <= 0 || !proofFile}
          className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium rounded-md text-sm transition-colors disabled:cursor-not-allowed"
        >
          {submitting ? 'Procesando...' : 'Confirmar liquidación'}
        </button>
      </div>
    </div>
  );
}
