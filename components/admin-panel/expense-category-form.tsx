'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { logAuditAction } from '@/lib/utils/audit';
import type { ExpenseCategory } from '@/types/expenses';

const COMMON_EMOJIS = ['⛽', '🏢', '📢', '📋', '🛡️', '🔧', '⚙️', '⚠️', '📦', '🚗', '💰', '📱', '🍔', '💊', '🧹', '🎯', '📊', '🔑'];

interface ExpenseCategoryFormProps {
  category: ExpenseCategory | null;
  onClose: (saved?: boolean) => void;
}

export function ExpenseCategoryForm({ category, onClose }: ExpenseCategoryFormProps) {
  const isEditing = !!category;
  const supabase = createClient();

  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (isEditing) {
        const res = await fetch(`/api/admin/expense-categories/${category!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            icon: icon || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al actualizar');
        }

        // Audit
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          logAuditAction(supabase, user.id, 'update', 'expense_category', category!.id, { name: name.trim() });
        }
      } else {
        const res = await fetch('/api/admin/expense-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            icon: icon || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al crear');
        }

        const created = await res.json();

        // Audit
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          logAuditAction(supabase, user.id, 'create', 'expense_category', created.id, { name: name.trim() });
        }
      }

      onClose(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={() => onClose()}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-[400px] bg-white dark:bg-gray-800 rounded-xl shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button
            onClick={() => onClose()}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="p-2.5 rounded-md text-sm" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Combustible"
              autoFocus
              className="w-full h-10 px-3 rounded-md border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ícono (emoji)
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Ej: ⛽"
              maxLength={4}
              className="w-full h-10 px-3 rounded-md border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            {/* Quick emoji picker */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-base transition-colors ${
                    icon === emoji
                      ? 'bg-orange-100 dark:bg-orange-900/30 ring-2 ring-orange-400'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-center w-9 h-9 bg-white dark:bg-gray-600 rounded-lg text-lg shadow-sm">
              {icon || '📦'}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {name || 'Sin nombre'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onClose()}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#FF6B35' }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
