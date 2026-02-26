'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronDown, Search, Plus, Minus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, formatCurrency } from '@/config/design-tokens';
import { CreateOrderSuccess } from './create-order-success';

// ─── Google Maps styles ───────────────────────────────────────────────────────

const MAP_STYLES_DARK: any[] = [
  { elementType: 'geometry',           stylers: [{ color: '#1a2235' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2235' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#8fa3c0' }] },
  { featureType: 'road',               elementType: 'geometry',           stylers: [{ color: '#2c3e58' }] },
  { featureType: 'road',               elementType: 'labels.text.fill',   stylers: [{ color: '#6b7280' }] },
  { featureType: 'road.highway',       elementType: 'geometry',           stylers: [{ color: '#3d5270' }] },
  { featureType: 'road.highway',       elementType: 'labels.text.fill',   stylers: [{ color: '#94a3b8' }] },
  { featureType: 'water',              elementType: 'geometry',           stylers: [{ color: '#0d1b2e' }] },
  { featureType: 'water',              elementType: 'labels.text.fill',   stylers: [{ color: '#4a6080' }] },
  { featureType: 'poi',                                                    stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',                                                stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative',     elementType: 'geometry',           stylers: [{ color: '#2c3e58' }] },
  { featureType: 'administrative',     elementType: 'labels.text.fill',   stylers: [{ color: '#94a3b8' }] },
];

