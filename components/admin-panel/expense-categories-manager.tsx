'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ToggleLeft, ToggleRight, Pencil, Trash2, AlertTriangle, Loader2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExpenseCategoryForm } from './expense-category-form';
import type { ExpenseCategory } from '@/types/expenses';

export function ExpenseCategoriesManager() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/expense-categories?all=true');
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleToggleActive = async (cat: ExpenseCategory) => {
    setTogglingId(cat.id);
    try {
      const res = await fetch(`/api/admin/expense-categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !cat.is_active }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, is_active: !c.is_active } : c))
        );
      }
    } catch (err) {
      console.error('Error toggling category:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (catId: string) => {
    setDeletingId(catId);
    try {
      const res = await fetch(`/api/admin/expense-categories/${catId}`, { method: 'DELETE' });
      if (res.ok) {
        // Could be soft delete (is_active=false) or hard delete
        // Either way, refresh the list
        await fetchCategories();
        setConfirmDeleteId(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Error al eliminar');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormClose = (saved?: boolean) => {
    setShowForm(false);
    setEditingCategory(null);
    if (saved) fetchCategories();
  };

  const handleEdit = (cat: ExpenseCategory) => {
    setEditingCategory(cat);
    setShowForm(true);
  };

  // Separate active and inactive
  const activeCategories = categories.filter((c) => c.is_active);
  const inactiveCategories = categories.filter((c) => !c.is_active);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Categorías de egresos
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {categories.length} categoría{categories.length !== 1 ? 's' : ''} ({activeCategories.length} activa{activeCategories.length !== 1 ? 's' : ''})
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium text-white"
          style={{ backgroundColor: '#FF6B35' }}
        >
          <Plus className="w-4 h-4" />
          Nueva categoría
        </button>
      </div>

      {/* Categories list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/50">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))
        ) : categories.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
            No hay categorías creadas
          </div>
        ) : (
          <>
            {/* Active categories */}
            {activeCategories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                onToggle={() => handleToggleActive(cat)}
                onEdit={() => handleEdit(cat)}
                onDelete={() => setConfirmDeleteId(cat.id)}
                toggling={togglingId === cat.id}
                confirmDelete={confirmDeleteId === cat.id}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={() => handleDelete(cat.id)}
                deleting={deletingId === cat.id}
              />
            ))}

            {/* Inactive categories */}
            {inactiveCategories.length > 0 && (
              <>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Inactivas
                  </p>
                </div>
                {inactiveCategories.map((cat) => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    onToggle={() => handleToggleActive(cat)}
                    onEdit={() => handleEdit(cat)}
                    onDelete={() => setConfirmDeleteId(cat.id)}
                    toggling={togglingId === cat.id}
                    confirmDelete={confirmDeleteId === cat.id}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                    onConfirmDelete={() => handleDelete(cat.id)}
                    deleting={deletingId === cat.id}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <ExpenseCategoryForm
          category={editingCategory}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}

// Row sub-component
interface CategoryRowProps {
  category: ExpenseCategory;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  toggling: boolean;
  confirmDelete: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  deleting: boolean;
}

function CategoryRow({
  category,
  onToggle,
  onEdit,
  onDelete,
  toggling,
  confirmDelete,
  onCancelDelete,
  onConfirmDelete,
  deleting,
}: CategoryRowProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${
      !category.is_active ? 'opacity-50' : ''
    }`}>
      {/* Icon */}
      <div className="flex items-center justify-center w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg text-lg flex-shrink-0">
        {category.icon || '📦'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {category.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {category.slug}
        </p>
      </div>

      {/* Actions */}
      <AnimatePresence mode="wait">
        {confirmDelete ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
            <span className="text-xs text-gray-600 dark:text-gray-400">¿Eliminar?</span>
            <button
              onClick={onCancelDelete}
              disabled={deleting}
              className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              No
            </button>
            <button
              onClick={onConfirmDelete}
              disabled={deleting}
              className="px-2 py-1 text-xs rounded text-white font-medium flex items-center gap-1"
              style={{ backgroundColor: '#EF4444' }}
            >
              {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
              Sí
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1"
          >
            {/* Toggle */}
            <button
              onClick={onToggle}
              disabled={toggling}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={category.is_active ? 'Desactivar' : 'Activar'}
            >
              {category.is_active ? (
                <ToggleRight className="w-5 h-5" style={{ color: '#22C55E' }} />
              ) : (
                <ToggleLeft className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Edit */}
            <button
              onClick={onEdit}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Editar"
            >
              <Pencil className="w-4 h-4 text-gray-500" />
            </button>

            {/* Delete */}
            <button
              onClick={onDelete}
              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
