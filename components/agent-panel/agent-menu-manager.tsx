'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Loader2,
  ToggleLeft,
  ToggleRight,
  ChefHat,
  History,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAgent } from '@/components/agent-panel/agent-context';
import { formatCurrency } from '@/config/design-tokens';
import type { AgentRestaurant } from '@/types/agent-panel';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  base_price_cents: number;
  image_url: string | null;
  menu_category_id: string | null;
  is_available: boolean;
  display_order: number;
  commission_percentage: number | null;
  item_variants: Array<{
    id: string;
    name: string;
    price_cents: number;
    is_available: boolean;
  }>;
  recent_audit: Array<{
    id: string;
    action: string;
    changed_by_name: string;
    changed_by_role: string;
    source: string;
    old_value: string | null;
    new_value: string | null;
    notes: string | null;
    created_at: string;
  }>;
}

interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
}

interface MenuData {
  restaurant: { id: string; name: string; commission_mode: string; commission_percentage: number };
  categories: MenuCategory[];
  items: MenuItem[];
  can_create_items: boolean;
  can_toggle_items: boolean;
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  created: 'Creado',
  disabled: 'Desactivado',
  enabled: 'Activado',
  price_changed: 'Precio cambiado',
  name_changed: 'Nombre cambiado',
  deleted: 'Eliminado',
  stock_changed: 'Stock cambiado',
};

const SOURCE_LABELS: Record<string, string> = {
  admin_panel: 'Admin',
  agent_panel: 'Agente',
  restaurant_panel: 'Restaurante',
  system: 'Sistema',
};

interface Props {
  restaurant: AgentRestaurant;
  onClose: () => void;
}

export function AgentMenuManager({ restaurant, onClose }: Props) {
  const { hasPermission } = useAgent();
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [auditItemId, setAuditItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/restaurants/${restaurant.id}/menu`);
      if (res.ok) {
        const data: MenuData = await res.json();
        setMenuData(data);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  async function handleToggleItem(item: MenuItem) {
    setToggling(item.id);
    try {
      const res = await fetch(`/api/agent/menu-items/${item.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !item.is_available }),
      });
      if (res.ok) {
        setMenuData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((i) =>
              i.id === item.id ? { ...i, is_available: !i.is_available } : i
            ),
          };
        });
        setMessage({
          type: 'success',
          text: `${item.name} ${!item.is_available ? 'activado' : 'desactivado'}`,
        });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Error al actualizar' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setToggling(null);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newPrice.trim()) return;
    setCreating(true);
    try {
      const priceCents = Math.round(parseFloat(newPrice) * 100);
      if (isNaN(priceCents) || priceCents <= 0) {
        setMessage({ type: 'error', text: 'Precio inválido' });
        setCreating(false);
        return;
      }

      const res = await fetch(`/api/agent/restaurants/${restaurant.id}/menu/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          base_price_cents: priceCents,
          menu_category_id: newCategoryId || null,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Plato creado' });
        setShowCreate(false);
        setNewName('');
        setNewPrice('');
        setNewDescription('');
        setNewCategoryId('');
        fetchMenu();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Error al crear' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setCreating(false);
    }
  }

  // Group items by category
  const grouped: Array<{ category: MenuCategory | null; items: MenuItem[] }> = [];
  if (menuData) {
    const catMap = new Map<string | null, MenuItem[]>();
    menuData.items.forEach((item) => {
      const key = item.menu_category_id;
      if (!catMap.has(key)) catMap.set(key, []);
      catMap.get(key)!.push(item);
    });

    // Add categorized items first
    menuData.categories.forEach((cat) => {
      const items = catMap.get(cat.id) ?? [];
      if (items.length > 0) {
        grouped.push({ category: cat, items });
        catMap.delete(cat.id);
      }
    });

    // Add uncategorized
    const uncategorized = catMap.get(null) ?? [];
    if (uncategorized.length > 0) {
      grouped.push({ category: null, items: uncategorized });
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
        <div className="bg-white dark:bg-gray-900 w-full sm:max-w-2xl sm:rounded-xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="p-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 w-full sm:max-w-2xl sm:rounded-xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{restaurant.name}</h3>
            <p className="text-xs text-gray-400">
              {menuData?.items.length ?? 0} platos
              {menuData?.restaurant.commission_mode === 'per_item' && (
                <span className="ml-2 text-purple-500">Comisión por plato</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {menuData?.can_create_items && (
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear plato
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast */}
        {message ? (
          <div className={[
            'mx-5 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
          ].join(' ')}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {message.text}
          </div>
        ) : null}

        {/* Create form */}
        {showCreate ? (
          <div className="mx-5 mt-3 p-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 space-y-3">
            <input
              type="text"
              placeholder="Nombre del plato"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">S/</span>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  placeholder="0.00"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              {menuData && menuData.categories.length > 0 && (
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Sin categoría</option>
                  {menuData.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              )}
            </div>
            <textarea
              placeholder="Descripción (opcional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim() || !newPrice.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Crear
              </button>
            </div>
          </div>
        ) : null}

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {grouped.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <ChefHat className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              Este restaurante no tiene platos
            </div>
          ) : (
            grouped.map((group, gi) => (
              <div key={group.category?.id ?? 'uncategorized'}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {group.category?.name ?? 'Sin categoría'}
                </h4>
                <div className="space-y-1.5">
                  {group.items.map((item) => (
                    <div key={item.id}>
                      <div
                        className={[
                          'flex items-center gap-3 p-2.5 rounded-lg border transition-colors',
                          item.is_available
                            ? 'border-gray-200 dark:border-gray-700'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60',
                        ].join(' ')}
                      >
                        {/* Toggle */}
                        {menuData?.can_toggle_items && (
                          <button
                            onClick={() => handleToggleItem(item)}
                            disabled={toggling === item.id}
                            className="flex-shrink-0"
                          >
                            {toggling === item.id ? (
                              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            ) : item.is_available ? (
                              <ToggleRight className="w-5 h-5 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        )}

                        {/* Name + price */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">
                            {item.name}
                          </span>
                          {item.description && (
                            <span className="text-[10px] text-gray-400 truncate block">{item.description}</span>
                          )}
                        </div>

                        {/* Price */}
                        <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums flex-shrink-0">
                          {formatCurrency(item.base_price_cents)}
                        </span>

                        {/* Audit button */}
                        <button
                          onClick={() => setAuditItemId(auditItemId === item.id ? null : item.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                          title="Historial de cambios"
                        >
                          {auditItemId === item.id ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <History className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Audit log */}
                      {auditItemId === item.id && item.recent_audit.length > 0 ? (
                        <div className="ml-8 mt-1 mb-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 space-y-1.5">
                          {item.recent_audit.map((log) => (
                            <div key={log.id} className="flex items-start gap-2 text-[10px]">
                              <span className="text-gray-400 whitespace-nowrap">
                                {new Date(log.created_at).toLocaleDateString('es-PE', {
                                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                                })}
                              </span>
                              <span className="font-medium text-gray-600 dark:text-gray-300">
                                {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                              </span>
                              <span className="text-gray-400">por</span>
                              <span className="text-gray-600 dark:text-gray-300">{log.changed_by_name}</span>
                              <span className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500">
                                {SOURCE_LABELS[log.source] ?? log.source}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : auditItemId === item.id && item.recent_audit.length === 0 ? (
                        <div className="ml-8 mt-1 mb-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-[10px] text-gray-400">
                          Sin historial de cambios
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
