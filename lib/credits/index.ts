// ============================================================
// YUMI PLATFORM — CREDITOS-1B
// lib/credits/index.ts
// Barrel export del módulo de créditos
// ============================================================

export { processDeliveryCredits } from './process-delivery';
export type { DeliveryCreditsResult } from './process-delivery';

export {
  getRiderCreditBalance,
  getRestaurantCreditBalance,
  creditRestaurant,
  updateRiderCredits,
  parsePagination,
  calculateRestaurantCommission,
  calculateDeliverySplit,
} from './helpers';

export type {
  CreditBalance,
  RestaurantCreditBalance,
  TransactionInsert,
  PaginatedResponse,
} from './helpers';
