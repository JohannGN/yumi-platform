'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'success' | 'danger';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'success',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const colors = {
    success: {
      icon: '🟢',
      button: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
    },
    danger: {
      icon: '🔴',
      button: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
    },
  };

  const c = colors[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={!isLoading ? onCancel : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div className="p-6 text-center">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1, damping: 15 }}
                className="inline-block text-4xl mb-3"
              >
                {c.icon}
              </motion.span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {message}
              </p>
            </div>

            <div className="flex border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 py-3.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <div className="w-px bg-gray-200 dark:bg-gray-800" />
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60 ${c.button}`}
              >
                {isLoading ? 'Procesando...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}