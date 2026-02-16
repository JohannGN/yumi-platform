// ============================================================
// ModifierOptionRow — Single option in a modifier group
// ============================================================
// FILE: components/restaurant-panel/modifier-option-row.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/config/tokens';
import { Pencil, Trash2 } from 'lucide-react';

export interface ModifierOption {
  id: string;
  modifier_group_id: string;
  name: string;
  price_cents: number;
  is_default: boolean;
  is_available: boolean;
  display_order: number;
}

interface ModifierOptionRowProps {
  option: ModifierOption;
  onToggleAvailable: (id: string, available: boolean) => Promise<void>;
  onEdit: (option: ModifierOption) => void;
  onDelete: (option: ModifierOption) => void;
}

export function ModifierOptionRow({
  option,
  onToggleAvailable,
  onEdit,
  onDelete,
}: ModifierOptionRowProps) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggleAvailable(option.id, !option.is_available);
    } finally {
      setToggling(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
        option.is_available
          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-60'
      }`}
    >
      {/* Toggle available */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={toggling}
        className="flex-shrink-0 text-lg"
        title={option.is_available ? 'Marcar como agotado' : 'Marcar como disponible'}
      >
        {toggling ? (
          <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
        ) : option.is_available ? (
          '✅'
        ) : (
          '❌'
        )}
      </button>

      {/* Name + default badge */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium ${
            option.is_available
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-400 dark:text-gray-500 line-through'
          }`}
        >
          {option.name}
        </span>
        {option.is_default && (
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            default
          </span>
        )}
      </div>

      {/* Price */}
      <span
        className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
          option.price_cents === 0
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {option.price_cents === 0 ? 'Gratis' : formatCurrency(option.price_cents)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onEdit(option)}
          className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
          title="Editar opción"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(option)}
          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
          title="Eliminar opción"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
