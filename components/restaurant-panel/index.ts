// ============================================================
// Restaurant Panel — Barrel exports
// ============================================================

export { default as ConfirmModal } from './confirm-modal';
export { default as OrderCardPanel } from './order-card-panel';
export { default as OrderDetailSheet } from './order-detail-sheet';
export { default as OrdersKanban } from './orders-kanban';
export { default as RejectOrderModal } from './reject-order-modal';
export { RestaurantProvider, useRestaurant } from './restaurant-context';
export {
  RestaurantSidebar,
  RestaurantBottomNav,
  RestaurantMobileHeader,
} from './restaurant-sidebar';

// ─── Credits (CREDITOS-3B) ──────────────────────────────────
export { RestaurantCreditBalance } from './restaurant-credit-balance';
export { RestaurantCreditTransactions } from './restaurant-credit-transactions';
export { RestaurantLiquidationHistory } from './restaurant-liquidation-history';
