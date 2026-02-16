'use client';

// ============================================================
// Reject Order Modal — Select reason + optional notes
// Chat 5 — Fragment 3/7
// ============================================================

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { rejectionReasonLabels } from '@/config/tokens';

const REJECTION_REASONS = [
  { value: 'item_out_of_stock', emoji: '📦' },
  { value: 'closing_soon', emoji: '🕐' },
  { value: 'kitchen_issue', emoji: '🔧' },
  { value: 'other', emoji: '💬' },
];

interface RejectOrderModalProps {
  isOpen: boolean;
  orderCode: string;
  onConfirm: (reason: string, notes: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RejectOrderModal({
  isOpen,
  orderCode,
  onConfirm,
  onCancel,
  isLoading,
}: RejectOrderModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setNotes('');
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  if (typeof window === 'undefined') return null;

  const codeFormatted = orderCode
    ? `${orderCode.slice(0, 3)}-${orderCode.slice(3)}`
    : '';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Rechazar pedido {codeFormatted}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Selecciona el motivo del rechazo
              </p>
            </div>

            {/* Reasons */}
            <div className="px-5 space-y-2">
              {REJECTION_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 transition-all text-left ${
                    reason === r.value
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">{r.emoji}</span>
                  <span className={`text-sm font-medium ${
                    reason === r.value
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {rejectionReasonLabels[r.value]}
                  </span>
                </button>
              ))}
            </div>

            {/* Notes (required for "other") */}
            {reason === 'other' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="px-5 mt-3"
              >
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Escribe el motivo..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                />
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-3 px-5 py-4 mt-2">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => onConfirm(reason, notes)}
                disabled={!reason || (reason === 'other' && !notes.trim()) || isLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Rechazando...' : 'Rechazar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
