// ============================================================
// YUMI — Design Tokens Re-export
// ============================================================
// Todos los módulos DEBEN importar de aquí.
// PROHIBIDO definir colores, tamaños o labels ad-hoc.
// ============================================================

export {
  colors,
  lightTheme,
  darkTheme,
  getAutoTheme,
  typography,
  orderStatusLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  rejectionReasonLabels,
  penaltyLevelLabels,
  escalationReasonLabels,
  escalationPriorityLabels,
  vehicleTypeLabels,
  riderPayTypeLabels,
  // FIX-6
  commissionModeLabels,
  // CREDITOS-1A
  creditTransactionTypeLabels,
  rechargeCodeStatusLabels,
  liquidationPaymentMethodLabels,
  creditThresholds,
  creditStatusColors,
  formatCredits,
  formatRechargeCode,
  getCreditStatusColor,
  getCreditStatusLabel,
  // ADMIN-FIN-3
  auditActionLabels,
  userRoleLabels,
  userRoleColors,
  auditEntityTypeLabels,
  // Layout + animations
  layout,
  animations,
  keyframes,
  cartRules,
  storageKeys,
  cleanupExpiredCart,
  updateCartActivity,
  business,
  isMobileDevice,
  isWhatsAppWindowActive,
  getWhatsAppWindowRemaining,
  formatCurrency,
  formatDate,
  formatDateShort,
  formatTime,
  formatPhone,
  formatDistance,
  formatOrderCode,
  restaurantThemes,
  googleMapsConfig,
  defaultImages,
  skeletonConfig,
  routes,
  navigationRules,
} from './design-tokens';

// NOTE: El archivo design-tokens.ts es una copia exacta de
// YUMI-DESIGN-TOKENS.ts del Knowledge Base.
// Se importa como: import { colors, formatCurrency } from '@/config/tokens';