const MAP_STYLES_LIGHT: any[] = [
  { elementType: 'geometry',           stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#374151' }] },
  { featureType: 'road',               elementType: 'geometry',           stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'road',               elementType: 'geometry.stroke',    stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'road',               elementType: 'labels.text.fill',   stylers: [{ color: '#6b7280' }] },
  { featureType: 'road.highway',       elementType: 'geometry',           stylers: [{ color: '#fed7aa' }] },
  { featureType: 'road.highway',       elementType: 'geometry.stroke',    stylers: [{ color: '#fb923c' }] },
  { featureType: 'road.highway',       elementType: 'labels.text.fill',   stylers: [{ color: '#92400e' }] },
  { featureType: 'water',              elementType: 'geometry',           stylers: [{ color: '#bfdbfe' }] },
  { featureType: 'water',              elementType: 'labels.text.fill',   stylers: [{ color: '#1d4ed8' }] },
  { featureType: 'landscape.natural',  elementType: 'geometry',           stylers: [{ color: '#ecfdf5' }] },
  { featureType: 'poi.park',           elementType: 'geometry',           stylers: [{ color: '#d1fae5' }] },
  { featureType: 'poi',                elementType: 'labels',             stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',                                                stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative',     elementType: 'geometry.stroke',    stylers: [{ color: '#d1d5db' }] },
  { featureType: 'administrative',     elementType: 'labels.text.fill',   stylers: [{ color: '#374151' }] },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Restaurant {
  id: string;
  name: string;
  city_id: string;
  slug: string;
  is_open: boolean;
  is_active: boolean;
  lat: number;
  lng: number;
}

interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
}

interface ModifierOption {
  id: string;
  name: string;
  price_cents: number;
  is_default: boolean;
  is_available: boolean;
}

interface ModifierGroup {
  id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  item_modifiers: ModifierOption[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  base_price_cents: number;
  image_url: string | null;
  menu_category_id: string | null;
  item_modifier_groups: ModifierGroup[];
}

interface SelectedModifier {
  group_id: string;
  group_name: string;
  modifier_id: string;
  modifier_name: string;
  price_cents: number;
}

interface CartItemAdmin {
  item_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  selected_modifiers: SelectedModifier[];
}

interface CustomerData {
  name: string;
  phone: string;           // solo 9 dígitos — se envía como +51XXXXXXXXX
  address: string;
  lat: number;
  lng: number;
  instructions: string;
  payment_method: 'cash' | 'pos' | 'yape' | 'plin';
  delivery_fee_cents: number;
  fee_is_manual: boolean;        // true si el admin sobreescribió el cálculo automático
  fee_calculated_cents: number;  // tarifa que calculó el sistema (para comparar)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STEPS = ['Restaurante', 'Productos', 'Cliente', 'Resumen'];

function calcItemPrice(item: MenuItem, mods: SelectedModifier[]): number {
  return item.base_price_cents + mods.reduce((s, m) => s + m.price_cents, 0);
}

function buildDefaultMods(item: MenuItem): SelectedModifier[] {
  const mods: SelectedModifier[] = [];
  for (const group of item.item_modifier_groups) {
    for (const d of group.item_modifiers.filter((m) => m.is_default && m.is_available)) {
      mods.push({
        group_id: group.id,
        group_name: group.name,
        modifier_id: d.id,
        modifier_name: d.name,
        price_cents: d.price_cents,
      });
    }
  }
  return mods;
}

// ─── ItemModifierSlideOver ────────────────────────────────────────────────────
// Se desliza desde la derecha dentro del contenedor de Step2.
// Muestra info del item + grupos de modificadores + control de cantidad.

interface SlideOverProps {
  item: MenuItem;
  cartItem: CartItemAdmin | undefined;
  onClose: () => void;
  onConfirm: (item: MenuItem, qty: number, mods: SelectedModifier[]) => void;
}

function ItemModifierSlideOver({ item, cartItem, onClose, onConfirm }: SlideOverProps) {
  const initialMods = cartItem?.selected_modifiers ?? buildDefaultMods(item);
  const [localMods, setLocalMods] = useState<SelectedModifier[]>(initialMods);
  const [qty, setQty] = useState<number>(cartItem?.quantity ?? 1);

  const handleSelect = (group: ModifierGroup, option: ModifierOption) => {
    let next = [...localMods];

    if (group.max_selections === 1) {
      const isSame = next.find((s) => s.group_id === group.id && s.modifier_id === option.id) != null;
      next = next.filter((s) => s.group_id !== group.id);
      if (!isSame || group.is_required) {
        next.push({
          group_id: group.id,
          group_name: group.name,
          modifier_id: option.id,
          modifier_name: option.name,
          price_cents: option.price_cents,
        });
      }
    } else {
      const existingIdx = next.findIndex((s) => s.group_id === group.id && s.modifier_id === option.id);
      if (existingIdx >= 0) {
        const groupCount = next.filter((s) => s.group_id === group.id).length;
        if (group.is_required && groupCount <= group.min_selections) return;
        next.splice(existingIdx, 1);
      } else {
        const groupCount = next.filter((s) => s.group_id === group.id).length;
        if (groupCount >= group.max_selections) return;
        next.push({
          group_id: group.id,
          group_name: group.name,
          modifier_id: option.id,
          modifier_name: option.name,
          price_cents: option.price_cents,
        });
      }
    }
    setLocalMods(next);
  };

  const incompleteGroups = item.item_modifier_groups.filter((g) => {
    if (!g.is_required) return false;
    return localMods.filter((s) => s.group_id === g.id).length < g.min_selections;
  });
  const isValid = incompleteGroups.length === 0;
  const unitPrice = calcItemPrice(item, localMods);
  const totalPrice = unitPrice * qty;
  const isEditing = !!cartItem;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-gray-900"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight truncate">
            {item.name}
          </p>
          <p className="text-xs tabular-nums" style={{ color: colors.brand.primary }}>
            {formatCurrency(unitPrice)} c/u
          </p>
        </div>

        {/* Control de cantidad */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: colors.semantic.errorLight, color: colors.semantic.error }}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-6 text-center text-sm font-bold tabular-nums text-gray-900 dark:text-white">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all"
            style={{ background: colors.brand.primary }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Descripción (si existe) */}
      {item.description && (
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.description}</p>
        </div>
      )}

      {/* Grupos de modificadores */}
      <div className="flex-1 overflow-y-auto">
        {item.item_modifier_groups.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-sm">Sin opciones adicionales</p>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {item.item_modifier_groups.map((group) => {
              const groupSels = localMods.filter((s) => s.group_id === group.id);
              const isInvalid = group.is_required && groupSels.length < group.min_selections;
              const isRadio = group.max_selections === 1;

              return (
                <div key={group.id}>
                  {/* Header del grupo */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        {group.name}
                      </span>
                      {group.is_required ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            background: isInvalid ? colors.semantic.errorLight : colors.semantic.successLight,
                            color: isInvalid ? colors.semantic.error : colors.semantic.success,
                          }}
                        >
                          {isInvalid ? '⚠ Requerido' : '✓ Requerido'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">(opcional)</span>
                      )}
                    </div>
                    {!isRadio && (
                      <span className="text-xs text-gray-400 tabular-nums">
                        {groupSels.length}/{group.max_selections}
                      </span>
                    )}
                  </div>

                  {/* Opciones */}
                  <div className="space-y-2">
                    {group.item_modifiers.map((opt) => {
                      const isSelected = groupSels.some((s) => s.modifier_id === opt.id);
                      const atCap = !isRadio && !isSelected && groupSels.length >= group.max_selections;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => !atCap && handleSelect(group, opt)}
                          disabled={atCap}
                          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all ${
                            atCap ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            isSelected
                              ? 'bg-orange-50 dark:bg-orange-900/20'
                              : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          style={{
                            border: `1.5px solid ${isSelected ? colors.brand.primary : 'transparent'}`,
                          }}
                        >
                          <span
                            className="flex-shrink-0 flex items-center justify-center text-white text-xs font-bold transition-all"
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: isRadio ? '50%' : 4,
                              background: isSelected ? colors.brand.primary : 'transparent',
                              border: `2px solid ${isSelected ? colors.brand.primary : '#D1D5DB'}`,
                            }}
                          >
                            {isSelected ? (isRadio ? '●' : '✓') : ''}
                          </span>
                          <span
                            className="flex-1 text-sm font-medium"
                            style={{ color: isSelected ? colors.brand.primary : undefined }}
                          >
                            {opt.name}
                          </span>
                          <span
                            className="text-xs font-bold flex-shrink-0"
                            style={{ color: opt.price_cents > 0 ? colors.brand.primary : '#9CA3AF' }}
                          >
                            {opt.price_cents > 0 ? `+${formatCurrency(opt.price_cents)}` : 'gratis'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: advertencia + botón confirmar */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        {!isValid && (
          <p className="text-xs font-semibold mb-2 text-center" style={{ color: colors.semantic.warning }}>
            ⚠️ Selecciona: {incompleteGroups.map((g) => g.name).join(', ')}
          </p>
        )}
        <button
          type="button"
          onClick={() => isValid && onConfirm(item, qty, localMods)}
          disabled={!isValid}
          className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity flex items-center justify-between px-4"
          style={{ background: colors.brand.primary }}
        >
          <span>{isEditing ? 'Actualizar' : 'Agregar al pedido'}</span>
          <span className="tabular-nums">{formatCurrency(totalPrice)}</span>
        </button>
      </div>
    </motion.div>
  );
}


// ─── CartSummarySlideOver ─────────────────────────────────────────────────────
// Resumen del carrito actual — se desliza desde la derecha dentro del Step 2.
// Permite ver todos los items, editar cantidades y eliminar sin perder el contexto.

interface CartSummarySlideOverProps {
  cart: CartItemAdmin[];
  items: MenuItem[];
  onClose: () => void;
  onEditItem: (item: MenuItem) => void;
  onDirectAdd: (item: MenuItem) => void;
  onDirectRemove: (itemId: string) => void;
}

function CartSummarySlideOver({
  cart,
  items,
  onClose,
  onEditItem,
  onDirectAdd,
  onDirectRemove,
}: CartSummarySlideOverProps) {
  const subtotal = cart.reduce((s, ci) => s + ci.total_cents, 0);
  const totalQty = cart.reduce((s, ci) => s + ci.quantity, 0);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-gray-900"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
            Resumen del pedido
          </p>
          <p className="text-xs text-gray-400">
            {totalQty} producto{totalQty !== 1 ? 's' : ''} · {formatCurrency(subtotal)}
          </p>
        </div>
      </div>

      {/* Lista de items en el carrito */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <span className="text-4xl">🛒</span>
            <p className="text-sm">El carrito está vacío</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {cart.map((ci) => {
              const menuItem = items.find((i) => i.id === ci.item_id);
              const hasModifiers = (menuItem?.item_modifier_groups.length ?? 0) > 0;

              return (
                <div
                  key={ci.item_id}
                  className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50"
                >
                  {/* Fila principal: nombre + total */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                        {ci.name}
                      </p>
                      {ci.selected_modifiers.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                          {ci.selected_modifiers.map((m) => m.modifier_name).join(' · ')}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-sm font-bold tabular-nums flex-shrink-0"
                      style={{ color: colors.brand.primary }}
                    >
                      {formatCurrency(ci.total_cents)}
                    </span>
                  </div>

                  {/* Precio unitario + controles */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400 tabular-nums">
                      {formatCurrency(ci.unit_price_cents)} c/u
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Botón editar modificadores (solo si tiene grupos) */}
                      {hasModifiers && menuItem && (
                        <button
                          type="button"
                          onClick={() => onEditItem(menuItem)}
                          className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors border"
                          style={{
                            borderColor: colors.brand.primary,
                            color: colors.brand.primary,
                          }}
                        >
                          Editar
                        </button>
                      )}

                      {/* Controles cantidad */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (hasModifiers && menuItem) {
                              onEditItem(menuItem);
                            } else {
                              onDirectRemove(ci.item_id);
                            }
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
                          style={{
                            background: ci.quantity === 1 ? colors.semantic.error : colors.semantic.errorLight,
                            color: ci.quantity === 1 ? '#fff' : colors.semantic.error,
                          }}
                        >
                          {ci.quantity === 1 ? (
                            <X className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                        </button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                          {ci.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (hasModifiers && menuItem) {
                              onEditItem(menuItem);
                            } else {
                              onDirectAdd(menuItem!);
                            }
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
                          style={{ background: colors.brand.primary }}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer con subtotal */}
      {cart.length > 0 && (
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div className="space-y-1.5">
            {cart.map((ci) => (
              <div key={ci.item_id} className="flex justify-between text-xs text-gray-500">
                <span className="truncate flex-1 mr-2">
                  {ci.quantity > 1 && <span className="font-semibold text-gray-700 dark:text-gray-300 mr-1">{ci.quantity}×</span>}
                  {ci.name}
                </span>
                <span className="tabular-nums flex-shrink-0">{formatCurrency(ci.total_cents)}</span>
              </div>
            ))}
          </div>
          <div
            className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700"
          >
            <span className="text-sm font-bold text-gray-900 dark:text-white">Total</span>
            <span
              className="text-base font-bold tabular-nums"
              style={{ color: colors.brand.primary }}
            >
              {formatCurrency(subtotal)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: colors.brand.primary }}
          >
            ← Seguir agregando
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Step 1 — Selección de restaurante ───────────────────────────────────────

interface Step1Props {
  selectedRestaurant: Restaurant | null;
  onSelect: (r: Restaurant) => void;
  onNext: () => void;
}

function Step1Restaurant({ selectedRestaurant, onSelect, onNext }: Step1Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/restaurants?limit=100')
      .then((r) => r.json())
      .then((d) => setRestaurants(d.restaurants ?? []))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...restaurants]
    .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(b.is_open) - Number(a.is_open));

  const canNext = selectedRestaurant != null && selectedRestaurant.is_open;

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-0 space-y-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar restaurante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': colors.brand.primary } as React.CSSProperties}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-3 space-y-1.5">
        {sorted.map((r) => {
          const isSelected = selectedRestaurant?.id === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r)}
              className="w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2"
              style={{
                borderColor: isSelected ? colors.brand.primary : 'transparent',
                background: isSelected ? `${colors.brand.primary}10` : 'rgba(0,0,0,0.02)',
              }}
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white flex-1 truncate">
                {r.name}
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1.5"
                style={{
                  background: r.is_open ? colors.semantic.successLight : '#F3F4F6',
                  color: r.is_open ? colors.semantic.success : '#6B7280',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: r.is_open ? colors.semantic.success : '#9CA3AF' }}
                />
                {r.is_open ? 'Abierto' : 'Cerrado'}
              </span>
            </button>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">Sin resultados</p>
        )}
      </div>

      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {selectedRestaurant && !selectedRestaurant.is_open && (
          <div
            className="flex items-start gap-2 p-3 rounded-lg text-sm"
            style={{ background: colors.semantic.errorLight, color: colors.semantic.error }}
          >
            <span>🚫</span>
            <p className="text-xs">
              Restaurante cerrado. Ábrelo desde{' '}
              <strong>Catálogo → Restaurantes</strong> para crear pedidos.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
          style={{ background: colors.brand.primary }}
        >
          {!selectedRestaurant
            ? 'Selecciona un restaurante'
            : !selectedRestaurant.is_open
            ? '🚫 Restaurante cerrado'
            : 'Siguiente →'}
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 — Productos ───────────────────────────────────────────────────────

interface Step2Props {
  restaurantId: string;
  cart: CartItemAdmin[];
  onCartChange: (cart: CartItemAdmin[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step2Products({ restaurantId, cart, onCartChange, onNext, onBack }: Step2Props) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  // Item abierto en el slide-over de modificadores
  const [slideItem, setSlideItem] = useState<MenuItem | null>(null);
  const [cartSummaryOpen, setCartSummaryOpen] = useState(false);

  // Cerrar dropdown si se hace click fuera
  useEffect(() => {
    if (!categoryOpen) return;
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [categoryOpen]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/menu/${restaurantId}`)
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories ?? []);
        setItems(d.items ?? []);
      })
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const filteredItems = items.filter((item) => {
    if (search.trim()) return item.name.toLowerCase().includes(search.toLowerCase());
    if (activeCategory === 'all') return true;
    if (activeCategory === 'uncategorized') return !item.menu_category_id;
    return item.menu_category_id === activeCategory;
  });

  const uncategorizedCount = items.filter((i) => !i.menu_category_id).length;
  const subtotal = cart.reduce((s, ci) => s + ci.total_cents, 0);
  const totalQty = cart.reduce((s, ci) => s + ci.quantity, 0);

  const hasIncompleteRequired = cart.some((ci) => {
    const menuItem = items.find((i) => i.id === ci.item_id);
    if (!menuItem) return false;
    return menuItem.item_modifier_groups.some((g) => {
      if (!g.is_required) return false;
      return ci.selected_modifiers.filter((s) => s.group_id === g.id).length < g.min_selections;
    });
  });

  const canContinue = cart.length > 0 && !hasIncompleteRequired;

  // ── Handlers de carrito ────────────────────────────────────────────────────

  const handleOpenSlide = (item: MenuItem) => {
    setSlideItem(item);
  };

  const handleSlideConfirm = (item: MenuItem, qty: number, mods: SelectedModifier[]) => {
    const unitPrice = calcItemPrice(item, mods);
    const existing = cart.find((ci) => ci.item_id === item.id);
    if (existing) {
      onCartChange(
        cart.map((ci) =>
          ci.item_id === item.id
            ? { ...ci, quantity: qty, unit_price_cents: unitPrice, total_cents: unitPrice * qty, selected_modifiers: mods }
            : ci
        )
      );
    } else {
      onCartChange([
        ...cart,
        { item_id: item.id, name: item.name, quantity: qty, unit_price_cents: unitPrice, total_cents: unitPrice * qty, selected_modifiers: mods },
      ]);
    }
    setSlideItem(null);
  };

  // Abrir item desde el carrito para editar
  const handleEditFromCart = (item: MenuItem) => {
    setCartSummaryOpen(false);
    // Pequeño delay para que el cart slide-over cierre antes de abrir el modifier slide-over
    setTimeout(() => setSlideItem(item), 120);
  };

  const handleDirectAdd = (item: MenuItem) => {
    // Solo para items SIN modificadores
    const existing = cart.find((ci) => ci.item_id === item.id);
    if (existing) {
      onCartChange(
        cart.map((ci) =>
          ci.item_id === item.id
            ? { ...ci, quantity: ci.quantity + 1, total_cents: (ci.quantity + 1) * ci.unit_price_cents }
            : ci
        )
      );
    } else {
      const unitPrice = item.base_price_cents;
      onCartChange([
        ...cart,
        { item_id: item.id, name: item.name, quantity: 1, unit_price_cents: unitPrice, total_cents: unitPrice, selected_modifiers: [] },
      ]);
    }
  };

  const handleDirectRemove = (itemId: string) => {
    const existing = cart.find((ci) => ci.item_id === itemId);
    if (!existing) return;
    if (existing.quantity === 1) {
      onCartChange(cart.filter((ci) => ci.item_id !== itemId));
    } else {
      onCartChange(
        cart.map((ci) =>
          ci.item_id === itemId
            ? { ...ci, quantity: ci.quantity - 1, total_cents: (ci.quantity - 1) * ci.unit_price_cents }
            : ci
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  // Build tabs list for dropdown
  const tabs = [
    { id: 'all', label: 'Todos', count: items.length },
    ...categories
      .filter((c) => items.some((i) => i.menu_category_id === c.id))
      .map((c) => ({
        id: c.id,
        label: c.name,
        count: items.filter((i) => i.menu_category_id === c.id).length,
      })),
    ...(uncategorizedCount > 0
      ? [{ id: 'uncategorized', label: 'Sin categoría', count: uncategorizedCount }]
      : []),
  ];

  const activeCategoryLabel = tabs.find((t) => t.id === activeCategory)?.label ?? 'Todos';
  const activeCategoryCount = tabs.find((t) => t.id === activeCategory)?.count ?? items.length;

  return (
    // relative para que el slide-over se posicione correctamente dentro de este contenedor
    <div className="relative flex flex-col h-full overflow-hidden">

      {/* Buscador + selector de categoría */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 space-y-2">

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar platos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Pill selector de categoría — solo visible cuando no hay búsqueda activa */}
        {!search && (
          <div ref={categoryRef} className="relative">
            <button
              type="button"
              onClick={() => setCategoryOpen((o) => !o)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all text-left hover:border-opacity-80"
              style={{
                borderColor: categoryOpen ? colors.brand.primary : 'rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              {/* Icono menú hamburguesa */}
              <span className="flex-shrink-0 flex flex-col justify-center gap-[3px] w-[14px]">
                <span className="block h-[2px] w-full rounded-full" style={{ background: colors.brand.primary }} />
                <span className="block h-[2px] w-[10px] rounded-full" style={{ background: colors.brand.primary }} />
                <span className="block h-[2px] w-full rounded-full" style={{ background: colors.brand.primary }} />
              </span>

              <div className="flex-1 min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 leading-none mb-0.5">
                  VIENDO
                </span>
                <span className="block text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                  {activeCategoryLabel}
                  <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">
                    ({activeCategoryCount} plato{activeCategoryCount !== 1 ? 's' : ''})
                  </span>
                </span>
              </div>

              <ChevronDown
                className="w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200"
                style={{ transform: categoryOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {/* Dropdown de categorías */}
            <AnimatePresence>
              {categoryOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
                  transition={{ duration: 0.13, ease: 'easeOut' }}
                  style={{ transformOrigin: 'top' }}
                  className="absolute left-0 right-0 top-full mt-1.5 z-10 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden bg-white dark:bg-gray-800"
                >
                  <div className="py-1 max-h-56 overflow-y-auto">
                    {tabs.map((tab) => {
                      const isActive = activeCategory === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveCategory(tab.id);
                            setCategoryOpen(false);
                          }}
                          className="flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors text-left group"
                          style={{
                            background: isActive ? `${colors.brand.primary}18` : undefined,
                          }}
                        >
                          <span
                            className="font-medium truncate"
                            style={{
                              color: isActive ? colors.brand.primary : undefined,
                            }}
                          >
                            {tab.label}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-xs text-gray-400 tabular-nums">
                              {tab.count}
                            </span>
                            {isActive && (
                              <Check
                                className="w-3.5 h-3.5 flex-shrink-0"
                                style={{ color: colors.brand.primary }}
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Lista de items — limpia, sin modificadores inline */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <p className="text-2xl mb-2">🍽️</p>
            <p className="text-sm">
              {search ? `Sin resultados para "${search}"` : 'Sin platos en esta categoría'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {filteredItems.map((item) => {
              const cartItem = cart.find((ci) => ci.item_id === item.id);
              const qty = cartItem?.quantity ?? 0;
              const hasModifiers = item.item_modifier_groups.length > 0;
              // Verificar si tiene grupos requeridos incompletos
              const hasIncomplete =
                qty > 0 &&
                item.item_modifier_groups.some((g) => {
                  if (!g.is_required) return false;
                  return (cartItem?.selected_modifiers ?? []).filter((s) => s.group_id === g.id).length < g.min_selections;
                });

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 bg-white dark:bg-gray-800"
                  style={{
                    borderColor: hasIncomplete
                      ? colors.semantic.warning
                      : 'transparent',
                    borderWidth: hasIncomplete ? 1.5 : 1,
                  }}
                  onClick={() => handleOpenSlide(item)}
                >
                  {/* Foto */}
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-xl bg-gray-100 dark:bg-gray-700">
                      🍽️
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                    <p className="text-sm font-bold mt-1" style={{ color: colors.brand.primary }}>
                      {formatCurrency(
                        qty > 0
                          ? calcItemPrice(item, cartItem?.selected_modifiers ?? [])
                          : item.base_price_cents
                      )}
                      {hasModifiers && qty === 0 && (
                        <span className="text-xs font-normal text-gray-400 ml-1">desde</span>
                      )}
                    </p>
                    {/* Modificadores seleccionados — resumen compacto */}
                    {qty > 0 && (cartItem?.selected_modifiers ?? []).length > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                        {cartItem!.selected_modifiers.map((m) => m.modifier_name).join(', ')}
                      </p>
                    )}
                    {hasIncomplete && (
                      <p className="text-xs font-semibold mt-0.5" style={{ color: colors.semantic.warning }}>
                        ⚠️ Opciones requeridas pendientes
                      </p>
                    )}
                  </div>

                  {/* Controles cantidad — stop propagation para no abrir slide */}
                  <div
                    className="flex items-center gap-1.5 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {qty > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => hasModifiers ? handleOpenSlide(item) : handleDirectRemove(item.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold active:scale-95 transition-transform"
                          style={{ background: colors.semantic.error }}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => hasModifiers ? handleOpenSlide(item) : handleDirectAdd(item)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold active:scale-95 transition-transform"
                          style={{ background: colors.brand.primary }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => hasModifiers ? handleOpenSlide(item) : handleDirectAdd(item)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold active:scale-95 transition-transform"
                        style={{ background: colors.brand.primary }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botón flotante de carrito — visible cuando hay items */}
      <AnimatePresence>
        {totalQty > 0 && !slideItem && !cartSummaryOpen && (
          <motion.button
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.92 }}
            transition={{ type: 'spring', damping: 20, stiffness: 280 }}
            type="button"
            onClick={() => setCartSummaryOpen(true)}
            className="absolute bottom-20 right-4 z-10 flex items-center gap-3 px-4 py-3 rounded-2xl text-white font-bold text-sm"
            style={{
              background: colors.brand.primary,
              boxShadow: `0 4px 20px ${colors.brand.primary}60`,
            }}
          >
            {/* Badge cantidad */}
            <span
              className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-extrabold flex-shrink-0"
              style={{ background: '#fff', color: colors.brand.primary }}
            >
              {totalQty}
            </span>
            <span className="leading-tight">
              Ver pedido
              <span className="block text-xs font-normal" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {formatCurrency(subtotal)}
              </span>
            </span>
            {/* Icono carrito */}
            <span className="text-base leading-none" style={{ filter: 'brightness(0) invert(1)' }}>🛒</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer con botones navegación */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        {hasIncompleteRequired && (
          <p className="text-xs text-center mb-2 font-semibold" style={{ color: colors.semantic.warning }}>
            ⚠️ Completa las opciones requeridas
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
          >
            ← Atrás
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canContinue}
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
            style={{ background: colors.brand.primary }}
          >
            {cart.length === 0 ? 'Agrega productos' : `Siguiente (${totalQty}) →`}
          </button>
        </div>
      </div>

      {/* Slide-over de modificadores */}
      <AnimatePresence>
        {slideItem && (
          <ItemModifierSlideOver
            item={slideItem}
            cartItem={cart.find((ci) => ci.item_id === slideItem.id)}
            onClose={() => setSlideItem(null)}
            onConfirm={handleSlideConfirm}
          />
        )}
      </AnimatePresence>

      {/* Slide-over de carrito */}
      <AnimatePresence>
        {cartSummaryOpen && (
          <CartSummarySlideOver
            cart={cart}
            items={items}
            onClose={() => setCartSummaryOpen(false)}
            onEditItem={handleEditFromCart}
            onDirectAdd={handleDirectAdd}
            onDirectRemove={handleDirectRemove}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 3 — Datos del cliente ───────────────────────────────────────────────

// ─── Hook: cargar Google Maps SDK una sola vez ─────────────────────────────────
function useGoogleMaps() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).google?.maps) { setLoaded(true); return; }
    const existing = document.getElementById('gmaps-sdk');
    if (existing) { existing.addEventListener('load', () => setLoaded(true)); return; }
    const s = document.createElement('script');
    s.id = 'gmaps-sdk';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=geocoding`;
    s.async = true; s.defer = true;
    s.onload = () => setLoaded(true);
    document.head.appendChild(s);
  }, []);
  return loaded;
}


interface Step3Props {
  data: CustomerData;
  onChange: (d: CustomerData) => void;
  restaurant: Restaurant | null;
  onNext: () => void;
  onBack: () => void;
}

function Step3Customer({ data, onChange, restaurant, onNext, onBack }: Step3Props) {
  const mapsLoaded = useGoogleMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const [geocoding, setGeocoding] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [addressInput, setAddressInput] = useState(data.address);
  const [coordsSet, setCoordsSet] = useState(
    data.lat !== -5.7083 || data.lng !== -78.8089
  );
  const [feeCalculating, setFeeCalculating] = useState(false);
  const [feeSource, setFeeSource] = useState<'auto' | 'manual'>('manual');
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeInputRaw, setFeeInputRaw] = useState('');  // texto raw mientras escribe
  const feeOverridden = useRef(false);

  // Calcular delivery fee automáticamente cuando cambian las coordenadas
  const calculateFee = async (lat: number, lng: number) => {
    if (!restaurant?.id) return;
    setFeeCalculating(true);
    setFeeError(null);
    try {
      const params = new URLSearchParams({
        lat:           String(lat),
        lng:           String(lng),
        restaurant_id: restaurant.id,
      });
      const res  = await fetch(`/api/delivery-fee?${params}`);
      const json = await res.json();
      if (json.is_covered && json.total_fee_cents != null) {
        const calc = json.total_fee_cents as number;
        if (!feeOverridden.current) {
          // Auto: tarifa calculada, sin override manual
          onChange({
            ...dataRef.current,
            delivery_fee_cents: calc,
            fee_calculated_cents: calc,
            fee_is_manual: false,
          });
          setFeeInputRaw('');  // reset: se mostrará el valor formateado del store
          setFeeSource('auto');
        } else {
          // Override: guardar el calculado para comparación en Step4
          onChange({ ...dataRef.current, fee_calculated_cents: calc });
        }
        setFeeError(null);
      } else {
        setFeeError('Fuera de zona — ingresa el costo manualmente');
        setFeeSource('manual');
      }
    } catch (err) {
      console.error('[delivery-fee]', err);
      setFeeError('Error al consultar tarifa');
    } finally {
      setFeeCalculating(false);
    }
  };

  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true
  );

  // Sincronizar con el theme del panel via MutationObserver
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'));
    });
    observer.observe(root, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Teléfono: solo dígitos, máx 9
  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    onChange({ ...dataRef.current, phone: digits });
  };

  // Delivery fee: ingreso en soles, guardamos en céntimos
  const handleDeliveryFee = (e: React.ChangeEvent<HTMLInputElement>) => {
    const soles = parseFloat(e.target.value) || 0;
    onChange({
      ...dataRef.current,
      delivery_fee_cents: Math.round(soles * 100),
      fee_is_manual: true,
    });
  };

  // Reverse-geocode posición → texto de dirección
  const reverseGeocode = (lat: number, lng: number) => {
    if (!(window as any).google?.maps) return;
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      if (status === 'OK' && results[0]) {
        const addr = results[0].formatted_address;
        setAddressInput(addr);
        onChange({ ...dataRef.current, lat, lng, address: addr });
      }
    });
    feeOverridden.current = false;
    calculateFee(lat, lng);
  };

  // Geocodificar texto → coordenadas + mover pin
  const handleGeocode = () => {
    if (!mapsLoaded || !addressInput.trim()) return;
    setGeocoding(true);
    const geocoder = new (window as any).google.maps.Geocoder();
    const query = /jaén|jaen/i.test(addressInput)
      ? addressInput
      : `${addressInput}, Jaén, Perú`;
    geocoder.geocode({ address: query }, (results: any[], status: string) => {
      setGeocoding(false);
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        const lat = loc.lat();
        const lng = loc.lng();
        const addr = results[0].formatted_address;
        setAddressInput(addr);
        setCoordsSet(true);
        feeOverridden.current = false;
        onChange({ ...dataRef.current, address: addr, lat, lng });
        if (mapRef.current && markerRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(17);
          markerRef.current.setPosition({ lat, lng });
        }
        calculateFee(lat, lng);
      } else {
        onChange({ ...dataRef.current, address: addressInput });
      }
    });
  };

  // Inicializar mapa cuando SDK listo
  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || mapRef.current) return;
    const center = { lat: dataRef.current.lat, lng: dataRef.current.lng };
    const map = new (window as any).google.maps.Map(mapContainerRef.current, {
      center, zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      styles: isDark ? MAP_STYLES_DARK : MAP_STYLES_LIGHT,
    });
    const marker = new (window as any).google.maps.Marker({
      position: center, map, draggable: true,
      icon: {
        path: (window as any).google.maps.SymbolPath.CIRCLE,
        scale: 12, fillColor: '#FF6B35', fillOpacity: 1,
        strokeColor: '#ffffff', strokeWeight: 3,
      },
    });
    const onPosChange = (lat: number, lng: number) => {
      setCoordsSet(true);
      onChange({ ...dataRef.current, lat, lng });
      reverseGeocode(lat, lng);
    };
    marker.addListener('dragend', () => {
      const p = marker.getPosition();
      if (p) onPosChange(p.lat(), p.lng());
    });
    map.addListener('click', (e: any) => {
      const lat = e.latLng.lat(); const lng = e.latLng.lng();
      marker.setPosition({ lat, lng });
      onPosChange(lat, lng);
    });
    mapRef.current = map;
    markerRef.current = marker;
    setMapReady(true);
    // Si ya hay coordenadas válidas (pin fue fijado antes), calcular fee al montar
    if (dataRef.current.lat !== -5.7083 || dataRef.current.lng !== -78.8089) {
      calculateFee(dataRef.current.lat, dataRef.current.lng);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsLoaded]);

  // Actualizar estilos del mapa cuando cambia el tema
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setOptions({ styles: isDark ? MAP_STYLES_DARK : MAP_STYLES_LIGHT });
    }
  }, [isDark]);

  const isValid =
    data.name.trim().length >= 2 &&
    data.phone.replace(/\D/g, '').length === 9 &&
    data.address.trim().length >= 5 &&
    coordsSet;

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-400';

  // Mientras el usuario escribe usa el raw; en reposo usa el valor del store
  const feeDisplayValue = feeInputRaw !== ''
    ? feeInputRaw
    : data.delivery_fee_cents > 0
    ? (data.delivery_fee_cents / 100).toFixed(2)
    : '';

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Nombre */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">
            Nombre del cliente *
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="Ej. Juan Pérez"
            className={inputClass}
          />
        </div>

        {/* Teléfono con prefijo +51 hardcodeado */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">
            Teléfono WhatsApp *
          </label>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 focus-within:ring-1 focus-within:ring-orange-400">
            <span
              className="flex items-center px-3 text-sm font-bold select-none flex-shrink-0 border-r border-gray-200 dark:border-gray-600"
              style={{
                background: 'rgba(255,107,53,0.10)',
                color: colors.brand.primary,
              }}
            >
              🇵🇪 +51
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={data.phone}
              onChange={handlePhone}
              placeholder="9XX XXX XXX"
              maxLength={9}
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
            />
            {/* Indicador de longitud */}
            <span className={`flex items-center pr-3 text-xs font-semibold tabular-nums flex-shrink-0 ${
              data.phone.length === 9
                ? 'text-green-500'
                : 'text-gray-400'
            }`}>
              {data.phone.length}/9
            </span>
          </div>
          {data.phone.length > 0 && data.phone.length < 9 && (
            <p className="text-xs mt-1" style={{ color: colors.semantic.warning }}>
              Faltan {9 - data.phone.length} dígitos
            </p>
          )}
        </div>

        {/* Dirección + mapa */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            Dirección de entrega *
          </label>

          {/* Input texto + botón geocode */}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value);
                onChange({ ...data, address: e.target.value });
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGeocode(); } }}
              placeholder="Ej. Calle Santa Teresita 485, Jaén"
              className={`flex-1 ${inputClass}`}
            />
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding || !addressInput.trim()}
              title="Buscar en el mapa"
              className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: colors.brand.secondary, minWidth: 68 }}
            >
              {geocoding ? '⏳' : '📍 Buscar'}
            </button>
          </div>

          {/* ── Tarifa de delivery — entre dirección y mapa ───────── */}
          <div
            className="flex items-center gap-3 px-3 py-3 rounded-xl mb-3"
            style={{
              background: isDark ? 'rgba(255,107,53,0.08)' : 'rgba(255,107,53,0.06)',
              border: `1.5px solid ${isDark ? 'rgba(255,107,53,0.25)' : 'rgba(255,107,53,0.2)'}`,
            }}
          >
            {/* Ícono / spinner */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base"
              style={{ background: isDark ? 'rgba(255,107,53,0.15)' : 'rgba(255,107,53,0.12)' }}
            >
              {feeCalculating ? (
                <span className="animate-spin inline-block" style={{ color: colors.brand.primary }}>⟳</span>
              ) : (
                <span>🛵</span>
              )}
            </div>

            {/* Label + valor grande */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Tarifa de delivery</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-semibold" style={{ color: colors.brand.primary }}>S/</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={feeCalculating ? '' : feeDisplayValue}
                  disabled={feeCalculating}
                  onChange={(e) => {
                    // Permitir solo dígitos y un punto decimal
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    feeOverridden.current = true;
                    // Construir evento sintético para handleDeliveryFee
                    const synth = { target: { value: val } } as React.ChangeEvent<HTMLInputElement>;
                    handleDeliveryFee(synth);
                    // Actualizar display directo para no perder el cursor
                    setFeeInputRaw(val);
                  }}
                  onBlur={(e) => {
                    // Al salir del campo, normalizar a 2 decimales
                    const n = parseFloat(e.target.value) || 0;
                    const formatted = n > 0 ? n.toFixed(2) : '';
                    setFeeInputRaw(formatted);
                  }}
                  onFocus={() => {
                    // Al entrar, marcar como override manual
                    feeOverridden.current = true;
                  }}
                  placeholder={feeCalculating ? '…' : '0.00'}
                  className="w-24 bg-transparent text-xl font-bold focus:outline-none tabular-nums disabled:opacity-50"
                  style={{ color: feeCalculating ? colors.brand.primaryLight : colors.brand.primary }}
                />
                {/* Badge origen */}
                {!feeCalculating && feeSource === 'auto' && !feeOverridden.current && (
                  <span className="text-xs font-semibold" style={{ color: colors.semantic.success }}>✓ auto</span>
                )}
                {!feeCalculating && feeOverridden.current && (
                  <span className="text-xs font-semibold" style={{ color: colors.semantic.warning }}>manual</span>
                )}
              </div>
            </div>

            {/* Botón recalcular */}
            {feeOverridden.current && coordsSet && !feeCalculating && (
              <button
                type="button"
                title="Recalcular según zona"
                onClick={() => {
                  feeOverridden.current = false;
                  onChange({ ...data, fee_is_manual: false });
                  calculateFee(data.lat, data.lng);
                }}
                className="flex-shrink-0 px-2 py-1 rounded-lg text-xs font-bold transition-opacity hover:opacity-70"
                style={{
                  background: isDark ? 'rgba(255,107,53,0.15)' : 'rgba(255,107,53,0.1)',
                  color: colors.brand.primary,
                }}
              >
                ↺ Recalcular
              </button>
            )}
          </div>

          {/* Hint / alerta bajo la tarifa */}
          {feeError ? (
            <p className="text-xs mb-1 font-medium" style={{ color: colors.semantic.warning }}>⚠️ {feeError}</p>
          ) : !coordsSet ? (
            <p className="text-xs mb-1 text-gray-400">📍 Mueve el pin en el mapa para calcular automáticamente</p>
          ) : null}

          {/* ⚠️ Alerta inmediata: fee manual por debajo del calculado */}
          {data.fee_is_manual && data.fee_calculated_cents > 0 && data.delivery_fee_cents < data.fee_calculated_cents && (
            <div
              className="rounded-lg p-2.5 mb-1"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1.5px solid rgba(239,68,68,0.3)',
              }}
            >
              <p className="text-xs font-bold flex items-center gap-1" style={{ color: colors.semantic.error }}>
                ⚡ Tarifa por debajo del mínimo calculado
              </p>
              <div className="mt-1 text-xs space-y-0.5" style={{ color: '#991b1b' }}>
                <div className="flex justify-between">
                  <span>Calculado por zona:</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(data.fee_calculated_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ingresado:</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(data.delivery_fee_cents)}</span>
                </div>
                <div
                  className="flex justify-between font-bold pt-1 border-t"
                  style={{ borderColor: 'rgba(239,68,68,0.25)', color: colors.semantic.error }}
                >
                  <span>Pérdida para YUMI:</span>
                  <span className="tabular-nums">-{formatCurrency(data.fee_calculated_cents - data.delivery_fee_cents)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Info: fee manual registrado — solo cuando está por encima o igual al calculado */}
          {data.fee_is_manual && (data.fee_calculated_cents === 0 || data.delivery_fee_cents >= data.fee_calculated_cents) && (
            <p className="text-xs mb-1 flex items-center gap-1" style={{ color: colors.semantic.warning }}>
              📋 Tarifa manual — quedará registrada en el historial del pedido
            </p>
          )}

          {/* Mapa Google Maps */}
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              height: '200px',
              minHeight: '200px',
              marginTop: '4px',
              border: `1.5px solid ${isDark ? '#374151' : '#e2e8f0'}`,
            }}
          >
            {!mapsLoaded && (
              <div
                className="absolute inset-0 flex items-center justify-center text-sm gap-2 z-10"
                style={{
                  background: isDark ? '#1a2235' : '#f8fafc',
                  color: isDark ? '#8fa3c0' : '#6b7280',
                }}
              >
                <span className="animate-spin inline-block">⟳</span> Cargando mapa…
              </div>
            )}
            <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
            {mapReady && (
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium text-white pointer-events-none whitespace-nowrap"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              >
                🔴 Arrastra el pin o haz clic para ajustar
              </div>
            )}
          </div>

          {/* Estado de coordenadas */}
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            {coordsSet ? (
              <>
                <span style={{ color: colors.semantic.success }}>✓</span>
                <span className="text-gray-400 tabular-nums">
                  {data.lat.toFixed(5)}, {data.lng.toFixed(5)}
                </span>
              </>
            ) : (
              <span className="font-semibold" style={{ color: colors.semantic.warning }}>
                ⚠️ Busca la dirección o mueve el pin para capturar coordenadas
              </span>
            )}
          </div>
        </div>

        {/* Instrucciones */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">
            Instrucciones de entrega
          </label>
          <textarea
            value={data.instructions}
            onChange={(e) => onChange({ ...data, instructions: e.target.value })}
            placeholder="Ej. Portón verde, 2do piso, timbre..."
            rows={2}
            className={inputClass}
          />
        </div>

        {/* Método de pago */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">
            Método de pago *
          </label>
          <select value={data.payment_method} onChange={(e) => onChange({ ...data, payment_method: e.target.value as CustomerData['payment_method'] })} className={inputClass}>
            <option value="cash">💵 Efectivo</option>
            <option value="pos">💳 POS / Tarjeta</option>
            <option value="yape">📱 Yape</option>
            <option value="plin">📱 Plin</option>
          </select>
        </div>

        {/* Info */}
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-xs"
          style={{ background: colors.semantic.infoLight, color: colors.semantic.info }}
        >
          <span className="flex-shrink-0">ℹ️</span>
          <p>El pedido se crea directamente en estado <strong>Confirmado</strong>. No requiere confirmación por WhatsApp.</p>
        </div>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <button type="button" onClick={onBack} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
          ← Atrás
        </button>
        <button type="button" onClick={onNext} disabled={!isValid} className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: colors.brand.primary }}>
          Ver resumen →
        </button>
      </div>
    </div>
  );
}

