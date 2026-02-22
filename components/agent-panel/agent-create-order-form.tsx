'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgent } from '@/components/agent-panel/agent-context';
import {
  formatCurrency,
  paymentMethodLabels,
} from '@/config/design-tokens';
import type { AgentCreateOrderPayload } from '@/types/agent-panel';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Minus,
  Loader2,
  Store,
  MapPin,
  Check,
  AlertCircle,
} from 'lucide-react';

// ── Types ──
interface RestaurantOption {
  id: string;
  name: string;
  slug: string;
  is_open: boolean;
  address: string;
}

interface MenuItemOption {
  id: string;
  name: string;
  base_price_cents: number;
  is_available: boolean;
  category_name: string | null;
}

interface CartLine {
  item_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const STEPS = ['Restaurante', 'Items', 'Cliente', 'Pago', 'Confirmar'];
const PAYMENT_OPTIONS = ['cash', 'pos', 'yape', 'plin'] as const;

export function AgentCreateOrderForm({ isOpen, onClose, onCreated }: Props) {
  const { activeCityId } = useAgent();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Restaurant
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantOption | null>(null);

  // Step 2: Items
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  // Step 3: Customer
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLat, setDeliveryLat] = useState(-5.7083);
  const [deliveryLng, setDeliveryLng] = useState(-78.8089);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Step 4: Payment
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [deliveryFeeCents, setDeliveryFeeCents] = useState(300);
  const [feeIsManual, setFeeIsManual] = useState(true);
  const [notes, setNotes] = useState('');

