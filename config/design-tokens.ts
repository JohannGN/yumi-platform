// ============================================================
// YUMI PLATFORM â€” DESIGN TOKENS COMPARTIDOS
// VersiÃ³n: 2.1 (DEFINITIVO)
// Fecha: 09 Feb 2026
// ============================================================
// REGLA: TODOS los mÃ³dulos DEBEN importar estos tokens.
//        PROHIBIDO definir colores, tamaÃ±os o labels ad-hoc.
// ============================================================

// === BRAND COLORS ===
export const colors = {
  brand: {
    primary: '#FF6B35',     // Naranja YUMI (CTA, botones principales)
    primaryLight: '#FF8F66',
    primaryDark: '#E55A25',
    secondary: '#1B2A4A',   // Azul navy (headers, textos fuertes)
    secondaryLight: '#2D4066',
    accent: '#FFB800',      // Amarillo (badges, notificaciones)
    accentLight: '#FFD54F',
  },
  semantic: {
    success: '#22C55E',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
  },
  orderStatus: {
    cart: '#9CA3AF',
    awaiting_confirmation: '#A78BFA',
    pending_confirmation: '#8B5CF6',
    confirmed: '#3B82F6',
    rejected: '#EF4444',
    preparing: '#F59E0B',
    ready: '#06B6D4',
    assigned_rider: '#8B5CF6',
    picked_up: '#EC4899',
    in_transit: '#F97316',
    delivered: '#22C55E',
    cancelled: '#6B7280',
  },
  riderStatus: {
    available: '#22C55E',
    busy: '#F59E0B',
    paused: '#9CA3AF',
    offline: '#6B7280',
  },
} as const;

// === THEMES ===
export const lightTheme = {
  bg: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    card: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.5)',
  },
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
    link: '#3B82F6',
  },
  border: {
    default: '#E5E7EB',
    strong: '#D1D5DB',
    focus: colors.brand.primary,
  },
  skeleton: '#E5E7EB',
} as const;

export const darkTheme = {
  bg: {
    primary: '#111827',
    secondary: '#1F2937',
    tertiary: '#374151',
    card: '#1F2937',
    overlay: 'rgba(0,0,0,0.7)',
  },
  text: {
    primary: '#F9FAFB',
    secondary: '#9CA3AF',
    tertiary: '#6B7280',
    inverse: '#111827',
    link: '#60A5FA',
  },
  border: {
    default: '#374151',
    strong: '#4B5563',
    focus: colors.brand.primaryLight,
  },
  skeleton: '#374151',
} as const;

export function getAutoTheme(): 'light' | 'dark' {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}

// === TYPOGRAPHY (Tailwind classes) ===
export const typography = {
  h1: 'text-3xl font-bold tracking-tight',
  h2: 'text-2xl font-bold',
  h3: 'text-xl font-semibold',
  h4: 'text-lg font-semibold',
  body: 'text-base font-normal',
  bodySmall: 'text-sm font-normal',
  caption: 'text-xs font-medium text-gray-500',
  price: 'text-lg font-bold tabular-nums',
  priceSmall: 'text-sm font-semibold tabular-nums',
  code: 'text-sm font-mono',
} as const;

