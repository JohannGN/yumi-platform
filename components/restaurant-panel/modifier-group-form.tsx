// ============================================================
// ModifierGroupForm — Modal to create/edit a modifier group
// ============================================================
// FILE: components/restaurant-panel/modifier-group-form.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface ModifierGroup {
  id: string;
  menu_item_id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  display_order: number;
  item_modifiers?: any[];
}

interface ModifierGroupFormProps {
  open: boolean;
  menuItemId: string;
  editingGroup?: ModifierGroup | null;
  onSave: (data: {
    menu_item_id: string;
    name: string;
    is_required: boolean;
    min_selections: number;
    max_selections: number;
    id?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export function ModifierGroupForm({
  open,
  menuItemId,
  editingGroup,
  onSave,
  onClose,
}: ModifierGroupFormProps) {
  const [name, setName] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [minSelections, setMinSelections] = useState(0);
  const [maxSelections, setMaxSelections] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (editingGroup) {
        setName(editingGroup.name);
        setIsRequired(editingGroup.is_required);
        setMinSelections(editingGroup.min_selections);
        setMaxSelections(editingGroup.max_selections);
      } else {
        setName('');
        setIsRequired(false);
        setMinSelections(0);
        setMaxSelections(1);
      }
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, editingGroup]);

  // Auto-adjust min when toggling required
  useEffect(() => {
    if (isRequired && minSelections < 1) {
      setMinSelections(1);
    }
    if (!isRequired) {
      setMinSelections(0);
    }
  }, [isRequired]);

  // Keep min <= max
  useEffect(() => {
    if (minSelections > maxSelections) {
      setMaxSelections(minSelections);
    }
  }, [minSelections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;

    setError('');

    if (isRequired && minSelections < 1) {
      setError('Si es obligatorio, mínimo debe ser ≥ 1');
      return;
    }

    if (minSelections > maxSelections) {
      setError('Mínimo no puede ser mayor que máximo');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        menu_item_id: menuItemId,
        name: name.trim(),
        is_required: isRequired,
        min_selections: minSelections,
        max_selections: maxSelections,
        ...(editingGroup ? { id: editingGroup.id } : {}),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingGroup ? 'Editar grupo' : 'Nuevo grupo de modificadores'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del grupo
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='Ej: "Elige tus cremas", "Extras"'
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Required toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Obligatorio
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    El cliente debe elegir al menos una opcion
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isRequired}
                  onClick={() => setIsRequired(!isRequired)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    isRequired
                      ? 'bg-orange-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      isRequired ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Min/Max selections */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimo
                  </label>
                  <input
                    type="number"
                    min={isRequired ? 1 : 0}
                    max={99}
                    value={minSelections}
                    onChange={(e) => setMinSelections(Math.max(isRequired ? 1 : 0, parseInt(e.target.value) || 0))}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {isRequired ? 'Mín. 1 (obligatorio)' : 'Mín. 0 (opcional)'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Maximo
                  </label>
                  <input
                    type="number"
                    min={Math.max(1, minSelections)}
                    max={99}
                    value={maxSelections}
                    onChange={(e) => setMaxSelections(Math.max(minSelections, parseInt(e.target.value) || 1))}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 text-sm px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || saving}
                  className="flex-1 text-sm px-4 py-2.5 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </span>
                  ) : editingGroup ? (
                    'Guardar cambios'
                  ) : (
                    'Crear grupo'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
