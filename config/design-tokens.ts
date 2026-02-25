// ============================================================
// YUMI PLATFORM – DESIGN TOKENS COMPARTIDOS
// Versión: 2.1 (DEFINITIVO)
// Fecha: 09 Feb 2026
// ============================================================
// REGLA: TODOS los módulos DEBEN importar estos tokens.
//        PROHIBIDO definir colores, tamaños o labels ad-hoc.
// ============================================================

// === BRAND COLORS ===
export const colors = {
  brand: {
    primary: '#FF6B35',
    primaryLight: '#FF8F66',
    primaryDark: '#E55A25',
    secondary: '#1B2A4A',
    secondaryLight: '#2D4066',
    accent: '#FFB800',
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

// === STATUS LABELS (Español) ===
export const orderStatusLabels: Record<string, string> = {
  cart: 'Carrito',
  awaiting_confirmation: 'Esperando confirmación',
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
  technical_issue: 'Problema técnico', refund_request: 'Reembolso',
  human_requested: 'Pidió hablar con humano',
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
  fixed_salary: 'Sueldo fijo', commission: 'Comisión',
};

// === COMMISSION MODE LABELS ===
export const commissionModeLabels: Record<string, string> = {
  global: 'Comisión global',
  per_item: 'Comisión por plato',
};

// === CREDIT TRANSACTION TYPE LABELS ===
export const creditTransactionTypeLabels: Record<string, string> = {
  recharge: 'Recarga de créditos',
  order_food_debit: 'Descuento porción comida',
  order_commission_debit: 'Descuento comisión YUMI',
  order_credit: 'Créditos por pedido',
  liquidation: 'Liquidación diaria',
  refund: 'Devolución de garantía',
  adjustment: 'Ajuste manual',
  voided_recharge: 'Recarga anulada',
};

// === RECHARGE CODE STATUS LABELS ===
export const rechargeCodeStatusLabels: Record<string, string> = {
  pending: 'Pendiente de canje',
  redeemed: 'Canjeado',
  voided: 'Anulado',
};

// === LIQUIDATION PAYMENT METHOD LABELS ===
export const liquidationPaymentMethodLabels: Record<string, string> = {
  yape: 'Yape',
  plin: 'Plin',
  transfer: 'Transferencia',
  cash: 'Efectivo',
};

// === AUDIT ACTION LABELS ===
export const auditActionLabels: Record<string, string> = {
  create: 'Creación',
  update: 'Actualización',
  delete: 'Eliminación',
  toggle: 'Activar/Desactivar',
  assign: 'Asignación',
};

// === USER ROLE LABELS ===
export const userRoleLabels: Record<string, string> = {
  owner: 'Propietario',
  city_admin: 'Admin Ciudad',
  agent: 'Agente',
  restaurant: 'Restaurante',
  rider: 'Rider',
};

// === USER ROLE COLORS ===
export const userRoleColors: Record<string, string> = {
  owner: '#8B5CF6',
  city_admin: '#3B82F6',
  agent: '#06B6D4',
  restaurant: '#F59E0B',
  rider: '#22C55E',
};

// === AUDIT ENTITY TYPE LABELS ===
export const auditEntityTypeLabels: Record<string, string> = {
  user: 'Usuario',
  rider: 'Rider',
  restaurant: 'Restaurante',
  order: 'Pedido',
  agent_permission: 'Permiso agente',
  agent_city: 'Ciudad agente',
  menu_item: 'Plato',
  category: 'Categoría',
  city: 'Ciudad',
  zone: 'Zona',
  recharge_code: 'Código recarga',
  credit_adjustment: 'Ajuste crédito',
  liquidation: 'Liquidación',
};

// === COMMISSION TYPE LABELS (EGRESOS-1) ===
export const commissionTypeLabels: Record<string, string> = {
  percentage: 'Porcentaje',
  fixed_per_order: 'Cuota fija por pedido',
  none: 'Sin comisión',
};

// === RECURRING PERIOD LABELS (EGRESOS-1) ===
export const recurringPeriodLabels: Record<string, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

// === CREDIT ALERT THRESHOLDS ===
export const creditThresholds = {
  minimum_cents: 10000,   // S/100 — bloqueo para pedidos cash
  warning_cents: 15000,   // S/150 — alerta amarilla
  healthy_cents: 15000,   // >= S/150 — operación normal
} as const;

// === CREDIT STATUS COLORS ===
export const creditStatusColors = {
  healthy: '#22C55E',     // Verde — saldo >= S/150
  warning: '#F59E0B',     // Amarillo — S/100-149
  critical: '#EF4444',    // Rojo — < S/100
  blocked: '#6B7280',     // Gris — S/0 (solo digital)
} as const;

// === CREDIT FORMATTERS ===
export function formatCredits(cents: number): string {
  return `${(cents / 100).toFixed(2)} créditos`;
}

export function formatRechargeCode(code: string): string {
  // A7K3M9R2 → A7K3 M9R2 (más legible)
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}

export function getCreditStatusColor(balanceCents: number): string {
  if (balanceCents >= creditThresholds.healthy_cents) return creditStatusColors.healthy;
  if (balanceCents >= creditThresholds.minimum_cents) return creditStatusColors.warning;
  if (balanceCents > 0) return creditStatusColors.critical;
  return creditStatusColors.blocked;
}

export function getCreditStatusLabel(balanceCents: number): string {
  if (balanceCents >= creditThresholds.healthy_cents) return 'Saldo saludable';
  if (balanceCents >= creditThresholds.minimum_cents) return 'Saldo bajo';
  if (balanceCents > 0) return 'Créditos insuficientes';
  return 'Sin créditos';
}

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
  heartbeat: 'animate-[heartbeat_0.3s_ease-in-out]',
  ripple: 'animate-[ripple_1.5s_ease-out_infinite]',
  bounceIn: 'animate-[bounceIn_0.4s_cubic-bezier(0.68,-0.55,0.27,1.55)]',
  drawerSlideUp: 'animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]',
  cartBadgePulse: 'animate-[pulse_0.5s_ease-in-out]',
  pageEnter: 'animate-in fade-in slide-in-from-right-4 duration-300',
  pageExit: 'animate-out fade-out slide-out-to-left-4 duration-200',
} as const;

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

// === CART RULES — ESCRITO EN PIEDRA ===
export const cartRules = {
  singleRestaurantOnly: true,
  clearOnRestaurantChange: true,
  clearOnNavigateAway: true,
  inactivityTimeoutMs: 2 * 60 * 60 * 1000,
  storageKey: 'yumi_cart',
  cityKey: 'yumi_city',
  displayMode: 'drawer' as const,
  maxItems: 30,
  maxQuantityPerItem: 50,
  confirmClearThreshold: 1,
} as const;

// === localStorage MANAGEMENT ===
export const storageKeys = {
  cart: 'yumi_cart',
  city: 'yumi_city',
  theme: 'yumi_theme',
  lastActivity: 'yumi_last_activity',
} as const;

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
  whatsappWindowHours: 24,
  whatsappInitCommand: 'INICIO',
  currency: 'PEN',
  currencySymbol: 'S/',
  phonePrefix: '+51',
  timezone: 'America/Lima',
  yumiWhatsApp: '+51953211536',
  alcoholMonopoly: true,
  desktopCartBlocked: true,
} as const;