// === STATUS LABELS (EspaÃ±ol) ===
export const orderStatusLabels: Record<string, string> = {
  cart: 'Carrito',
  awaiting_confirmation: 'Esperando confirmaciÃ³n',
  pending_confirmation: 'Pendiente de restaurante',
  confirmed: 'Confirmado',
  rejected: 'Rechazado',
  preparing: 'Preparando',
  ready: 'Listo para recoger',
  assigned_rider: 'Rider asignado',
  picked_up: 'Recogido',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const paymentMethodLabels: Record<string, string> = {
  cash: 'Efectivo', pos: 'POS / Tarjeta', yape: 'Yape', plin: 'Plin',
};

export const paymentStatusLabels: Record<string, string> = {
  pending: 'Pendiente', paid: 'Pagado', refunded: 'Reembolsado',
};

export const rejectionReasonLabels: Record<string, string> = {
  item_out_of_stock: 'Plato agotado',
  closing_soon: 'Cierra pronto',
  kitchen_issue: 'Problema en cocina',
  other: 'Otro motivo',
};

export const penaltyLevelLabels: Record<string, string> = {
  none: 'Sin penalidad', warning: 'Advertencia',
  restricted: 'Restringido', banned: 'Baneado',
};

export const escalationReasonLabels: Record<string, string> = {
  complaint: 'Queja', angry_customer: 'Cliente enojado',
  unintelligible_message: 'Mensaje incomprensible',
  technical_issue: 'Problema tÃ©cnico', refund_request: 'Reembolso',
  human_requested: 'PidiÃ³ hablar con humano',
  client_refuses_links: 'No quiere usar links',
  alcohol_request: 'Pedido de alcohol',
  medication_request: 'Pedido de medicamentos',
  large_order: 'Pedido grande', other: 'Otro',
};

export const escalationPriorityLabels: Record<string, string> = {
  low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente',
};

export const vehicleTypeLabels: Record<string, string> = {
  motorcycle: 'Moto', bicycle: 'Bicicleta', car: 'Auto',
};

export const riderPayTypeLabels: Record<string, string> = {
  fixed_salary: 'Sueldo fijo', commission: 'ComisiÃ³n',
};

// === LAYOUT TOKENS ===
export const layout = {
  maxWidth: {
    client: '430px',
    rider: '430px',
    restaurant: '1280px',
    admin: '1920px',
  },
  sidebar: { collapsed: '64px', expanded: '280px' },
  padding: {
    page: '16px', pageDesktop: '24px', card: '16px', section: '24px',
  },
  borderRadius: {
    sm: '6px', md: '8px', lg: '12px', xl: '16px', full: '9999px',
  },
} as const;

// === ANIMATIONS ===
export const animations = {
  skeleton: 'animate-pulse',
  fadeIn: 'animate-in fade-in duration-200',
  slideUp: 'animate-in slide-in-from-bottom-2 duration-200',
  slideIn: 'animate-in slide-in-from-right-2 duration-200',
  spin: 'animate-spin',
  // Heartbeat: al incrementar/decrementar cantidad en carrito
  heartbeat: 'animate-[heartbeat_0.3s_ease-in-out]',
  // Ripple/ondas: tracking en tiempo real (gotas de agua expandiÃ©ndose)
  ripple: 'animate-[ripple_1.5s_ease-out_infinite]',
  // Bounce entrada: al aÃ±adir item al carrito
  bounceIn: 'animate-[bounceIn_0.4s_cubic-bezier(0.68,-0.55,0.27,1.55)]',
  // Slide carrito drawer
  drawerSlideUp: 'animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]',
  // Pulse suave para badge de cantidad en carrito
  cartBadgePulse: 'animate-[pulse_0.5s_ease-in-out]',
  // Page transition
  pageEnter: 'animate-in fade-in slide-in-from-right-4 duration-300',
  pageExit: 'animate-out fade-out slide-out-to-left-4 duration-200',
} as const;

// CSS keyframes (inyectar en globals.css)
export const keyframes = `
@keyframes heartbeat {
  0% { transform: scale(1); }
  25% { transform: scale(1.25); }
  50% { transform: scale(1); }
  75% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
@keyframes ripple {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes bounceIn {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); }
}
@keyframes slideUp {
  0% { transform: translateY(100%); }
  100% { transform: translateY(0); }
}
`;

// === CART RULES â€” ESCRITO EN PIEDRA ===
export const cartRules = {
  singleRestaurantOnly: true,       // âš ï¸ SOLO 1 restaurante a la vez
  clearOnRestaurantChange: true,    // âš ï¸ Cambiar restaurante = borrar carrito
  clearOnNavigateAway: true,        // âš ï¸ Salir del restaurante = borrar carrito
  inactivityTimeoutMs: 2 * 60 * 60 * 1000,  // 2 horas â†’ auto-limpia localStorage
  storageKey: 'yumi_cart',
  cityKey: 'yumi_city',
  displayMode: 'drawer' as const,   // Popup/drawer, NO pÃ¡gina separada
  maxItems: 30,
  maxQuantityPerItem: 50,
  // Confirmar antes de borrar si hay items
  confirmClearThreshold: 1,         // Si hay â‰¥1 item, preguntar antes de borrar
} as const;

// === localStorage MANAGEMENT ===
export const storageKeys = {
  cart: 'yumi_cart',               // {restaurant_id, items[], updated_at}
  city: 'yumi_city',              // {slug, name}
  theme: 'yumi_theme',            // 'light' | 'dark' | 'auto'
  lastActivity: 'yumi_last_activity',
} as const;

// Cleanup: llamar en cada carga de pÃ¡gina
export function cleanupExpiredCart(): void {
  if (typeof window === 'undefined') return;
  const lastActivity = localStorage.getItem(storageKeys.lastActivity);
  if (lastActivity) {
    const elapsed = Date.now() - parseInt(lastActivity);
    if (elapsed > cartRules.inactivityTimeoutMs) {
      localStorage.removeItem(storageKeys.cart);
      localStorage.removeItem(storageKeys.lastActivity);
    }
  }
}

export function updateCartActivity(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKeys.lastActivity, Date.now().toString());
}

