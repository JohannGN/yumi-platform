'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronUp, ChevronDown, Pencil, Trash2, Eye, EyeOff,
  Tag, Loader2, GripVertical, Save, Plus,
} from 'lucide-react';
import { AdminCategory } from '@/types/admin-panel';

interface CategoriesListProps {
  onEditClick: (category: AdminCategory) => void;
  onCreateClick: () => void;
}

export default function CategoriesList({ onEditClick, onCreateClick }: CategoriesListProps) {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/categories');
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
    }
    setLoading(false);
    setDirty(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newCats = [...categories];
    [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
    setCategories(newCats);
    setDirty(true);
  };

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const newCats = [...categories];
    [newCats[index], newCats[index + 1]] = [newCats[index + 1], newCats[index]];
    setCategories(newCats);
    setDirty(true);
  };

  const handleSaveOrder = async () => {
    setReordering(true);
    const order = categories.map((c, i) => ({ id: c.id, display_order: i + 1 }));
    const res = await fetch('/api/admin/categories/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
    if (res.ok) setDirty(false);
    setReordering(false);
  };

  const handleToggleVisible = async (category: AdminCategory) => {
    setTogglingId(category.id);
    await fetch(`/api/admin/categories?id=${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: !category.is_visible }),
    });
    setCategories(cats => cats.map(c => c.id === category.id ? { ...c, is_visible: !c.is_visible } : c));
    setTogglingId(null);
  };

  const handleDelete = async (category: AdminCategory) => {
    if (category.restaurant_count > 0) {
      alert(`No se puede eliminar: tiene ${category.restaurant_count} restaurante(s) vinculado(s)`);
      return;
    }
    if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return;
    setDeletingId(category.id);
    const res = await fetch(`/api/admin/categories?id=${category.id}`, { method: 'DELETE' });
    if (res.ok) {
      setCategories(cats => cats.filter(c => c.id !== category.id));
    } else {
      const data = await res.json();
      alert(data.error ?? 'Error al eliminar');
    }
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Categorías</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {categories.length} categorías · Arrastra o usa flechas para reordenar
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <button
              onClick={handleSaveOrder}
              disabled={reordering}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {reordering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar orden
            </button>
          )}
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva categoría
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className={`group flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  category.is_visible
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50 opacity-60'
                }`}
              >
                {/* Drag handle visual */}
                <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />

                {/* Order number */}
                <span className="text-xs font-mono text-gray-400 w-6 text-center shrink-0">{index + 1}</span>

                {/* Emoji */}
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl shrink-0">
                  {category.emoji ?? <Tag className="w-5 h-5 text-gray-400" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{category.name}</span>
                    {!category.is_visible && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 rounded-full">Oculta</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-gray-400">/{category.slug}</span>
                    {category.restaurant_count > 0 && (
                      <span className="text-xs text-gray-400">· {category.restaurant_count} restaurante{category.restaurant_count !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Reorder arrows */}
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-20 transition-colors"
                    title="Subir"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === categories.length - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-20 transition-colors"
                    title="Bajar"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Toggle visible */}
                  <button
                    onClick={() => handleToggleVisible(category)}
                    disabled={togglingId === category.id}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title={category.is_visible ? 'Ocultar' : 'Mostrar'}
                  >
                    {togglingId === category.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : category.is_visible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => onEditClick(category)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(category)}
                    disabled={deletingId === category.id || category.restaurant_count > 0}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-30 transition-colors"
                    title={category.restaurant_count > 0 ? 'Tiene restaurantes vinculados' : 'Eliminar'}
                  >
                    {deletingId === category.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Always-visible restaurant count badge */}
                <div className="shrink-0 ml-1">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    category.restaurant_count > 0
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                  }`}>
                    {category.restaurant_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {dirty && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-700 dark:text-amber-400 text-center">
            Tienes cambios sin guardar — haz clic en &quot;Guardar orden&quot;
          </div>
        )}
      </div>
    </div>
  );
}
