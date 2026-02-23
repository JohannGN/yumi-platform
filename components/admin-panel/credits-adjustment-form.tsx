'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Check, Loader2, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '@/config/design-tokens';
import { createClient } from '@/lib/supabase/client';
import type { CreditEntityType } from '@/types/credit-types';

// ── Types ────────────────────────────────────────────────────
interface EntityOption {
  id: string;
  name: string;
}

// ── Component ────────────────────────────────────────────────
export function CreditsAdjustmentForm() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // Form state
  const [entityType, setEntityType] = useState<CreditEntityType>('rider');
  const [entityId, setEntityId] = useState('');
  const [amountSoles, setAmountSoles] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ new_balance_cents: number } | null>(null);
  const [error, setError] = useState('');

  // Entity options
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Check user role
  useEffect(() => {
    const checkRole = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoadingRole(false); return; }
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(data?.role ?? null);
      } catch {
        setUserRole(null);
      } finally {
        setLoadingRole(false);
      }
    };
    void checkRole();
  }, []);

  // Fetch entities based on type
  const fetchEntities = useCallback(async () => {
    setLoadingEntities(true);
    setEntityId('');
    try {
      if (entityType === 'rider') {
        const res = await fetch('/api/admin/riders');
        if (!res.ok) throw new Error('Error');
        const json = await res.json();
        const riders = (json.riders ?? json) as Array<{ id: string; name: string; pay_type: string }>;
        setEntities(
          riders
            .filter((r) => r.pay_type === 'commission')
            .map((r) => ({ id: r.id, name: r.name }))
        );
      } else {
        const res = await fetch('/api/admin/restaurants');
        if (!res.ok) throw new Error('Error');
        const json = await res.json();
        const restaurants = (json.restaurants ?? json) as Array<{ id: string; name: string }>;
        setEntities(restaurants.map((r) => ({ id: r.id, name: r.name })));
      }
    } catch {
      setEntities([]);
    } finally {
      setLoadingEntities(false);
    }
  }, [entityType]);

  useEffect(() => { void fetchEntities(); }, [fetchEntities]);

  // Derived values
  const amountCents = Math.round(parseFloat(amountSoles || '0') * 100);
  const isPositive = amountCents > 0;
  const isValid = entityId && amountCents !== 0 && !isNaN(amountCents) && notes.trim().length >= 10;

  // Submit
  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError('');
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/credits/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          amount_cents: amountCents,
          notes: notes.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Error al procesar ajuste');
      }
      const json = await res.json() as { new_balance_cents: number };
      setSuccess(json);
      setAmountSoles('');
      setNotes('');
      setEntityId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading role
  if (loadingRole) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Non-owner block
  if (userRole !== 'owner') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center text-center">
        <ShieldAlert className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Solo el owner puede realizar ajustes manuales
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Esta funcionalidad está restringida por seguridad
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-xl">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        Ajuste manual de créditos
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
        Los ajustes quedan registrados en el log de auditoría con tu nombre
      </p>

      {/* Warning */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-5 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Los ajustes manuales quedan registrados permanentemente. Usa esta función solo para correcciones justificadas.
        </p>
      </div>

      <div className="space-y-4">
        {/* Entity type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Tipo de entidad
          </label>
          <div className="flex gap-2">
            {(['rider', 'restaurant'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setEntityType(type)}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all
                  ${entityType === type
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }
                `}
              >
                {type === 'rider' ? 'Rider' : 'Restaurante'}
              </button>
            ))}
          </div>
        </div>

        {/* Entity selector */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {entityType === 'rider' ? 'Rider (solo comisión)' : 'Restaurante'}
          </label>
          <select
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            disabled={loadingEntities}
            className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
          >
            <option value="">
              {loadingEntities ? 'Cargando...' : 'Seleccionar...'}
            </option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Monto (S/) — positivo para agregar, negativo para quitar
          </label>
          <input
            type="number"
            step="0.01"
            value={amountSoles}
            onChange={(e) => setAmountSoles(e.target.value)}
            placeholder="Ej: 50.00 o -25.00"
            className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400"
          />
          {amountSoles && !isNaN(amountCents) && amountCents !== 0 && (
            <p className={`text-xs mt-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositive ? '+ Agregar' : '− Quitar'} {formatCurrency(Math.abs(amountCents))}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Notas (obligatorio, mín. 10 caracteres)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Razón del ajuste (ej: Corrección saldo inicial por error en recarga)"
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400 resize-none"
          />
          <p className="text-xs text-gray-400 mt-0.5">
            {notes.trim().length}/10 caracteres mínimo
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-300">
              Ajuste aplicado. Nuevo saldo: {formatCurrency(success.new_balance_cents)}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={() => void handleSubmit()}
          disabled={!isValid || submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Aplicar ajuste'
          )}
        </button>
      </div>
    </div>
  );
}