  // Fetch restaurants
  const fetchRestaurants = useCallback(async () => {
    if (!activeCityId) return;
    setLoadingRestaurants(true);
    try {
      const res = await fetch(`/api/admin/restaurants?city_id=${activeCityId}&limit=100`);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      const list = (data.data ?? data).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        slug: r.slug as string,
        is_open: r.is_open as boolean,
        address: r.address as string,
      }));
      setRestaurants(list);
    } catch {
      setRestaurants([]);
    } finally {
      setLoadingRestaurants(false);
    }
  }, [activeCityId]);

  // Fetch menu items
  const fetchMenu = useCallback(async (restaurantId: string) => {
    setLoadingMenu(true);
    try {
      const res = await fetch(`/api/admin/menu/${restaurantId}`);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      // Flatten menu categories → items
      const items: MenuItemOption[] = [];
      if (Array.isArray(data.categories)) {
        for (const cat of data.categories) {
          for (const item of cat.items ?? []) {
            items.push({
              id: item.id,
              name: item.name,
              base_price_cents: item.base_price_cents,
              is_available: item.is_available,
              category_name: cat.name,
            });
          }
        }
      }
      // Also handle uncategorized items
      if (Array.isArray(data.uncategorized)) {
        for (const item of data.uncategorized) {
          items.push({
            id: item.id,
            name: item.name,
            base_price_cents: item.base_price_cents,
            is_available: item.is_available,
            category_name: null,
          });
        }
      }
      setMenuItems(items);
    } catch {
      setMenuItems([]);
    } finally {
      setLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRestaurants();
    }
  }, [isOpen, fetchRestaurants]);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchMenu(selectedRestaurant.id);
      setCart([]);
      setMenuSearch('');
    }
  }, [selectedRestaurant, fetchMenu]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setSelectedRestaurant(null);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setDeliveryInstructions('');
      setPaymentMethod('cash');
      setDeliveryFeeCents(300);
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  // Cart helpers
  function addToCart(item: MenuItemOption) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item_id === item.id
            ? { ...c, quantity: c.quantity + 1, total_cents: (c.quantity + 1) * c.unit_price_cents }
            : c
        );
      }
      return [...prev, {
        item_id: item.id,
        name: item.name,
        quantity: 1,
        unit_price_cents: item.base_price_cents,
        total_cents: item.base_price_cents,
      }];
    });
  }

  function updateQuantity(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.item_id === itemId
            ? { ...c, quantity: c.quantity + delta, total_cents: (c.quantity + delta) * c.unit_price_cents }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  const subtotalCents = cart.reduce((s, c) => s + c.total_cents, 0);
  const totalCents = subtotalCents + deliveryFeeCents;

  // Validation
  function canProceed(): boolean {
    switch (step) {
      case 0: return selectedRestaurant !== null;
      case 1: return cart.length > 0;
      case 2: return customerName.trim().length >= 2 && customerPhone.trim().length >= 9 && deliveryAddress.trim().length >= 5;
      case 3: return deliveryFeeCents >= 0;
      default: return true;
    }
  }

  // Submit
  async function handleSubmit() {
    if (!activeCityId || !selectedRestaurant) return;
    setSubmitting(true);
    setError(null);

    const payload: AgentCreateOrderPayload = {
      city_id: activeCityId,
      restaurant_id: selectedRestaurant.id,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim().startsWith('+51')
        ? customerPhone.trim()
        : `+51${customerPhone.trim().replace(/\D/g, '')}`,
      delivery_address: deliveryAddress.trim(),
      delivery_lat: deliveryLat,
      delivery_lng: deliveryLng,
      delivery_instructions: deliveryInstructions.trim() || undefined,
      items: cart.map((c) => ({
        item_id: c.item_id,
        name: c.name,
        quantity: c.quantity,
        unit_price_cents: c.unit_price_cents,
        total_cents: c.total_cents,
      })),
      payment_method: paymentMethod,
      delivery_fee_cents: deliveryFeeCents,
      fee_is_manual: feeIsManual,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch('/api/agent/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Error al crear pedido');
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(restaurantSearch.toLowerCase())
  );

  const filteredMenu = menuItems.filter((m) =>
    m.is_available && m.name.toLowerCase().includes(menuSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Crear pedido manual</h3>
            <div className="flex items-center gap-1 mt-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center">
                  <span
                    className={[
                      'text-[10px] font-medium px-1.5 py-0.5 rounded',
                      i === step ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                      i < step ? 'text-green-600 dark:text-green-400' :
                      'text-gray-400 dark:text-gray-500',
                    ].join(' ')}
                  >
                    {i < step ? '✓' : ''} {s}
                  </span>
                  {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 mx-0.5" />}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 0: Select Restaurant */}
          {step === 0 && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar restaurante..."
                  value={restaurantSearch}
                  onChange={(e) => setRestaurantSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              {loadingRestaurants ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {filteredRestaurants.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRestaurant(r)}
                      className={[
                        'w-full text-left px-4 py-3 rounded-lg border transition-colors',
                        selectedRestaurant?.id === r.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{r.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={[
                            'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                            r.is_open ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500',
                          ].join(' ')}>
                            {r.is_open ? 'Abierto' : 'Cerrado'}
                          </span>
                          {selectedRestaurant?.id === r.id && (
                            <Check className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-6">{r.address}</p>
                    </button>
                  ))}
                  {filteredRestaurants.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">No se encontraron restaurantes</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Select Items */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar plato..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {loadingMenu ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto">
                  {filteredMenu.map((item) => {
                    const inCart = cart.find((c) => c.item_id === item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900 dark:text-white truncate">{item.name}</p>
                          {item.category_name && (
                            <p className="text-[10px] text-gray-400">{item.category_name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                            {formatCurrency(item.base_price_cents)}
                          </span>
                          {inCart ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="h-7 px-2.5 flex items-center gap-1 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cart summary */}
              {cart.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Resumen ({cart.length} items)</p>
                  {cart.map((c) => (
                    <div key={c.item_id} className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                      <span>{c.quantity}x {c.name}</span>
                      <span className="tabular-nums font-medium">{formatCurrency(c.total_cents)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatCurrency(subtotalCents)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Customer */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del cliente *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono WhatsApp *</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">+51</span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="987654321"
                    maxLength={12}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  Dirección de entrega *
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Jr. Ejemplo 123, Jaén"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Latitud</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={deliveryLat}
                    onChange={(e) => setDeliveryLat(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs tabular-nums focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Longitud</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={deliveryLng}
                    onChange={(e) => setDeliveryLng(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs tabular-nums focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Referencia (opcional)</label>
                <input
                  type="text"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="Portón verde, 2do piso"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Método de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map((pm) => (
                    <button
                      key={pm}
                      onClick={() => setPaymentMethod(pm)}
                      className={[
                        'px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                        paymentMethod === pm
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                      ].join(' ')}
                    >
                      {paymentMethodLabels[pm]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fee de delivery (céntimos)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={deliveryFeeCents}
                    onChange={(e) => {
                      setDeliveryFeeCents(parseInt(e.target.value) || 0);
                      setFeeIsManual(true);
                    }}
                    className="w-32 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm tabular-nums focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <span className="text-sm text-gray-500">= {formatCurrency(deliveryFeeCents)}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Fee manual. Mínimo: lo que calcule el sistema.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas del agente (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Instrucciones especiales, notas internas..."
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Restaurante</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedRestaurant?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cliente</span>
                  <span className="font-medium text-gray-900 dark:text-white">{customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Teléfono</span>
                  <span className="font-medium text-gray-900 dark:text-white">{customerPhone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Dirección</span>
                  <span className="font-medium text-gray-900 dark:text-white text-right max-w-[250px]">{deliveryAddress}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pago</span>
                  <span className="font-medium text-gray-900 dark:text-white">{paymentMethodLabels[paymentMethod]}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 space-y-1">
                  {cart.map((c) => (
                    <div key={c.item_id} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{c.quantity}x {c.name}</span>
                      <span className="tabular-nums">{formatCurrency(c.total_cents)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 space-y-1">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatCurrency(subtotalCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Delivery</span>
                    <span className="tabular-nums">{formatCurrency(deliveryFeeCents)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(totalCents)}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step > 0 ? 'Anterior' : 'Cancelar'}
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Crear pedido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
