'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';
import { orderStatusLabels } from '@/config/design-tokens';

interface Props {
  orderId: string;
  orderCode: string;
  orderStatus: string;
  onCancel: () => void;
  onClose: () => void;
}

const ADVANCED_STATUSES = ['preparing', 'ready', 'assigned_rider'];

export function AgentOrderCancelDialog({ orderId, orderCode, orderStatus, onCancel, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdvanced = ADVANCED_STATUSES.includes(orderStatus);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Escribe el motivo de cancelación');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/agent/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (res.ok) {
        onCancel();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al cancelar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cancelar pedido</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Order info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">{orderCode}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {orderStatusLabels[orderStatus] ?? orderStatus}
            </span>
          </div>

          {/* Warning for advanced statuses */}
          {isAdvanced ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Este pedido ya está en estado avanzado ({orderStatusLabels[orderStatus]}). Cancelar podría afectar al restaurante y al rider asignado.
              </p>
            </div>
          ) : null}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Motivo de cancelación <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe el motivo de la cancelación..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none placeholder:text-gray-400"
              autoFocus
            />
          </div>

          {/* Error */}
          {error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : null}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              No cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !reason.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              Cancelar pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
