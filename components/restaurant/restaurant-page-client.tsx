'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, ArrowLeft, Trash2 } from 'lucide-react';
import type { Restaurant, MenuCategory, MenuItem, ItemModifierGroup, ThemeColor } from '@/types/database';
import { RestaurantHeader } from '@/components/restaurant/restaurant-header';
import { MenuCategoryScroll } from '@/components/restaurant/menu-category-scroll';
import { MenuSection } from '@/components/restaurant/menu-section';
import { ItemDetailSheet } from '@/components/restaurant/item-detail-sheet';
import { FloatingCartButton } from '@/components/cart/floating-cart-button';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useCartStore } from '@/stores/cart-store';

interface RestaurantPageClientProps {
  restaurant: Restaurant;
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  modifiersByItem: Record<string, ItemModifierGroup[]>;
  citySlug: string;
  cityName: string;
}

export function RestaurantPageClient({
  restaurant,
  menuCategories,
  menuItems,
  modifiersByItem = {},
  citySlug,
  cityName,
}: RestaurantPageClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    menuCategories[0]?.id ?? null
  );
  const isMobile = useIsMobile();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isScrollingTo = useRef(false);

  // ============================================================
  // CART LOGIC
  // ============================================================
  const cartItems = useCartStore((s) => s.items);
  const cartRestaurantId = useCartStore((s) => s.restaurantId);
  const cartRestaurantName = useCartStore((s) => s.restaurantName);
  const clearCart = useCartStore((s) => s.clearCart);
  const editingItemId = useCartStore((s) => s.editingItemId);
  const setEditingItemId = useCartStore((s) => s.setEditingItemId);
  const setLeaveGuard = useCartStore((s) => s.setLeaveGuard);

  const cartCount =
    cartRestaurantId === restaurant.id
      ? cartItems.reduce((sum, item) => sum + item.quantity, 0)
      : 0;


  // ============================================================
  // CONFLICT MODAL — carrito de OTRO restaurante
  // ============================================================
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictName, setConflictName] = useState('');

  useEffect(() => {
    const state = useCartStore.getState();
    if (
      state.items.length > 0 &&
      state.restaurantId &&
      state.restaurantId !== restaurant.id
    ) {
      setConflictName(state.restaurantName);
      setShowConflictModal(true);
    }
  }, [restaurant.id]);

  const handleConflictGoBack = () => {
    const state = useCartStore.getState();
    router.push(`/${state.citySlug}/${state.restaurantSlug}`);
  };

  const handleConflictClearAndStay = () => {
    clearCart();
    setShowConflictModal(false);
  };

  // ============================================================
  // LEAVE MODAL — salir con carrito lleno de ESTE restaurante
  // ============================================================
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const pendingLeaveUrl = useRef<string | null>(null);

  // Interceptar navegación: wrapper para links internos
  const handleNavigateAway = useCallback(
    (href: string) => {
      const state = useCartStore.getState();
      if (
        state.items.length > 0 &&
        state.restaurantId === restaurant.id
      ) {
        pendingLeaveUrl.current = href;
        setShowLeaveModal(true);
        return;
      }
      router.push(href);
    },
    [restaurant.id, router]
  );

const handleLeaveConfirm = () => {
    setLeaveGuard(null);
    clearCart();
    setShowLeaveModal(false);

    if (pendingLeaveUrl.current) {
      // Navegación programática (breadcrumb, logo, etc.)
      router.push(pendingLeaveUrl.current);
    } else if (popstateBlocked.current) {
      // Venía del botón atrás del navegador / swipe
      // Necesitamos retroceder 2 veces: la entrada extra que empujamos + la original
      popstateBlocked.current = false;
      window.history.go(-2);
    } else {
      router.back();
    }
  };
  const handleLeaveCancel = () => {
    setShowLeaveModal(false);
    pendingLeaveUrl.current = null;
  };

  // ============================================================
  // NAVIGATION GUARD — registrar/limpiar al montar/desmontar
  // ============================================================
