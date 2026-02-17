// ============================================================
// YUMI — Sanitización de pedidos para panel restaurante
// Regla: El restaurante NUNCA ve datos del cliente
// ============================================================

/**
 * Campos que el restaurante NO debe ver jamás.
 * Se stripean tanto en la API como en los payloads de Realtime.
 */
const SENSITIVE_FIELDS = [
  'customer_name',
  'customer_phone',
  'delivery_address',
  'delivery_lat',
  'delivery_lng',
  'delivery_instructions',
  'delivery_fee_cents',
  'delivery_zone_id',
  'service_fee_cents',
  'discount_cents',
  'total_cents',
  'rider_bonus_cents',
  'confirmation_token',
  'confirmation_expires_at',
  'rider_to_rest_distance_km',
  'rest_to_client_distance_km',
  'total_delivery_distance_km',
  'payment_method',
  'payment_status',
] as const;

/**
 * Elimina campos sensibles de un pedido antes de enviarlo al restaurante.
 * El restaurante solo necesita: código, items, subtotal, método de pago, estado, rider asignado.
 */
export function sanitizeOrderForRestaurant<T extends Record<string, unknown>>(order: T): Omit<T, (typeof SENSITIVE_FIELDS)[number]> {
  const sanitized = { ...order };
  for (const field of SENSITIVE_FIELDS) {
    delete (sanitized as Record<string, unknown>)[field];
  }
  return sanitized as Omit<T, (typeof SENSITIVE_FIELDS)[number]>;
}

/**
 * Sanitiza un array de pedidos.
 */
export function sanitizeOrdersForRestaurant<T extends Record<string, unknown>>(orders: T[]): Omit<T, (typeof SENSITIVE_FIELDS)[number]>[] {
  return orders.map(sanitizeOrderForRestaurant);
}
