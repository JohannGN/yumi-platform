'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Clock, ShoppingCart, Check, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useCartStore } from '@/stores/cart-store';
import type { CartModifierGroup } from '@/stores/cart-store';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { getModifierGroups } from '@/lib/supabase/queries';
import { formatCurrency } from '@/config/tokens';

import type {
  MenuItem,
  ItemVariant,
  ItemModifierGroup,
  ItemModifier,
} from '@/types/database';

// ============================================================
// TYPES
// ============================================================

interface ItemDetailSheetProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  citySlug: string;
  themeColor: string;
  isRestaurantOpen: boolean;
  modifierGroups: ItemModifierGroup[];
}

interface ModifierSelections {
  [groupId: string]: string[];
}

// ============================================================
// HELPERS
// ============================================================

function getGroupLabel(group: ItemModifierGroup): string {
  const { is_required, min_selections, max_selections } = group;
  if (is_required) {
    if (min_selections === max_selections) {
      if (min_selections === 1) return 'Obligatorio — Elige 1';
      return `Obligatorio — Elige exactamente ${min_selections}`;
    }
    return `Obligatorio — Elige ${min_selections} a ${max_selections}`;
  }
  if (max_selections === 1) return 'Opcional — Hasta 1 opción';
  return `Opcional — Hasta ${max_selections} opciones`;
}

function validateSelections(
  groups: ItemModifierGroup[],
  selections: ModifierSelections
): boolean {
  for (const group of groups) {
    if (!group.is_required) continue;
    const selected = selections[group.id] || [];
    if (selected.length < group.min_selections) return false;
    if (selected.length > group.max_selections) return false;
  }
  return true;
}

