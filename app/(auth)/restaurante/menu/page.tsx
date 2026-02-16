'use client';

// ============================================================
// Menu Management — Categories + Items CRUD
// Chat 5 — Fragment 5/7
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/lib/utils/rounding';
import type { MenuItem, MenuCategory } from '@/types/restaurant-panel';

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all' | 'uncategorized'>('all');

  // Modals
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  // ─── Fetch data ───────────────────────────────────────────

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/restaurant/menu');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching menu:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  // ─── Toggle item availability ─────────────────────────────

  const toggleItem = async (itemId: string, currentAvailable: boolean) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, is_available: !currentAvailable } : i))
    );

    try {
      const res = await fetch('/api/restaurant/menu/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, is_available: !currentAvailable }),
      });
      if (!res.ok) {
        // Revert
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, is_available: currentAvailable } : i))
        );
      }
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, is_available: currentAvailable } : i))
      );
    }
  };

  // ─── Delete item ──────────────────────────────────────────

  const deleteItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este plato? Esta acción no se puede deshacer.')) return;

    setItems((prev) => prev.filter((i) => i.id !== itemId));

    try {
      await fetch(`/api/restaurant/menu/items?id=${itemId}`, { method: 'DELETE' });
    } catch {
      fetchMenu(); // Revert by refetching
    }
  };

  // ─── Delete category ──────────────────────────────────────

  const deleteCategory = async (catId: string) => {
    if (!confirm('¿Eliminar esta categoría? Los platos se moverán a "Sin categoría".')) return;

    try {
      const res = await fetch(`/api/restaurant/menu/categories?id=${catId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedCategoryId('all');
        fetchMenu();
      }
    } catch {
      alert('Error al eliminar');
    }
  };

  // ─── Filter items ─────────────────────────────────────────

  const filteredItems = items.filter((item) => {
    if (selectedCategoryId === 'all') return true;
    if (selectedCategoryId === 'uncategorized') return !item.menu_category_id;
    return item.menu_category_id === selectedCategoryId;
  });

  const uncategorizedCount = items.filter((i) => !i.menu_category_id).length;

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menú</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {items.length} platos · {categories.length} categorías
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingCategory(null); setShowCategoryForm(true); }}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            + Categoría
          </button>
          <button
            onClick={() => { setEditingItem(null); setShowItemForm(true); }}
            className="px-4 py-2 rounded-lg bg-[#FF6B35] text-xs font-semibold text-white hover:bg-[#E55A25] transition-colors"
          >
            + Plato
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <CategoryTab
          label={`Todos (${items.length})`}
          active={selectedCategoryId === 'all'}
          onClick={() => setSelectedCategoryId('all')}
        />
        {categories.map((cat) => {
          const count = items.filter((i) => i.menu_category_id === cat.id).length;
          return (
            <CategoryTab
              key={cat.id}
              label={`${cat.name} (${count})`}
              active={selectedCategoryId === cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              onEdit={() => { setEditingCategory(cat); setShowCategoryForm(true); }}
              onDelete={() => deleteCategory(cat.id)}
            />
          );
        })}
        {uncategorizedCount > 0 && (
          <CategoryTab
            label={`Sin categoría (${uncategorizedCount})`}
            active={selectedCategoryId === 'uncategorized'}
            onClick={() => setSelectedCategoryId('uncategorized')}
          />
        )}
      </div>

      {/* Items list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                categoryName={categories.find((c) => c.id === item.menu_category_id)?.name}
                onToggle={() => toggleItem(item.id, item.is_available)}
                onEdit={() => { setEditingItem(item); setShowItemForm(true); }}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-sm">No hay platos en esta categoría</p>
          <button
            onClick={() => { setEditingItem(null); setShowItemForm(true); }}
            className="mt-3 text-sm text-[#FF6B35] font-semibold hover:underline"
          >
            Agregar primer plato
          </button>
        </div>
      )}

      {/* Item form modal */}
      <ItemFormModal
        isOpen={showItemForm}
        item={editingItem}
        categories={categories}
        onClose={() => { setShowItemForm(false); setEditingItem(null); }}
        onSaved={fetchMenu}
      />

      {/* Category form modal */}
      <CategoryFormModal
        isOpen={showCategoryForm}
        category={editingCategory}
        onClose={() => { setShowCategoryForm(false); setEditingCategory(null); }}
        onSaved={fetchMenu}
      />
    </div>
  );
}

// ─── Menu Item Row ──────────────────────────────────────────

function MenuItemRow({
  item,
  categoryName,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  categoryName?: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      className={`rounded-xl border transition-all ${
        item.is_available
          ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
          : 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-800 opacity-60'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`flex-shrink-0 w-10 h-6 rounded-full relative transition-colors ${
            item.is_available ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            item.is_available ? 'left-[18px]' : 'left-0.5'
          }`} />
        </button>

        {/* Image thumbnail (if exists) */}
        {item.image_url && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Info — takes remaining space */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {item.name}
            </span>
            {!item.is_available && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium flex-shrink-0">
                Agotado
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {categoryName || 'Sin categoría'}
            {item.description && ` · ${item.description}`}
          </p>
        </div>

        {/* Price + Actions — stacked on right */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
            {formatPrice(item.base_price_cents)}
          </span>
          <div className="flex gap-0.5">
            <button
              onClick={onEdit}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-xs">✏️</span>
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 transition-colors"
            >
              <span className="text-xs">🗑️</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Category Tab ───────────────────────────────────────────

function CategoryTab({
  label,
  active,
  onClick,
  onEdit,
  onDelete,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={onClick}
        onContextMenu={(e) => {
          if (onEdit) { e.preventDefault(); setShowMenu(true); }
        }}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
          active
            ? 'bg-[#FF6B35] text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        {label}
        {onEdit && (
          <span
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="ml-1.5 opacity-50 hover:opacity-100"
          >
            ⋯
          </span>
        )}
      </button>

      {/* Context menu */}
      {showMenu && onEdit && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
            <button
              onClick={() => { setShowMenu(false); onEdit(); }}
              className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              ✏️ Editar
            </button>
            {onDelete && (
              <button
                onClick={() => { setShowMenu(false); onDelete(); }}
                className="w-full px-3 py-1.5 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                🗑️ Eliminar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Item Form Modal ────────────────────────────────────────

function ItemFormModal({
  isOpen,
  item,
  categories,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  item: MenuItem | null;
  categories: MenuCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDesc(item.description || '');
      setPrice(String(item.base_price_cents));
      setCategoryId(item.menu_category_id || '');
      setImageUrl(item.image_url || '');
      setImagePreview(item.image_url || null);
    } else {
      setName(''); setDesc(''); setPrice(''); setCategoryId('');
      setImageUrl(''); setImagePreview(null);
    }
  }, [item, isOpen]);

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    setIsSaving(true);

    try {
      const url = '/api/restaurant/menu/items';
      const method = item ? 'PATCH' : 'POST';
      const body = item
        ? { id: item.id, name, description: desc, base_price_cents: parseInt(price), menu_category_id: categoryId || null, image_url: imageUrl || null }
        : { name, description: desc, base_price_cents: parseInt(price), menu_category_id: categoryId || null, image_url: imageUrl || null };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose}>
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
        {item ? 'Editar plato' : 'Nuevo plato'}
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pollo a la brasa"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B35] outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descripción</label>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descripción corta..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B35] outline-none"
          />
        </div>

        {/* Image */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Foto del plato</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">📷</span>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                isUploadingImage ? 'bg-gray-300 cursor-wait' : 'bg-[#FF6B35] text-white hover:bg-[#E55A25] active:scale-[0.97]'
              }`}>
                {isUploadingImage ? 'Subiendo...' : 'Subir foto'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isUploadingImage}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }

                    setImagePreview(URL.createObjectURL(file));
                    setIsUploadingImage(true);
                    try {
                      const ext = file.name.split('.').pop() || 'jpg';
                      const path = `menu-items/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                      const formData = new FormData();
                      formData.append('file', file);

                      const res = await fetch(
                        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/yumi-images/${path}`,
                        {
                          method: 'POST',
                          headers: {
                            Authorization: `Bearer ${(await (await import('@/lib/supabase/client')).createClient().auth.getSession()).data.session?.access_token}`,
                          },
                          body: formData,
                        }
                      );
                      if (!res.ok) throw new Error('Upload failed');

                      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/yumi-images/${path}`;
                      setImageUrl(publicUrl);
                      setImagePreview(publicUrl);
                    } catch {
                      alert('Error al subir imagen');
                      setImagePreview(imageUrl || null);
                    } finally {
                      setIsUploadingImage(false);
                    }
                  }}
                />
              </label>
              {imagePreview && (
                <button onClick={() => { setImageUrl(''); setImagePreview(null); }} className="text-[10px] text-red-500 hover:text-red-600 block">
                  Eliminar foto
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Precio (céntimos) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1500"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B35] outline-none"
            />
            {price && (
              <p className="text-[10px] text-gray-400 mt-0.5">{formatPrice(parseInt(price) || 0)}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Categoría</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B35] outline-none"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || !price || isSaving}
          className="flex-1 py-2.5 rounded-xl bg-[#FF6B35] text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </ModalWrapper>
  );
}

// ─── Category Form Modal ────────────────────────────────────

function CategoryFormModal({
  isOpen,
  category,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  category: MenuCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(category?.name || '');
  }, [category, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);

    try {
      const method = category ? 'PATCH' : 'POST';
      const body = category
        ? { id: category.id, name: name.trim() }
        : { name: name.trim() };

      const res = await fetch('/api/restaurant/menu/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSaved();
        onClose();
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose}>
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
        {category ? 'Editar categoría' : 'Nueva categoría'}
      </h3>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Entradas, Combos, Lo más pedido..."
          autoFocus
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B35] outline-none"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        />
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          className="flex-1 py-2.5 rounded-xl bg-[#FF6B35] text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </ModalWrapper>
  );
}

// ─── Modal Wrapper ──────────────────────────────────────────

function ModalWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-2xl"
      >
        {children}
      </motion.div>
    </div>
  );
}
