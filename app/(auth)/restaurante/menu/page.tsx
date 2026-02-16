'use client';

// ============================================================
// Menu Management — Categories + Items CRUD
// Chat 5C — Simplified UX
// Click on item → full edit page with modifiers
// Modal only for creating NEW items
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/lib/utils/rounding';
import { ConfirmModal } from '@/components/restaurant-panel/confirm-modal';
import type { MenuItem, MenuCategory } from '@/types/restaurant-panel';

export default function MenuPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all' | 'uncategorized'>('all');

  // Modals — only for CREATING new items/categories
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning';
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });

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

  const toggleItem = async (e: React.MouseEvent, itemId: string, currentAvailable: boolean) => {
    e.stopPropagation(); // Don't navigate to item page
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

  // ─── Delete item (ConfirmModal) ──────────────────────────

  const deleteItem = (e: React.MouseEvent, itemId: string, itemName: string) => {
    e.stopPropagation();
    setConfirmModal({
      open: true,
      title: 'Eliminar plato',
      message: `¿Eliminar "${itemName}"? Esta acción no se puede deshacer.`,
      variant: 'danger',
      onConfirm: async () => {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        try {
          await fetch(`/api/restaurant/menu/items?id=${itemId}`, { method: 'DELETE' });
        } catch {
          fetchMenu();
        }
        setConfirmModal((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // ─── Delete category (ConfirmModal) ──────────────────────

  const deleteCategory = (catId: string, catName: string) => {
    setConfirmModal({
      open: true,
      title: 'Eliminar categoría',
      message: `¿Eliminar "${catName}"? Los platos se moverán a "Sin categoría".`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/restaurant/menu/categories?id=${catId}`, { method: 'DELETE' });
          if (res.ok) {
            setSelectedCategoryId('all');
            fetchMenu();
          }
        } catch {
          console.error('Error al eliminar categoría');
        }
        setConfirmModal((prev) => ({ ...prev, open: false }));
      },
    });
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
            onClick={() => setShowItemForm(true)}
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
              onDelete={() => deleteCategory(cat.id, cat.name)}
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
            <div key={i} className="h-[72px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
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
                onToggle={(e) => toggleItem(e, item.id, item.is_available)}
                onClick={() => router.push(`/restaurante/menu/${item.id}`)}
                onDelete={(e) => deleteItem(e, item.id, item.name)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-sm">No hay platos en esta categoría</p>
          <button
            onClick={() => setShowItemForm(true)}
            className="mt-3 text-sm text-[#FF6B35] font-semibold hover:underline"
          >
            Agregar primer plato
          </button>
        </div>
      )}

      {/* Item form modal — ONLY for creating NEW items */}
      <ItemFormModal
        isOpen={showItemForm}
        categories={categories}
        onClose={() => setShowItemForm(false)}
        onSaved={(newItemId) => {
          fetchMenu();
          // Navigate to the new item's edit page
          if (newItemId) {
            router.push(`/restaurante/menu/${newItemId}`);
          }
        }}
      />

      {/* Category form modal */}
      <CategoryFormModal
        isOpen={showCategoryForm}
        category={editingCategory}
        onClose={() => { setShowCategoryForm(false); setEditingCategory(null); }}
        onSaved={fetchMenu}
      />

      {/* Confirm modal */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}

// ─── Menu Item Row ──────────────────────────────────────────
// Entire row is clickable → navigates to /restaurante/menu/{id}
// Toggle and delete have stopPropagation to avoid navigation

function MenuItemRow({
  item,
  categoryName,
  onToggle,
  onClick,
  onDelete,
}: {
  item: MenuItem;
  categoryName?: string;
  onToggle: (e: React.MouseEvent) => void;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      onClick={onClick}
      className={`rounded-xl border transition-all cursor-pointer active:scale-[0.99] ${
        item.is_available
          ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-900/50'
          : 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-800 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2.5 px-3 py-3">
        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`flex-shrink-0 w-9 h-5 rounded-full relative transition-colors ${
            item.is_available ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            item.is_available ? 'left-[17px]' : 'left-0.5'
          }`} />
        </button>

        {/* Image thumbnail */}
        {item.image_url && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
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
          </p>
        </div>

        {/* Price + Delete */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
            {formatPrice(item.base_price_cents)}
          </span>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <span className="text-xs">🗑️</span>
          </button>
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

// ─── Item Form Modal (CREATE ONLY) ─────────────────────────

function ItemFormModal({
  isOpen,
  categories,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  categories: MenuCategory[];
  onClose: () => void;
  onSaved: (newItemId?: string) => void;
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
    if (isOpen) {
      setName(''); setDesc(''); setPrice(''); setCategoryId('');
      setImageUrl(''); setImagePreview(null);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    setIsSaving(true);

    try {
      const body = {
        name,
        description: desc,
        base_price_cents: parseInt(price),
        menu_category_id: categoryId || null,
        image_url: imageUrl || null,
      };

      const res = await fetch('/api/restaurant/menu/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        onClose();
        onSaved(data.item?.id);
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
        Nuevo plato
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pollo a la brasa"
            autoFocus
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
          {isSaving ? 'Creando...' : 'Crear plato'}
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
