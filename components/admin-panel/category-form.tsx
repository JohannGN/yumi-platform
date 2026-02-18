'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Check, Tag } from 'lucide-react';
import { AdminCategory } from '@/types/admin-panel';

interface CategoryFormProps {
  category?: AdminCategory | null;
  onClose: () => void;
  onSaved: () => void;
}

const COMMON_EMOJIS = ['🍗', '🥡', '🍔', '🍕', '🥩', '🐟', '🍰', '🍦', '🥤', '🥗', '☕', '🍽️', '📦', '💊', '🛒', '🍺'];

export default function CategoryForm({ category, onClose, onSaved }: CategoryFormProps) {
  const isEdit = Boolean(category);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    emoji: category?.emoji ?? '',
    description: category?.description ?? '',
    is_visible: category?.is_visible ?? true,
  });

  // Auto-generar slug desde nombre (solo en creación)
  useEffect(() => {
    if (!isEdit && form.name) {
      const slug = form.name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setForm(f => ({ ...f, slug }));
    }
  }, [form.name, isEdit]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Nombre y slug son obligatorios');
      return;
    }
    setLoading(true);
    setError(null);

    const url = isEdit ? `/api/admin/categories?id=${category!.id}` : '/api/admin/categories';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json();
      setError(data.error ?? 'Error al guardar');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Emoji picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Emoji</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, emoji: e }))}
                  className={`w-10 h-10 text-xl rounded-xl transition-all ${
                    form.emoji === e
                      ? 'bg-orange-100 dark:bg-orange-900/30 ring-2 ring-orange-500 scale-110'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.emoji}
              onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
              placeholder="O escribe un emoji..."
              className="w-full form-input text-center text-2xl"
              maxLength={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Pollerías"
              className="w-full form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="pollerias"
              className="w-full form-input font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Descripción corta..."
              className="w-full form-input"
            />
          </div>

          {/* Toggle visible */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Visible en la plataforma</p>
              <p className="text-xs text-gray-500">Los clientes pueden ver esta categoría</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_visible: !f.is_visible }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.is_visible ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                form.is_visible ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </div>
    </div>
  );
}
