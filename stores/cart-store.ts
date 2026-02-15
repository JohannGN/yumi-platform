import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// TYPES
// ============================================================

export interface CartModifierSelection {
  modifier_id: string;
  name: string;
  price_cents: number;
}

export interface CartModifierGroup {
  group_id: string;
  group_name: string;
  selections: CartModifierSelection[];
}

export interface CartItem {
  menu_item_id: string;
  name: string;
  variant_id?: string;
  variant_name?: string;
  base_price_cents: number;
  quantity: number;
  modifiers: CartModifierGroup[];
  unit_total_cents: number;       // base + sum(modifier prices)
  line_total_cents: number;       // unit_total * quantity
}

export interface RestaurantContext {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  citySlug: string;
}

// ============================================================
// KEY: mismo plato + mismos modifiers = incrementa cantidad
//      mismo plato + diferentes modifiers = items separados
// ============================================================

export function generateCartItemKey(item: CartItem): string {
  const modKey = item.modifiers
    .flatMap((g) => g.selections.map((s) => s.modifier_id))
    .sort()
    .join(',');
  return `${item.menu_item_id}:${item.variant_id || 'base'}:${modKey}`;
}

// ============================================================
// STORE
// ============================================================

interface CartStore {
  restaurantId: string | null;
  restaurantName: string;
  restaurantSlug: string;
  citySlug: string;
  items: CartItem[];
  isOpen: boolean;
  editingItemId: string | null;
  setEditingItemId: (id: string | null) => void;
  lastActivity: number;

  addItem: (item: CartItem, context: RestaurantContext) => void;
  removeItem: (itemKey: string) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  clearCart: () => void;
  setDrawerOpen: (open: boolean) => void;
  getSubtotalCents: () => number;
  getItemCount: () => number;
  leaveGuard: ((targetUrl: string | null) => boolean) | null;
  setLeaveGuard: (guard: ((targetUrl: string | null) => boolean) | null) => void;
  isGoingToCheckout: boolean;
  setIsGoingToCheckout: (val: boolean) => void;
  }
  

const STORAGE_KEY = 'yumi_cart';
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 horas
const MAX_ITEMS = 30;
const MAX_QUANTITY_PER_ITEM = 50;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: '',
      restaurantSlug: '',
      citySlug: '',
      items: [],
      isOpen: false,
      editingItemId: null,
      setEditingItemId: (id: string | null) => set({ editingItemId: id }),
      lastActivity: Date.now(),

      addItem: (item: CartItem, context: RestaurantContext) => {
        const state = get();

        // Cleanup si expiró inactividad
        if (Date.now() - state.lastActivity > INACTIVITY_TIMEOUT_MS) {
          set({
            restaurantId: null,
            restaurantName: '',
            restaurantSlug: '',
            citySlug: '',
            items: [],
          });
        }

        // Si es otro restaurante, limpiar primero
        if (state.restaurantId && state.restaurantId !== context.restaurantId) {
          set({
            restaurantId: context.restaurantId,
            restaurantName: context.restaurantName,
            restaurantSlug: context.restaurantSlug,
            citySlug: context.citySlug,
            items: [],
          });
        }

        const newKey = generateCartItemKey(item);
        const existingIndex = state.items.findIndex(
          (i) => generateCartItemKey(i) === newKey
        );

        let updatedItems: CartItem[];

        if (existingIndex >= 0) {
          // Misma combinación → incrementar cantidad
          updatedItems = state.items.map((i, idx) => {
            if (idx === existingIndex) {
              const newQty = Math.min(i.quantity + item.quantity, MAX_QUANTITY_PER_ITEM);
              return {
                ...i,
                quantity: newQty,
                line_total_cents: i.unit_total_cents * newQty,
              };
            }
            return i;
          });
        } else {
          if (state.items.length >= MAX_ITEMS) return;
          updatedItems = [...state.items, item];
        }

        set({
          restaurantId: context.restaurantId,
          restaurantName: context.restaurantName,
          restaurantSlug: context.restaurantSlug,
          citySlug: context.citySlug,
          items: updatedItems,
          lastActivity: Date.now(),
        });
      },

      removeItem: (itemKey: string) => {
        const state = get();
        const updatedItems = state.items.filter(
          (i) => generateCartItemKey(i) !== itemKey
        );
        set({
          items: updatedItems,
          lastActivity: Date.now(),
          ...(updatedItems.length === 0
            ? { restaurantId: null, restaurantName: '', restaurantSlug: '', citySlug: '' }
            : {}),
        });
      },

      updateQuantity: (itemKey: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(itemKey);
          return;
        }
        const clamped = Math.min(quantity, MAX_QUANTITY_PER_ITEM);
        set({
          items: get().items.map((i) =>
            generateCartItemKey(i) === itemKey
              ? {
                  ...i,
                  quantity: clamped,
                  line_total_cents: i.unit_total_cents * clamped,
                }
              : i
          ),
          lastActivity: Date.now(),
        });
      },

      clearCart: () => {
        set({
          restaurantId: null,
          restaurantName: '',
          restaurantSlug: '',
          citySlug: '',
          items: [],
          lastActivity: Date.now(),
        });
      },

      setDrawerOpen: (open: boolean) => {
        set({ isOpen: open });
      },

      getSubtotalCents: () => {
        return get().items.reduce((sum, item) => sum + item.line_total_cents, 0);
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
      // Navigation guard — restaurant page sets/clears this
      leaveGuard: null,
      setLeaveGuard: (guard) => set({ leaveGuard: guard }),
      isGoingToCheckout: false,
      setIsGoingToCheckout: (val) => set({ isGoingToCheckout: val }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        restaurantId: state.restaurantId,
        restaurantName: state.restaurantName,
        restaurantSlug: state.restaurantSlug,
        citySlug: state.citySlug,
        items: state.items,
        lastActivity: state.lastActivity,
      }),
    }
  )
);