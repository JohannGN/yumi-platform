'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, X, ChevronRight, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import type { MenuCategory } from '@/types/database';
import { getRestaurantTheme } from '@/lib/utils/restaurant';

interface MenuCategoryScrollProps {
  categories: MenuCategory[];
  activeId: string | null;
  onSelect: (categoryId: string) => void;
  themeColor: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
}

export function MenuCategoryScroll({
  categories,
  activeId,
  onSelect,
  themeColor,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Buscar en el menú...',
}: MenuCategoryScrollProps) {
  const theme = getRestaurantTheme(themeColor);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Refs
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); // Referencia al input
  const startScrollY = useRef(0);
  const scrollListenerActive = useRef(false); // Flag para el tiempo de gracia

  const activeCategoryName = categories.find((c) => c.id === activeId)?.name || 'Menú';

  const handleCategoryClick = (id: string) => {
    onSelect(id);
    setIsMenuOpen(false);
  };

  const handleCloseSearch = () => {
    onSearchChange('');
    setIsSearchOpen(false);
  };

  const handleOpenSearch = () => {
    startScrollY.current = window.scrollY;
    setIsSearchOpen(true);
    
    // TIEMPO DE GRACIA: No escuchar scroll por 500ms (lo que tarda el teclado en salir)
    scrollListenerActive.current = false;
    setTimeout(() => {
      scrollListenerActive.current = true;
      // Asegurar foco después de la animación
      inputRef.current?.focus();
    }, 500);
  };

  // --- LÓGICA DE CIERRE AUTOMÁTICO ---
  useEffect(() => {
    if (!isSearchOpen || searchQuery.trim() !== '') return;

    const handleScroll = () => {
      // 1. Si estamos en tiempo de gracia (teclado abriéndose), ignorar.
      if (!scrollListenerActive.current) return;

      // 2. Si el usuario está escribiendo (input tiene foco), IGNORAR SCROLL.
      // Esto evita que se cierre si el navegador ajusta la pantalla por el teclado.
      if (document.activeElement === inputRef.current) return;

      const scrollDelta = Math.abs(window.scrollY - startScrollY.current);

      // 3. Tolerancia aumentada a 60px para evitar cierres por "rebotes" al soltar el dedo
      if (scrollDelta > 60) { 
        setIsSearchOpen(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSearchOpen, searchQuery]);

  return (
    <>
      <div className="sticky top-14 z-30 w-full border-b border-gray-200/50 bg-white/80 backdrop-blur-md transition-all dark:border-white/5 dark:bg-gray-950/80">
        <div className="mx-auto max-w-md px-4 py-3" ref={searchContainerRef}>
          <AnimatePresence mode="wait">
            {isSearchOpen ? (
              /* --- MODO BÚSQUEDA --- */
              <motion.div
                key="search-mode"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex w-full items-center gap-3"
              >
                <div className="relative flex-1 group">
                  <Search 
                    className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-gray-600 dark:text-gray-500 dark:group-focus-within:text-gray-300" 
                  />
                  <input
                    ref={inputRef} // Conectamos el ref aquí
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-100 pl-10 pr-4 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:ring-0 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:bg-gray-950"
                    style={{ 
                      borderColor: searchQuery || isSearchOpen ? undefined : undefined 
                    }}
                    onFocus={(e) => e.target.style.borderColor = theme.primary}
                    onBlur={(e) => e.target.style.borderColor = ''}
                  />
                </div>
                <button
                  onClick={handleCloseSearch}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-transparent text-gray-500 hover:bg-gray-100 active:scale-95 transition-all dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <span className="text-xs font-medium">Cancelar</span>
                </button>
              </motion.div>
            ) : (
              /* --- MODO NAVEGACIÓN --- */
              <motion.div
                key="nav-mode"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center justify-between gap-3"
              >
                {/* BOTÓN IZQUIERDO: Selector de Categoría */}
                <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <SheetTrigger asChild>
                    <button 
                      className="group flex flex-1 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white py-2.5 pl-2.5 pr-4 shadow-sm transition-all active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div 
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors"
                          style={{ 
                            backgroundColor: `${theme.primary}15`,
                            color: theme.primary 
                          }}
                        >
                          <Menu className="h-4 w-4" />
                        </div>
                        
                        <div className="flex flex-col items-start truncate">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            Viendo
                          </span>
                          <span className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                            {activeCategoryName}
                          </span>
                        </div>
                      </div>

                      <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-data-[state=open]:rotate-180 dark:text-gray-600" />
                    </button>
                  </SheetTrigger>

                  <SheetContent side="bottom" className="rounded-t-[2rem] border-gray-100 bg-white px-0 pb-6 pt-2 dark:border-gray-800 dark:bg-gray-950">
                    <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-200 dark:bg-gray-800" />
                    
                    <SheetHeader className="px-6 pb-4 text-left">
                      <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        Menú
                      </SheetTitle>
                      <SheetDescription className="text-gray-500 dark:text-gray-400">
                        Navega rápidamente entre secciones.
                      </SheetDescription>
                    </SheetHeader>

                    <div className="max-h-[60vh] overflow-y-auto px-4">
                      <div className="space-y-1">
                        {categories.map((cat) => {
                          const isActive = activeId === cat.id;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => handleCategoryClick(cat.id)}
                              className={`group flex w-full items-center justify-between rounded-xl p-4 transition-all active:scale-[0.98] ${
                                isActive 
                                  ? 'bg-gray-50 dark:bg-gray-900' 
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div 
                                  className={`h-2 w-2 rounded-full transition-all ${
                                    isActive ? 'scale-100' : 'scale-0 opacity-0'
                                  }`}
                                  style={{ backgroundColor: theme.primary }}
                                />
                                <span 
                                  className={`text-sm ${
                                    isActive 
                                      ? 'font-bold text-gray-900 dark:text-white' 
                                      : 'font-medium text-gray-600 dark:text-gray-400'
                                  }`}
                                >
                                  {cat.name}
                                </span>
                              </div>
                              
                              {isActive && (
                                <ChevronRight 
                                  className="h-4 w-4" 
                                  style={{ color: theme.primary }}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                {/* BOTÓN DERECHO: Buscar */}
                <button
                  onClick={handleOpenSearch}
                  className="group flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm transition-all active:scale-95 dark:border-gray-800 dark:bg-gray-900"
                  aria-label="Buscar"
                >
                  <Search className="h-5 w-5 text-gray-600 transition-colors group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}