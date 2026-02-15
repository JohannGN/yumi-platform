// ============================================================
// YUMI — Utilidades de redondeo monetario
// REGLA: SIEMPRE redondear a favor de YUMI (hacia arriba)
// ============================================================
// En Perú, la moneda más pequeña en circulación común es S/ 0.10
// Si el cálculo da S/ 4.23, el cliente paga S/ 4.30
// Si da S/ 4.20, se queda en S/ 4.20 (ya es exacto)
// ============================================================

/**
 * Redondea céntimos hacia ARRIBA al múltiplo de 10 más cercano.
 * Ejemplo: 423 → 430, 420 → 420, 451 → 460, 499 → 500
 * 
 * @param cents - Monto en céntimos (integer)
 * @returns Monto redondeado hacia arriba al múltiplo de 10
 */
export function roundUpCents(cents: number): number {
  return Math.ceil(cents / 10) * 10;
}

/**
 * Calcula el delivery fee con redondeo YUMI.
 * base + (distancia_km × per_km), redondeado arriba, con min/max cap.
 * 
 * @param baseCents - Tarifa base en céntimos
 * @param distanceKm - Distancia en km (restaurante → cliente)
 * @param perKmCents - Céntimos por km adicional
 * @param minCents - Fee mínimo
 * @param maxCents - Fee máximo (cap)
 * @returns Fee final en céntimos (redondeado arriba a múltiplo de 10)
 */
export function calculateDeliveryFeeCents(
  baseCents: number,
  distanceKm: number,
  perKmCents: number,
  minCents: number,
  maxCents: number,
): number {
  // Cálculo crudo: base + (km × tarifa_por_km)
  const rawFee = baseCents + (distanceKm * perKmCents);

  // Aplicar min/max
  const clampedFee = Math.max(minCents, Math.min(maxCents, rawFee));

  // Redondear ARRIBA al múltiplo de 10 (a favor de YUMI)
  return roundUpCents(Math.ceil(clampedFee));
}

/**
 * Redondea el subtotal del carrito hacia arriba.
 * Aplica después de sumar todos los items.
 * 
 * @param subtotalCents - Subtotal crudo en céntimos
 * @returns Subtotal redondeado arriba a múltiplo de 10
 */
export function roundSubtotal(subtotalCents: number): number {
  return roundUpCents(subtotalCents);
}

/**
 * Calcula el total final del pedido con redondeo YUMI.
 * total = roundUp(subtotal) + roundUp(deliveryFee) + serviceFee - discount
 * 
 * @returns Total en céntimos, redondeado arriba
 */
export function calculateOrderTotal(params: {
  subtotalCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  discountCents: number;
}): number {
  const { subtotalCents, deliveryFeeCents, serviceFeeCents, discountCents } = params;

  // Cada componente se redondea individualmente hacia arriba
  const roundedSubtotal = roundUpCents(subtotalCents);
  const roundedDelivery = roundUpCents(deliveryFeeCents);
  const roundedService = roundUpCents(serviceFeeCents);

  // El descuento NO se redondea (se resta tal cual)
  const total = roundedSubtotal + roundedDelivery + roundedService - discountCents;

  // Total final también redondeado arriba
  return roundUpCents(Math.max(0, total));
}

/**
 * Formatea céntimos a string legible con símbolo.
 * Siempre muestra 2 decimales.
 * 
 * @param cents - Monto en céntimos
 * @returns String formateado, ej: "S/ 4.30"
 */
export function formatPrice(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}