// ─── Step 4 — Resumen ─────────────────────────────────────────────────────────

interface Step4Props {
  restaurant: Restaurant | null;
  cart: CartItemAdmin[];
  customer: CustomerData;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

const PAY_LABELS: Record<string, string> = {
  cash: '💵 Efectivo',
  pos: '💳 POS / Tarjeta',
  yape: '📱 Yape',
  plin: '📱 Plin',
};

function Step4Summary({ restaurant, cart, customer, onBack, onSubmit, submitting }: Step4Props) {
  const subtotal = cart.reduce((s, ci) => s + ci.total_cents, 0);
  const total = subtotal + customer.delivery_fee_cents;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Restaurante</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{restaurant?.name}</p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Productos</p>
          <div className="space-y-3">
            {cart.map((ci) => (
              <div key={ci.item_id}>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-gray-900 dark:text-white flex-1">
                    {ci.name} <span className="text-gray-400">× {ci.quantity}</span>
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(ci.total_cents)}
                  </span>
                </div>
                {ci.selected_modifiers.length > 0 && (
                  <div className="mt-0.5 ml-2 space-y-0.5">
                    {ci.selected_modifiers.map((m) => (
                      <div key={m.modifier_id} className="flex justify-between text-xs text-gray-500">
                        <span>+ {m.modifier_name}</span>
                        <span>{m.price_cents > 0 ? formatCurrency(m.price_cents) : 'gratis'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Subtotal + delivery + total */}
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                Delivery
                {customer.fee_is_manual && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}
                  >
                    MANUAL
                  </span>
                )}
              </span>
              <span className="tabular-nums">
                {customer.delivery_fee_cents > 0
                  ? formatCurrency(customer.delivery_fee_cents)
                  : <span className="text-yellow-500 font-semibold">Por acordar</span>}
              </span>
            </div>

            {/* Badge auditoría: fee manual — visible en resumen final */}
            {customer.fee_is_manual && (
              <div
                className="flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs"
                style={{
                  background: customer.delivery_fee_cents < customer.fee_calculated_cents
                    ? 'rgba(239,68,68,0.07)'
                    : 'rgba(245,158,11,0.07)',
                  border: `1.5px solid ${customer.delivery_fee_cents < customer.fee_calculated_cents
                    ? 'rgba(239,68,68,0.25)'
                    : 'rgba(245,158,11,0.25)'}`,
                }}
              >
                <span className="flex-shrink-0 mt-0.5">
                  {customer.delivery_fee_cents < customer.fee_calculated_cents ? '⚡' : '📋'}
                </span>
                <div style={{
                  color: customer.delivery_fee_cents < customer.fee_calculated_cents ? '#991b1b' : '#92400e'
                }}>
                  <span className="font-bold">
                    {customer.delivery_fee_cents < customer.fee_calculated_cents
                      ? `Pérdida de ${formatCurrency(customer.fee_calculated_cents - customer.delivery_fee_cents)} vs zona`
                      : 'Tarifa manual'}
                  </span>
                  {' — quedará registrada en el historial con etiqueta '}
                  <span className="font-bold">MANUAL</span>.
                </div>
              </div>
            )}
            <div
              className="flex justify-between font-bold text-sm pt-1 border-t border-gray-100 dark:border-gray-700"
              style={{ color: colors.brand.primary }}
            >
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(subtotal + customer.delivery_fee_cents)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Cliente</p>
          <p className="text-sm text-gray-900 dark:text-white">{customer.name}</p>
          <p className="text-sm text-gray-500">{customer.phone}</p>
          <p className="text-sm text-gray-500">{customer.address}</p>
          {customer.lat !== -5.7083 && (
            <p className="text-xs text-gray-400 tabular-nums">
              📌 {customer.lat.toFixed(5)}, {customer.lng.toFixed(5)}
            </p>
          )}
          {customer.instructions && (
            <p className="text-xs text-gray-400 italic">{customer.instructions}</p>
          )}
          <p className="text-sm font-semibold" style={{ color: colors.brand.primary }}>
            {PAY_LABELS[customer.payment_method]}
          </p>
        </div>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <button type="button" onClick={onBack} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40">
          ← Atrás
        </button>
        <button type="button" onClick={onSubmit} disabled={submitting} className="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: colors.semantic.success }}>
          {submitting ? '⏳ Creando...' : '✓ Confirmar pedido'}
        </button>
      </div>
    </div>
  );
}

// ─── CreateOrderForm — Overlay principal ──────────────────────────────────────

interface CreateOrderFormProps {
  onClose: () => void;
  onCreated: (code: string) => void;
}

export function CreateOrderForm({ onClose, onCreated }: CreateOrderFormProps) {
  const [step, setStep] = useState(0);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<CartItemAdmin[]>([]);
  const [customer, setCustomer] = useState<CustomerData>({
    name: '',
    phone: '',
    address: '',
    lat: -5.7083,
    lng: -78.8089,
    instructions: '',
    payment_method: 'cash',
    delivery_fee_cents: 0,
    fee_is_manual: false,
    fee_calculated_cents: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<{ id: string; code: string; status: string; total_cents: number } | null>(null);

  const handleSelectRestaurant = (r: Restaurant) => {
    if (restaurant && restaurant.id !== r.id) setCart([]);
    setRestaurant(r);
    // Enriquecer con lat/lng que el listado no devuelve
    if (!r.lat || !r.lng) {
      fetch(`/api/admin/restaurants/${r.id}`)
        .then((res) => res.json())
        .then((detail) => {
          if (detail?.restaurant?.lat) {
            setRestaurant((prev) =>
              prev?.id === r.id
                ? { ...prev, lat: detail.restaurant.lat, lng: detail.restaurant.lng }
                : prev
            );
          }
        })
        .catch(() => {}); // silencioso — el agente puede ingresar fee manual si falla
    }
  };

  const handleSubmit = async () => {
    if (!restaurant) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          customer_name: customer.name,
          customer_phone: `+51${customer.phone.replace(/\D/g, '').slice(-9)}`,
          delivery_address: customer.address,
          delivery_lat: customer.lat,
          delivery_lng: customer.lng,
          delivery_instructions: customer.instructions,
          payment_method: customer.payment_method,
          delivery_fee_cents: customer.delivery_fee_cents,
          // Auditoría de tarifa manual (admin puede sobreescribir el cálculo)
          fee_is_manual: customer.fee_is_manual,
          fee_calculated_cents: customer.fee_calculated_cents,
          items: cart.map((ci) => ({
            item_id: ci.item_id,
            name: ci.name,
            quantity: ci.quantity,
            unit_price_cents: ci.unit_price_cents,
            total_cents: ci.total_cents,
            modifiers: ci.selected_modifiers.map((m) => ({
              modifier_id: m.modifier_id,
              name: m.modifier_name,
              price_cents: m.price_cents,
            })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al crear pedido');
      // FEATURE 1: mostrar pantalla de éxito con link de tracking y WhatsApp
      setCreatedOrder(data.order ?? { id: '', code: data.code ?? '', status: 'pending_confirmation', total_cents: 0 });
      setStep(4); // Step 4 = índice visual de "completado" en el stepper (0-3 son los pasos reales)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ['Selecciona el restaurante', 'Elige los productos', 'Datos del cliente', 'Confirmar pedido', '¡Pedido creado!'];

  return (
    // Overlay full-screen
    <div className="fixed inset-0 z-[60] flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel deslizante desde la derecha */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative ml-auto w-full max-w-[540px] h-full flex flex-col shadow-2xl bg-white dark:bg-gray-900"
      >
        {/* Header del panel */}
        <div className="flex-shrink-0 flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Indicador de pasos */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
                <div
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                  style={{
                    background: i < step ? colors.brand.primary : i === step ? colors.brand.primary : '#E5E7EB',
                    color: i <= step ? '#fff' : '#9CA3AF',
                  }}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span
                  className="text-xs font-medium hidden sm:block truncate"
                  style={{ color: i === step ? colors.brand.primary : '#9CA3AF' }}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-1 min-w-[8px]"
                    style={{ background: i < step ? colors.brand.primary : '#E5E7EB' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Botón cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Subtítulo del paso actual */}
        <div className="flex-shrink-0 px-5 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {stepTitles[step]}
          </p>
        </div>

        {/* Contenido del step — ocupa toda la altura restante */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <Step1Restaurant
                  selectedRestaurant={restaurant}
                  onSelect={handleSelectRestaurant}
                  onNext={() => setStep(1)}
                />
              </motion.div>
            )}

            {step === 1 && restaurant && (
              <motion.div
                key="step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <Step2Products
                  restaurantId={restaurant.id}
                  cart={cart}
                  onCartChange={setCart}
                  onNext={() => setStep(2)}
                  onBack={() => setStep(0)}
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <Step3Customer
                  data={customer}
                  onChange={setCustomer}
                  restaurant={restaurant}
                  onNext={() => setStep(3)}
                  onBack={() => setStep(1)}
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <Step4Summary
                  restaurant={restaurant}
                  cart={cart}
                  customer={customer}
                  onBack={() => setStep(2)}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              </motion.div>
            )}

            {/* FEATURE 1: Step 5 — Éxito con link de tracking y botón WhatsApp */}
            {step === 4 && createdOrder && (
              <motion.div
                key="step4-success"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <CreateOrderSuccess
                  order={createdOrder}
                  customer={{ name: customer.name, phone: customer.phone }}
                  onClose={onClose}
                  onViewOrder={() => {
                    onCreated(createdOrder.code);
                    onClose();
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error global */}
        {error && (
          <div
            className="flex-shrink-0 mx-4 mb-4 p-3 rounded-xl text-sm flex items-start gap-2"
            style={{ background: colors.semantic.errorLight, color: colors.semantic.error }}
          >
            <span>❌</span>
            <span>{error}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