// === DEVICE DETECTION ===
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
    label: 'Azul Océano',
  },
  purple: {
    primary: '#8B5CF6', primaryLight: '#A78BFA', primaryDark: '#7C3AED',
    accent: '#F472B6', gradient: 'from-violet-500 to-purple-500',
    label: 'Púrpura Real',
  },
};

// === GOOGLE MAPS CONFIG ===
export const googleMapsConfig = {
  defaultCenter: { lat: -5.7083, lng: -78.8089 },  // Jaén, Perú
  defaultZoom: 14,
  styles: {
    rider: { icon: '🏍️', scale: 1.2 },
    restaurant: { icon: '🪟', scale: 1.0 },
    customer: { icon: '📍', scale: 1.0 },
  },
} as const;

// === TEST PHONES ===
export const testPhones = {
  cliente: '+51999137944',
  restaurante: '+51998832498',
  rider: '+51960229711',
} as const;

// === DEFAULT IMAGES ===
export const defaultImages = {
  restaurantLogo: '/images/defaults/restaurant-logo.svg',
  restaurantBanner: '/images/defaults/restaurant-banner.jpg',
  menuItem: '/images/defaults/menu-item.svg',
  riderAvatar: '/images/defaults/rider-avatar.svg',
  categoryFallback: '/images/defaults/category-fallback.svg',
} as const;

// === SKELETON PATTERNS ===
export const skeletonConfig = {
  categoryGrid: 8,
  restaurantList: 4,
  menuItems: 6,
  orderHistory: 3,
  minDisplayMs: 300,
} as const;

// === ORDER TRACKING PAGE ROUTES ===
export const routes = {
  home: '/',
  city: (slug: string) => `/${slug}`,
  restaurant: (citySlug: string, restSlug: string) => `/${citySlug}/${restSlug}`,
  menuItem: (citySlug: string, restSlug: string, itemId: string) =>
    `/${citySlug}/${restSlug}/${itemId}`,
  checkout: (citySlug: string, restSlug: string) =>
    `/${citySlug}/${restSlug}/checkout`,
  orderTracking: (code: string) => `/pedido/${code}`,
  confirmOrder: (token: string) => `/confirmar/${token}`,
  adminDashboard: '/admin',
  adminOrders: '/admin/pedidos',
  adminRestaurants: '/admin/restaurantes',
  adminRiders: '/admin/riders',
  adminCategories: '/admin/categorias',
  adminCities: '/admin/ciudades',
  adminZones: '/admin/zonas',
  adminMap: '/admin/mapa',
  restaurantPanel: '/restaurante',
  riderPanel: '/rider',
} as const;

// === NAVIGATION UX RULES ===
export const navigationRules = {
  backButtonAlwaysVisible: true,
  showBreadcrumb: true,
  restaurantSearchEnabled: true,
  searchPlaceholder: 'Buscar platos...',
  desktopMobileBanner: true,
} as const;
