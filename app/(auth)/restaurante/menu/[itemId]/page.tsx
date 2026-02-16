// ============================================================
// Item Edit Page — Full editor with info, variants, modifiers
// ============================================================
// FILE: app/(auth)/restaurante/menu/[itemId]/page.tsx

'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Save,
  Loader2,
  Package,
  Settings,
} from 'lucide-react';
import { formatCurrency } from '@/config/tokens';
import { useRestaurant } from '@/components/restaurant-panel/restaurant-context';
import { ConfirmModal } from '@/components/restaurant-panel/confirm-modal';
import { ModifierGroupCard } from '@/components/restaurant-panel/modifier-group-card';
import {
  ModifierGroupForm,
  type ModifierGroup,
} from '@/components/restaurant-panel/modifier-group-form';
import type { ModifierOption } from '@/components/restaurant-panel/modifier-option-row';

// ─── Types ───
interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  base_price_cents: number;
  image_url: string | null;
  is_available: boolean;
  menu_category_id: string | null;
  tags: string[];
  weight_kg: number | null;
  display_order: number;
}

interface MenuCategory {
  id: string;
  name: string;
}

type ModifierGroupWithOptions = ModifierGroup & {
  item_modifiers: ModifierOption[];
};

// ─── Skeleton ───
function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4"
        >
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg" />
          <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg" />
          <div className="h-10 w-1/2 bg-gray-100 dark:bg-gray-700 rounded-lg" />
        </div>
      ))}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function ItemEditPage({
  params: paramsPromise,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const params = use(paramsPromise);
  const { itemId } = params;
  const router = useRouter();
  const { restaurantId } = useRestaurant();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupWithOptions[]>([]);

  // Item form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriceSoles, setFormPriceSoles] = useState('0.00');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formIsAvailable, setFormIsAvailable] = useState(true);

  // Modifier group form
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning';
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });

  // ─── Load data ───
  const loadItem = useCallback(async () => {
    try {
      const menuRes = await fetch('/api/restaurant/menu');
      if (!menuRes.ok) throw new Error('Error loading menu');
      const menuData = await menuRes.json();

      // The API returns { categories: [...], items: [...] }
      // items is a flat array, NOT nested under categories
      const allItems: MenuItem[] = menuData.items || [];
      const allCategories: MenuCategory[] = (menuData.categories || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
      }));

      // Find item in flat items array
      let foundItem = allItems.find((i) => i.id === itemId) || null;

      // Also check if items are nested under categories (some API formats)
      if (!foundItem) {
        for (const cat of menuData.categories || []) {
          for (const menuItem of cat.menu_items || cat.items || []) {
            if (menuItem.id === itemId) {
              foundItem = menuItem;
              break;
            }
          }
          if (foundItem) break;
        }
      }

      // Also check uncategorized
      if (!foundItem) {
        for (const menuItem of menuData.uncategorized || []) {
          if (menuItem.id === itemId) {
            foundItem = menuItem;
            break;
          }
        }
      }

      if (!foundItem) {
        console.error('Item not found:', itemId, 'Available items:', allItems.map(i => i.id));
        router.push('/restaurante/menu');
        return;
      }

      setItem(foundItem);
      setCategories(allCategories);
      setFormName(foundItem.name);
      setFormDesc(foundItem.description || '');
      setFormPriceSoles((foundItem.base_price_cents / 100).toFixed(2));
      setFormCategoryId(foundItem.menu_category_id || '');
      setFormIsAvailable(foundItem.is_available);
    } catch (error) {
      console.error('Error loading item:', error);
      router.push('/restaurante/menu');
    }
  }, [itemId, router]);

  const loadModifiers = useCallback(async () => {
    try {
      const res = await fetch(`/api/restaurant/menu/items/${itemId}/modifiers`);
      if (!res.ok) throw new Error('Error loading modifiers');
      const data = await res.json();
      setModifierGroups(data.groups || []);
    } catch (error) {
      console.error('Error loading modifiers:', error);
    }
  }, [itemId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadItem(), loadModifiers()]);
      setLoading(false);
    };
    load();
  }, [loadItem, loadModifiers]);

  // ─── Save item info ───
  const handleSaveItem = async () => {
    if (!formName.trim() || saving) return;
    setSaving(true);
    try {
      const priceCents = Math.max(0, Math.round(parseFloat(formPriceSoles || '0') * 100));
      const res = await fetch('/api/restaurant/menu/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemId,
          name: formName.trim(),
          description: formDesc.trim() || null,
          base_price_cents: priceCents,
          menu_category_id: formCategoryId || null,
          is_available: formIsAvailable,
        }),
      });
      if (!res.ok) throw new Error('Error saving');
      await loadItem();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSaving(false);
    }
  };

  // ─── Modifier Group CRUD ───
  const handleSaveGroup = async (data: {
    menu_item_id: string;
    name: string;
    is_required: boolean;
    min_selections: number;
    max_selections: number;
    id?: string;
  }) => {
    if (data.id) {
      const res = await fetch(`/api/restaurant/menu/modifier-groups/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          is_required: data.is_required,
          min_selections: data.min_selections,
          max_selections: data.max_selections,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al editar grupo');
      }
    } else {
      const res = await fetch('/api/restaurant/menu/modifier-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear grupo');
      }
    }
    await loadModifiers();
  };

  const handleDeleteGroup = (group: ModifierGroup) => {
    const optionCount = (group as ModifierGroupWithOptions).item_modifiers?.length || 0;
    setConfirmModal({
      open: true,
      title: 'Eliminar grupo',
      message: `¿Eliminar "${group.name}"${optionCount > 0 ? ` y sus ${optionCount} opciones` : ''}? Esta accion no se puede deshacer.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/restaurant/menu/modifier-groups/${group.id}`, {
            method: 'DELETE',
          });
          if (!res.ok) throw new Error('Error deleting group');
          await loadModifiers();
        } catch (error) {
          console.error('Error deleting group:', error);
        }
        setConfirmModal((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const handleMoveGroup = async (groupId: string, direction: 'up' | 'down') => {
    const idx = modifierGroups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= modifierGroups.length) return;

    const current = modifierGroups[idx];
    const swap = modifierGroups[swapIdx];

    await Promise.all([
      fetch(`/api/restaurant/menu/modifier-groups/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: swap.display_order }),
      }),
      fetch(`/api/restaurant/menu/modifier-groups/${swap.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: current.display_order }),
      }),
    ]);

    await loadModifiers();
  };

  // ─── Modifier Option CRUD ───
  const handleSaveOption = async (data: {
    modifier_group_id: string;
    name: string;
    price_cents: number;
    is_default: boolean;
    is_available: boolean;
    id?: string;
  }) => {
    if (data.id) {
      const res = await fetch(`/api/restaurant/menu/modifiers/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          price_cents: data.price_cents,
          is_default: data.is_default,
          is_available: data.is_available,
        }),
      });
      if (!res.ok) throw new Error('Error editing option');
    } else {
      const res = await fetch('/api/restaurant/menu/modifiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error creating option');
    }
    await loadModifiers();
  };

  const handleToggleOptionAvailable = async (id: string, available: boolean) => {
    const res = await fetch(`/api/restaurant/menu/modifiers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: available }),
    });
    if (!res.ok) throw new Error('Error toggling availability');
    await loadModifiers();
  };

  const handleDeleteOption = (option: ModifierOption) => {
    setConfirmModal({
      open: true,
      title: 'Eliminar opcion',
      message: `¿Eliminar "${option.name}"? Esta accion no se puede deshacer.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/restaurant/menu/modifiers/${option.id}`, {
            method: 'DELETE',
          });
          if (!res.ok) throw new Error('Error deleting option');
          await loadModifiers();
        } catch (error) {
          console.error('Error deleting option:', error);
        }
        setConfirmModal((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // ─── Render ───
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <PageSkeleton />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Plato no encontrado</p>
      </div>
    );
  }

  const hasChanges =
    formName !== item.name ||
    formDesc !== (item.description || '') ||
    formPriceSoles !== (item.base_price_cents / 100).toFixed(2) ||
    formCategoryId !== (item.menu_category_id || '') ||
    formIsAvailable !== item.is_available;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/restaurante/menu')}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {item.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Editar plato y modificadores
          </p>
        </div>
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
          />
        )}
      </div>

      {/* ═══ Section 1: Item Info ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <Package className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Informacion del plato
          </h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripcion
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={2}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Precio (S/)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  S/
                </span>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={formPriceSoles}
                  onChange={(e) => setFormPriceSoles(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 pl-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoria
              </label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Sin categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Available toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Disponible
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={formIsAvailable}
              onClick={() => setFormIsAvailable(!formIsAvailable)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                formIsAvailable ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  formIsAvailable ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Save button */}
          <AnimatePresence>
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <button
                  type="button"
                  onClick={handleSaveItem}
                  disabled={!formName.trim() || saving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar cambios
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ═══ Section 2: Modifier Groups ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Modificadores
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({modifierGroups.length} grupo{modifierGroups.length !== 1 ? 's' : ''})
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingGroup(null);
              setGroupFormOpen(true);
            }}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Grupo
          </button>
        </div>

        {/* Groups list */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {modifierGroups.map((group, idx) => (
              <ModifierGroupCard
                key={group.id}
                group={group}
                onEditGroup={(g) => {
                  setEditingGroup(g);
                  setGroupFormOpen(true);
                }}
                onDeleteGroup={handleDeleteGroup}
                onMoveGroup={handleMoveGroup}
                onSaveOption={handleSaveOption}
                onToggleOptionAvailable={handleToggleOptionAvailable}
                onDeleteOption={handleDeleteOption}
                isFirst={idx === 0}
                isLast={idx === modifierGroups.length - 1}
              />
            ))}
          </AnimatePresence>

          {modifierGroups.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
              <Settings className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Sin modificadores
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                Agrega grupos como &quot;Elige tus cremas&quot;, &quot;Extras&quot;, etc.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingGroup(null);
                  setGroupFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear primer grupo
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══ Modals ═══ */}
      <ModifierGroupForm
        open={groupFormOpen}
        menuItemId={itemId}
        editingGroup={editingGroup}
        onSave={handleSaveGroup}
        onClose={() => {
          setGroupFormOpen(false);
          setEditingGroup(null);
        }}
      />

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