// === BUSINESS CONSTANTS ===
export const business = {
  orderCodeLength: 6,
  maxCartItems: 30,
  maxCartQuantity: 50,
  maxCartWeightKg: 15,
  reviewWeightKg: 10,
  confirmationTimeoutMinutes: 15,
  restaurantResponseTimeoutMinutes: 10,
  penaltyBanDays: 7,
  riderBonusThresholdKm: 5,
  riderBonusPerExtraKmCents: 50,
  gpsUpdateIntervalSeconds: 30,
  defaultPrepTimeMinutes: 30,
  whatsappWindowHours: 24,       // Meta 24h messaging window
  whatsappInitCommand: 'INICIO', // Comando para abrir ventana
  currency: 'PEN',
  currencySymbol: 'S/',
  phonePrefix: '+51',
  timezone: 'America/Lima',
  yumiWhatsApp: '+51953211536',
  alcoholMonopoly: true,         // Solo YUMI autoriza venta de alcohol
  desktopCartBlocked: true,      // Desktop NO permite armar carritos (GPS inexacto)
} as const;

// === DEVICE DETECTION ===
// Desktop: muestra landing, categorÃ­as, restaurantes, menÃºs
// Mobile: permite armar carrito y hacer pedidos
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;
}

// === WHATSAPP 24H WINDOW ===
export function isWhatsAppWindowActive(lastMessageAt: string | null): boolean {
  if (!lastMessageAt) return false;
  const diff = Date.now() - new Date(lastMessageAt).getTime();
  return diff < business.whatsappWindowHours * 60 * 60 * 1000;
}

export function getWhatsAppWindowRemaining(lastMessageAt: string | null): number {
  if (!lastMessageAt) return 0;
  const expiresAt = new Date(lastMessageAt).getTime() + (business.whatsappWindowHours * 60 * 60 * 1000);
  return Math.max(0, expiresAt - Date.now());
}

// === FORMATTERS ===
export function formatCurrency(cents: number): string {
  return `${business.currencySymbol} ${(cents / 100).toFixed(2)}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: business.timezone,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: business.timezone,
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: business.timezone,
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatPhone(phone: string): string {
  const clean = phone.replace('+51', '').replace(/\D/g, '');
  return clean.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
}

export function formatDistance(km: number): string {
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`;
}

export function formatOrderCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

// === RESTAURANT THEME PALETTES ===
// Cada restaurante elige una paleta que armoniza con YUMI
export const restaurantThemes: Record<string, {
  primary: string; primaryLight: string; primaryDark: string;
  accent: string; gradient: string; label: string;
}> = {
  orange: {
    primary: '#FF6B35', primaryLight: '#FF8F66', primaryDark: '#E55A25',
    accent: '#FFB800', gradient: 'from-orange-500 to-amber-500',
    label: 'Naranja (YUMI)',
  },
  red: {
    primary: '#EF4444', primaryLight: '#F87171', primaryDark: '#DC2626',
    accent: '#FCD34D', gradient: 'from-red-500 to-rose-500',
    label: 'Rojo Fuego',
  },
  green: {
    primary: '#22C55E', primaryLight: '#4ADE80', primaryDark: '#16A34A',
    accent: '#A3E635', gradient: 'from-green-500 to-emerald-500',
    label: 'Verde Fresco',
  },
  blue: {
    primary: '#3B82F6', primaryLight: '#60A5FA', primaryDark: '#2563EB',
    accent: '#38BDF8', gradient: 'from-blue-500 to-cyan-500',
    label: 'Azul OcÃ©ano',
  },
  purple: {
    primary: '#8B5CF6', primaryLight: '#A78BFA', primaryDark: '#7C3AED',
    accent: '#F472B6', gradient: 'from-violet-500 to-purple-500',
    label: 'PÃºrpura Real',
  },
};