useEffect(() => {
    const guard = (targetUrl: string | null): boolean => {
      const state = useCartStore.getState();

      // Dejar pasar si va al checkout
      if (targetUrl?.includes(`/${restaurant.slug}/checkout`)) {
        state.setIsGoingToCheckout(true);
        return false;
      }

      if (
        state.items.length > 0 &&
        state.restaurantId === restaurant.id
      ) {
        pendingLeaveUrl.current = targetUrl;
        setShowLeaveModal(true);
        return true;
      }
      return false;
    };

    setLeaveGuard(guard);

    return () => {
      setLeaveGuard(null);
    };
  }, [restaurant.id, restaurant.slug, setLeaveGuard]);

// Interceptar botón "atrás" del navegador / swipe móvil
  const popstateBlocked = useRef(false);

  useEffect(() => {
    const hasCartItems = () => {
      const s = useCartStore.getState();
      return s.items.length > 0 && s.restaurantId === restaurant.id;
    };

    if (!hasCartItems()) return;

    // Empujar una entrada extra para poder interceptar el "atrás"
    window.history.pushState({ yumiCart: true }, '', window.location.href);

    const handlePopState = () => {
      if (hasCartItems()) {
        // Re-empujar para mantener al usuario en la página
        window.history.pushState({ yumiCart: true }, '', window.location.href);
        popstateBlocked.current = true;
        pendingLeaveUrl.current = null;
        setShowLeaveModal(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [restaurant.id, cartCount]);

// Safety net: limpiar carrito al desmontar SOLO si no hay guard activo
  // (si el guard está activo, el modal se encarga de limpiar)
useEffect(() => {
    return () => {
      const state = useCartStore.getState();
      // Si el guard sigue activo, NO limpiar — el modal lo maneja
      if (state.leaveGuard) return;
      // Si va al checkout, NO limpiar
      if (state.isGoingToCheckout) return;
      if (state.items.length > 0 && state.restaurantId === restaurant.id) {
        state.clearCart();
      }
    };
  }, [restaurant.id]);
  // ============================================================
  // EDITING ITEM FROM CART DRAWER
  // ============================================================
  useEffect(() => {
    if (editingItemId) {
      const itemToEdit = menuItems.find((mi) => mi.id === editingItemId);
      if (itemToEdit) {
        setSelectedItem(itemToEdit);
      }
      setEditingItemId(null);
    }
  }, [editingItemId, menuItems, setEditingItemId]);

  // ============================================================
  // MENU FILTERING & GROUPING
  // ============================================================
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return menuItems;
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [menuItems, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups: { category: MenuCategory | null; items: MenuItem[] }[] = [];
    for (const cat of menuCategories) {
      const catItems = filteredItems
        .filter((item) => item.menu_category_id === cat.id)
        .sort((a, b) => a.display_order - b.display_order);
      if (catItems.length > 0) {
        groups.push({ category: cat, items: catItems });
      }
    }
    const uncategorized = filteredItems.filter((item) => !item.menu_category_id);
    if (uncategorized.length > 0) {
      groups.push({ category: null, items: uncategorized });
    }
    return groups;
  }, [menuCategories, filteredItems]);

  const visibleCategories = useMemo(() => {
    return groupedItems
      .filter((g) => g.category !== null)
      .map((g) => g.category as MenuCategory);
  }, [groupedItems]);

  useEffect(() => {
    if (!searchQuery && visibleCategories.length > 0) {
      setActiveCategoryId(visibleCategories[0].id);
    }
  }, [searchQuery, visibleCategories]);

  // ============================================================
  // SCROLL SPY
  // ============================================================
  const handleScroll = useCallback(() => {
    if (isScrollingTo.current || searchQuery) return;
    const offset = 160;
    let currentId: string | null = null;
    for (const group of groupedItems) {
      const id = group.category?.id ?? 'uncategorized';
      const el = sectionRefs.current[id];
      if (el) {
        const top = el.getBoundingClientRect().top;
        if (top <= offset) currentId = id;
      }
    }
    if (currentId && currentId !== activeCategoryId) {
      setActiveCategoryId(currentId);
    }
  }, [groupedItems, activeCategoryId, searchQuery]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    const el = sectionRefs.current[categoryId];
    if (el) {
      isScrollingTo.current = true;
      const top = el.getBoundingClientRect().top + window.scrollY - 150;
      window.scrollTo({ top, behavior: 'smooth' });
      setTimeout(() => {
        isScrollingTo.current = false;
      }, 600);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="pb-28">
      <RestaurantHeader restaurant={restaurant} citySlug={citySlug} />

      {/* Breadcrumb con navegación controlada */}
      <div className="flex items-center gap-1 px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
        <button
          onClick={() => handleNavigateAway(`/${citySlug}`)}
          className="transition-colors hover:text-orange-500"
        >
          {cityName}
        </button>
        <span>/</span>
        <span className="truncate font-medium text-gray-700 dark:text-gray-300">
          {restaurant.name}
        </span>
      </div>

      {menuCategories.length > 0 && (
        <MenuCategoryScroll
          categories={visibleCategories}
          activeId={activeCategoryId}
          onSelect={handleCategorySelect}
          themeColor={restaurant.theme_color}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={`Buscar en ${restaurant.name}...`}
        />
      )}

      {!restaurant.is_open && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 dark:bg-gray-800">
          <span className="text-lg">🕐</span>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Este restaurante está cerrado. Puedes ver el menú y los precios,
            pero no podrás hacer pedidos hasta que abra.
          </p>
        </div>
      )}

      {groupedItems.length > 0 ? (
        groupedItems.map((group) => {
          const sectionId = group.category?.id ?? 'uncategorized';
          return (
            <div
              key={sectionId}
              ref={(el) => {
                sectionRefs.current[sectionId] = el;
              }}
            >
              <MenuSection
                category={group.category}
                items={group.items}
                onItemClick={setSelectedItem}
                isMobile={isMobile}
                restaurantTheme={restaurant.theme_color as ThemeColor}
                isRestaurantOpen={restaurant.is_open}
              />
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center py-16 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <span className="text-3xl grayscale">🍳</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-200">
            No encontramos &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="mt-1 max-w-[200px] text-xs text-gray-500 dark:text-gray-400">
            Intenta con otro nombre o busca en otra categoría.
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-gray-800 active:scale-95 dark:bg-white dark:text-gray-900"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      )}

      <ItemDetailSheet
        item={selectedItem}
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        restaurantSlug={restaurant.slug}
        citySlug={citySlug}
        themeColor={restaurant.theme_color}
        isRestaurantOpen={restaurant.is_open}
        modifierGroups={
          selectedItem
            ? ((modifiersByItem ?? {})[selectedItem.id] ?? [])
            : []
        }
      />

      {isMobile && cartCount > 0 && (
        <FloatingCartButton count={cartCount} />
      )}

      {/* ============================================================
          MODAL: Conflicto de restaurante (carrito de otro restaurante)
          ============================================================ */}
      <AnimatePresence>
        {showConflictModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/20">
                <ShoppingCart className="h-7 w-7 text-orange-500" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">
                Tienes un pedido pendiente
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Tu carrito tiene productos de{' '}
                <strong className="text-gray-700 dark:text-gray-300">
                  {conflictName}
                </strong>
                . Solo puedes pedir de un restaurante a la vez.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={handleConflictGoBack}
                  className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-orange-600 active:scale-[0.98]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a {conflictName}
                </button>
                <button
                  onClick={handleConflictClearAndStay}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Vaciar y pedir aquí
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          MODAL: Confirmar salida (carrito de ESTE restaurante)
          ============================================================ */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                <ShoppingCart className="h-7 w-7 text-red-500" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">
                ¿Salir del restaurante?
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Tienes{' '}
                <strong className="text-gray-700 dark:text-gray-300">
                  {cartCount} {cartCount === 1 ? 'producto' : 'productos'}
                </strong>{' '}
                en tu carrito. Si sales, perderás tu pedido.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={handleLeaveCancel}
                  className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-orange-600 active:scale-[0.98]"
                >
                  Seguir pidiendo
                </button>
                <button
                  onClick={handleLeaveConfirm}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Salir y vaciar carrito
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}