function isGroupFulfilled(
  group: ItemModifierGroup,
  selections: ModifierSelections
): boolean {
  const selected = selections[group.id] || [];
  if (!group.is_required) return true;
  return (
    selected.length >= group.min_selections &&
    selected.length <= group.max_selections
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function ItemDetailSheet({
  item,
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  restaurantSlug,
  citySlug,
  themeColor,
  isRestaurantOpen,
  modifierGroups,
}: ItemDetailSheetProps) {
  const isMobile = useIsMobile();
  const addItem = useCartStore((s) => s.addItem);

  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [modifierSelections, setModifierSelections] = useState<ModifierSelections>({});
  const [loadingModifiers, setLoadingModifiers] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const variants: ItemVariant[] = item?.variants ?? [];
  const hasVariants = variants.length > 0;

  // Precio base
  const basePriceCents = useMemo(() => {
    if (selectedVariant) return selectedVariant.price_cents;
    return item?.base_price_cents ?? 0;
  }, [selectedVariant, item]);

  // Suma de modificadores
  const modifiersTotalCents = useMemo(() => {
    let total = 0;
    for (const group of modifierGroups) {
      const selected = modifierSelections[group.id] || [];
      for (const modId of selected) {
        const mod = (group.item_modifiers ?? []).find((m) => m.id === modId);
        if (mod) total += mod.price_cents;
      }
    }
    return total;
  }, [modifierGroups, modifierSelections]);

  const unitTotalCents = basePriceCents + modifiersTotalCents;
  const lineTotalCents = unitTotalCents * quantity;

  // Validación
  const canAdd = useMemo(() => {
    if (hasVariants && !selectedVariant) return false;
    return validateSelections(modifierGroups, modifierSelections);
  }, [hasVariants, selectedVariant, modifierGroups, modifierSelections]);

  // Toggle modifier
  const handleModifierToggle = useCallback(
    (group: ItemModifierGroup, modifierId: string) => {
      setModifierSelections((prev) => {
        const current = prev[group.id] || [];
        const isRadio = group.max_selections === 1;

        if (isRadio) {
          return { ...prev, [group.id]: [modifierId] };
        }

        if (current.includes(modifierId)) {
          return {
            ...prev,
            [group.id]: current.filter((id) => id !== modifierId),
          };
        }

        if (current.length >= group.max_selections) return prev;

        return {
          ...prev,
          [group.id]: [...current, modifierId],
        };
      });
    },
    []
  );

  // Agregar al carrito
  const handleAddToCart = useCallback(() => {
    if (!item || !canAdd) return;

    const cartModifiers: CartModifierGroup[] = modifierGroups
      .filter((g) => (modifierSelections[g.id] || []).length > 0)
      .map((group) => ({
        group_id: group.id,
        group_name: group.name,
        selections: (modifierSelections[group.id] || []).map((modId) => {
          const mod = (group.item_modifiers ?? []).find((m) => m.id === modId)!;
          return {
            modifier_id: mod.id,
            name: mod.name,
            price_cents: mod.price_cents,
          };
        }),
      }));

    addItem(
      {
        menu_item_id: item.id,
        name: item.name,
        variant_id: selectedVariant?.id,
        variant_name: selectedVariant?.name,
        base_price_cents: basePriceCents,
        quantity,
        modifiers: cartModifiers,
        unit_total_cents: unitTotalCents,
        line_total_cents: lineTotalCents,
      },
      { restaurantId, restaurantName, restaurantSlug, citySlug }
    );

    setAddedFeedback(true);
    setTimeout(() => {
      setAddedFeedback(false);
      onClose();
    }, 600);
  }, [
    item, canAdd, modifierGroups, modifierSelections, selectedVariant,
    basePriceCents, unitTotalCents, lineTotalCents, quantity,
    restaurantId, restaurantName, restaurantSlug, citySlug, addItem, onClose,
  ]);

  if (!item) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-0 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        <SheetTitle className="sr-only">Detalle del plato</SheetTitle>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Imagen */}
          {item.image_url && (
            <div className="w-full h-48 rounded-xl overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800">
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Nombre y descripción */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {item.name}
          </h2>
          {item.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {item.description}
            </p>
          )}

          {/* Precio base si no hay variantes ni modifiers */}
          {!hasVariants && modifierGroups.length === 0 && (
            <p className="text-lg font-bold mt-2" style={{ color: themeColor }}>
              {formatCurrency(item.base_price_cents)}
            </p>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Restaurante cerrado */}
          {!isRestaurantOpen && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Restaurante cerrado
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  ¡Abrirán pronto! Consulta los horarios.
                </p>
              </div>
            </div>
          )}

          {/* === Solo si abierto + mobile === */}
          {isRestaurantOpen && isMobile && (
            <>
              {/* VARIANTES */}
              {hasVariants && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Elige una opción
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                      Obligatorio
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {variants.map((variant: ItemVariant) => {
                      const isSelected = selectedVariant?.id === variant.id;
                      return (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-2 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                          style={
                            isSelected
                              ? { borderColor: themeColor, backgroundColor: `${themeColor}08` }
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? '' : 'border-gray-300 dark:border-gray-600'
                              }`}
                              style={isSelected ? { borderColor: themeColor } : undefined}
                            >
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: themeColor }}
                                />
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {variant.name}
                            </span>
                          </div>
                          <span className="text-sm font-semibold" style={{ color: themeColor }}>
                            {formatCurrency(variant.price_cents)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MODIFIER GROUPS */}
              {loadingModifiers && (
                <div className="flex items-center gap-2 mt-5 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Cargando opciones...</span>
                </div>
              )}

              {!loadingModifiers && modifierGroups.map((group) => {
                const isRadio = group.max_selections === 1;
                const selected = modifierSelections[group.id] || [];
                const fulfilled = isGroupFulfilled(group, modifierSelections);
                const modifiers = group.item_modifiers ?? [];

                return (
                  <div key={group.id} className="mt-5">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {group.name}
                      </h3>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          group.is_required
                            ? fulfilled
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {getGroupLabel(group)}
                      </span>
                      {group.is_required && fulfilled && (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      )}
                    </div>

                    <div className="space-y-1">
                      {modifiers.map((mod) => {
                        const isSelected = selected.includes(mod.id);
                        const atMax =
                          !isRadio && selected.length >= group.max_selections && !isSelected;

                        return (
                          <button
                            key={mod.id}
                            onClick={() => handleModifierToggle(group, mod.id)}
                            disabled={atMax}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                              atMax ? 'opacity-40 cursor-not-allowed' : ''
                            } ${
                              isSelected
                                ? 'border-2 shadow-sm'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                            style={
                              isSelected
                                ? { borderColor: themeColor, backgroundColor: `${themeColor}08` }
                                : undefined
                            }
                          >
                            <div className="flex items-center gap-2.5">
                              {isRadio ? (
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isSelected ? '' : 'border-gray-300 dark:border-gray-600'
                                  }`}
                                  style={isSelected ? { borderColor: themeColor } : undefined}
                                >
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-2.5 h-2.5 rounded-full"
                                      style={{ backgroundColor: themeColor }}
                                    />
                                  )}
                                </div>
                              ) : (
                                <div
                                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                                    isSelected ? '' : 'border-gray-300 dark:border-gray-600'
                                  }`}
                                  style={
                                    isSelected
                                      ? { borderColor: themeColor, backgroundColor: themeColor }
                                      : undefined
                                  }
                                >
                                  {isSelected && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                      <Check className="w-3 h-3 text-white" />
                                    </motion.div>
                                  )}
                                </div>
                              )}
                              <span className="text-sm text-gray-900 dark:text-gray-100">
                                {mod.name}
                              </span>
                            </div>
                            {mod.price_cents > 0 && (
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                +{formatCurrency(mod.price_cents)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* CANTIDAD */}
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cantidad
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600 disabled:opacity-30"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <motion.span
                    key={quantity}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-lg font-bold w-6 text-center tabular-nums"
                  >
                    {quantity}
                  </motion.span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                    disabled={quantity >= 50}
                    className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600 disabled:opacity-30"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* BOTÓN AGREGAR (sticky bottom) */}
        {isRestaurantOpen && isMobile && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <motion.button
              onClick={handleAddToCart}
              disabled={!canAdd || addedFeedback}
              whileTap={canAdd ? { scale: 0.97 } : undefined}
              className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-white font-semibold text-base transition-all ${
                !canAdd ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{
                backgroundColor: canAdd ? themeColor : '#9CA3AF',
              }}
            >
              <AnimatePresence mode="wait">
                {addedFeedback ? (
                  <motion.div
                    key="added"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    <span>¡Agregado!</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="add"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>
                      Agregar al carrito — {formatCurrency(lineTotalCents)}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {!canAdd && !loadingModifiers && modifierGroups.length > 0 && (
              <p className="text-xs text-red-500 text-center mt-1.5">
                Completa las opciones obligatorias para continuar
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}