// === GOOGLE MAPS CONFIG ===
export const googleMapsConfig = {
  defaultCenter: { lat: -5.7083, lng: -78.8089 },  // JaÃ©n, PerÃº
  defaultZoom: 14,
  styles: {
    rider: { icon: 'ðŸï¸', scale: 1.2 },
    restaurant: { icon: 'ðŸª', scale: 1.0 },
    customer: { icon: 'ðŸ“', scale: 1.0 },
  },
} as const;

// === TEST PHONES (solo para desarrollo) ===
export const testPhones = {
  cliente: '+51999137944',      // Gonzalo
  restaurante: '+51998832498',
  rider: '+51960229711',
} as const;

// === DEFAULT IMAGES (restaurantes sin foto propia) ===
export const defaultImages = {
  restaurantLogo: '/images/defaults/restaurant-logo.svg',
  restaurantBanner: '/images/defaults/restaurant-banner.jpg',
  menuItem: '/images/defaults/menu-item.svg',
  riderAvatar: '/images/defaults/rider-avatar.svg',
  categoryFallback: '/images/defaults/category-fallback.svg',
} as const;

// === SKELETON PATTERNS (obligatorio en TODAS las pÃ¡ginas) ===
export const skeletonConfig = {
  // Cantidad de items skeleton a mostrar por tipo
  categoryGrid: 8,       // Grilla de categorÃ­as
  restaurantList: 4,     // Lista de restaurantes
  menuItems: 6,          // Items de menÃº
  orderHistory: 3,       // Historial de pedidos
  // DuraciÃ³n mÃ­nima del skeleton (evitar flash)
  minDisplayMs: 300,
} as const;

// === ORDER TRACKING PAGE ROUTES ===
// URLs dinÃ¡micas: yumi.pe/jaen/donpep, yumi.pe/cix/brasaroja
export const routes = {
  // PÃºblico (sin auth) â€” Mobile + Desktop
  home: '/',
  city: (slug: string) => `/${slug}`,                                        // /jaen
  restaurant: (citySlug: string, restSlug: string) =>
    `/${citySlug}/${restSlug}`,                                               // /jaen/donpep
  menuItem: (citySlug: string, restSlug: string, itemId: string) =>
    `/${citySlug}/${restSlug}/${itemId}`,                                     // /jaen/donpep/uuid
  checkout: (citySlug: string, restSlug: string) =>
    `/${citySlug}/${restSlug}/checkout`,                                      // /jaen/donpep/checkout
  orderTracking: (code: string) => `/pedido/${code}`,                        // /pedido/P3V6H2
  confirmOrder: (token: string) => `/confirmar/${token}`,                    // /confirmar/abc123
  // Auth required
  adminDashboard: '/admin',
  adminOrders: '/admin/pedidos',
  adminRestaurants: '/admin/restaurantes',
  adminRiders: '/admin/riders',
  adminCategories: '/admin/categorias',
  adminCities: '/admin/ciudades',
  adminZones: '/admin/zonas',        // ðŸ—ºï¸ Dibujar/pegar polÃ­gonos de delivery
  adminMap: '/admin/mapa',
  restaurantPanel: '/restaurante',
  riderPanel: '/rider',
} as const;

// === NAVIGATION UX RULES ===
export const navigationRules = {
  // BotÃ³n "atrÃ¡s" SIEMPRE visible en mobile
  backButtonAlwaysVisible: true,
  // Breadcrumb: Inicio > JaÃ©n > Don Pep > Pollo a la brasa
  showBreadcrumb: true,
  // BÃºsqueda dentro del restaurante
  restaurantSearchEnabled: true,
  // Placeholder del buscador
  searchPlaceholder: 'Buscar platos...',
  // Desktop: mostrar banner "Pide desde tu celular"
  desktopMobileBanner: true,
} as const;
