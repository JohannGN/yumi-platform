// ============================================================
// ModifierOptionForm — Inline form to create/edit a modifier option
// ============================================================
// FILE: components/restaurant-panel/modifier-option-form.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { ModifierOption } from './modifier-option-row';

interface ModifierOptionFormProps {
  groupId: string;
  editingOption?: ModifierOption | null;
  onSave: (data: {
    modifier_group_id: string;
    name: string;
    price_cents: number;
    is_default: boolean;
    is_available: boolean;
    id?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function ModifierOptionForm({
  groupId,
  editingOption,
  onSave,
  onCancel,
}: ModifierOptionFormProps) {
  const [name, setName] = useState(editingOption?.name || '');
  const [priceSoles, setPriceSoles] = useState(
    editingOption ? (editingOption.price_cents / 100).toFixed(2) : '0.00'
  );
  const [isDefault, setIsDefault] = useState(editingOption?.is_default || false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus name input on mount
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;

    const priceCents = Math.max(0, Math.round(parseFloat(priceSoles || '0') * 100));

    setSaving(true);
    try {
      await onSave({
        modifier_group_id: groupId,
        name: name.trim(),
        price_cents: priceCents,
        is_default: isDefault,
        is_available: editingOption?.is_available ?? true,
        ...(editingOption ? { id: editingOption.id } : {}),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="overflow-hidden"
    >
      <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
        <div className="flex gap-2">
          {/* Name */}
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la opción"
            className="flex-1 text-sm px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            required
          />
          {/* Price in soles */}
          <div className="relative w-28">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              S/
            </span>
            <input
              type="number"
              step="0.10"
              min="0"
              value={priceSoles}
              onChange={(e) => setPriceSoles(e.target.value)}
              className="w-full text-sm px-3 py-2 pl-7 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* Default toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            Pre-seleccionado
          </label>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {editingOption ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </motion.form>
  );
}
