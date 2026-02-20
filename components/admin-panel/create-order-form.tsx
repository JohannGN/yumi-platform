'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { X, Loader2, ChevronRight, ChevronLeft, ShoppingBag } from 'lucide-react';
import { paymentMethodLabels } from '@/config/tokens';

interface Restaurant { id: string; name: string; lat: number; lng: number; city_id: string }
interface MenuItem   { id: string; name: string; base_price_cents: number; menu_category_id: string | null }

interface CartLine {
  item_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

interface CreateOrderFormProps {
  onClose: () => void;
  onCreated: (code: string) => void;
}

const STEPS = ['Restaurante', 'Productos', 'Cliente', 'Resumen'];
const DELIVERY_FEE = 500; // S/ 5.00 fijo para pedidos de agente
const PAYMENT_METHODS = ['cash', 'pos', 'yape', 'plin'] as const;

function formatPrice(cents: number) {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

export function CreateOrderForm({ onClose, onCreated }: CreateOrderFormProps) {
  const [step, setStep]                   = useState(0);
  const [restaurants, setRestaurants]     = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems]         = useState<MenuItem[]>([]);
  const [selectedRest, setSelectedRest]   = useState<Restaurant | null>(null);
  const [cart, setCart]                   = useState<CartLine[]>([]);
  const [customerName, setCustomerName]   = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress]             = useState('');
  const [instructions, setInstructions]   = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [loadingRests, setLoadingRests]   = useState(false);
  const [loadingMenu, setLoadingMenu]     = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  // Cargar restaurantes activos
  useEffect(() => {
    setLoadingRests(true);
    fetch('/api/admin/restaurants?limit=200')
      .then(r => r.json())
      .then(d => setRestaurants(d.restaurants ?? []))
      .catch(console.error)
      .finally(() => setLoadingRests(false));
  }, []);

  // Cargar menú al seleccionar restaurante

  useEffect(() => {
  if (!selectedRest) return;
  setLoadingMenu(true);
  setCart([]);

  const supabase = createClient();

  (async () => {
    try {
      const { data } = await supabase
        .from('menu_items')
        .select('id, name, base_price_cents, menu_category_id, is_available')
        .eq('restaurant_id', selectedRest.id)
        .eq('is_available', true)
        .order('name');
      setMenuItems(data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMenu(false);
    }
  })();
}, [selectedRest]);

  const addItem = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(l => l.item_id === item.id);
      if (existing) {
        return prev.map(l => l.item_id === item.id
          ? { ...l, quantity: l.quantity + 1, total_cents: (l.quantity + 1) * l.unit_price_cents }
          : l
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
  };

  const removeItem = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(l => l.item_id === itemId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(l => l.item_id !== itemId);
      return prev.map(l => l.item_id === itemId
        ? { ...l, quantity: l.quantity - 1, total_cents: (l.quantity - 1) * l.unit_price_cents }
        : l
      );
    });
  };

  const subtotal = cart.reduce((s, l) => s + l.total_cents, 0);
  const total    = subtotal + DELIVERY_FEE;

  const canNext = () => {
    if (step === 0) return !!selectedRest;
    if (step === 1) return cart.length > 0;
    if (step === 2) return customerName.trim() !== '' && customerPhone.trim() !== '' && address.trim() !== '';
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedRest) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id:        selectedRest.id,
          city_id:              selectedRest.city_id,
          customer_name:        customerName.trim(),
          customer_phone:       customerPhone.trim(),
          delivery_address:     address.trim(),
          delivery_instructions: instructions.trim() || undefined,
          delivery_lat:         selectedRest.lat,
          delivery_lng:         selectedRest.lng,
          items:                cart,
          subtotal_cents:       subtotal,
          delivery_fee_cents:   DELIVERY_FEE,
          total_cents:          total,
          payment_method:       paymentMethod,
        }),
      });
      const data = await res.json() as { order?: { code: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Error al crear pedido');
      onCreated(data.order!.code);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Nuevo Pedido</h3>
              <p className="text-xs text-gray-400">Paso {step + 1} de 4 — {STEPS[step]}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex px-6 pt-4 pb-2 gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full h-1.5 rounded-full transition-colors ${i <= step ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
              <span className={`text-[10px] font-medium ${i === step ? 'text-orange-500' : 'text-gray-400'}`}>{s}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* Step 0 — Restaurante */}
          {step === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Selecciona el restaurante del pedido</p>
              {loadingRests ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
                </div>
              ) : (
                restaurants.filter(r => (r as unknown as Record<string,unknown>).is_active !== false).map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRest(r)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
                      selectedRest?.id === r.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <p className={`font-semibold text-sm ${selectedRest?.id === r.id ? 'text-orange-700 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {r.name}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 1 — Productos */}
          {step === 1 && (
            <div className="space-y-3">
              {cart.length > 0 && (
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">Carrito</p>
                  {cart.map(l => (
                    <div key={l.item_id} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">{l.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => removeItem(l.item_id)} className="w-6 h-6 rounded-full bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300 font-bold text-sm flex items-center justify-center">−</button>
                        <span className="text-sm font-bold w-4 text-center">{l.quantity}</span>
                        <button onClick={() => addItem({ id: l.item_id, name: l.name, base_price_cents: l.unit_price_cents, menu_category_id: null })} className="w-6 h-6 rounded-full bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300 font-bold text-sm flex items-center justify-center">+</button>
                        <span className="text-xs text-gray-500 w-16 text-right">{formatPrice(l.total_cents)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-orange-200 dark:border-orange-800 mt-2 pt-2 flex justify-between">
                    <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">Subtotal</span>
                    <span className="text-xs font-bold text-orange-700 dark:text-orange-400">{formatPrice(subtotal)}</span>
                  </div>
                </div>
              )}
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Menú — {selectedRest?.name}</p>
              {loadingMenu ? (
                <div className="space-y-2">
                  {[1,2,3,4].map(i => <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
                </div>
              ) : menuItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No hay platos disponibles</p>
              ) : (
                menuItems.map(item => {
                  const inCart = cart.find(l => l.item_id === item.id);
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">{formatPrice(item.base_price_cents)}</p>
                      </div>
                      <button
                        onClick={() => addItem(item)}
                        className={`ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          inCart
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                        }`}
                      >
                        {inCart ? `x${inCart.quantity} +` : '+ Agregar'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Step 2 — Cliente */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del cliente *</label>
                <input
                  type="text"
                  placeholder="María García"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono *</label>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 overflow-hidden transition-colors">
                  <span className="flex items-center px-3 bg-gray-100 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 font-mono shrink-0 border-r border-gray-200 dark:border-gray-700">+51</span>
                  <input
                    type="tel"
                    placeholder="987 654 321"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="flex-1 px-3 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dirección de entrega *</label>
                <input
                  type="text"
                  placeholder="Jr. Marañón 245, Jaén"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Instrucciones (opcional)</label>
                <textarea
                  placeholder="Portón verde, 2do piso..."
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  rows={2}
                  className="form-input resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3 — Resumen */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Resumen del pedido</p>
                <p className="text-sm"><span className="text-gray-500">Restaurante:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{selectedRest?.name}</span></p>
                <p className="text-sm"><span className="text-gray-500">Cliente:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{customerName}</span></p>
                <p className="text-sm"><span className="text-gray-500">Teléfono:</span> <span className="font-medium text-gray-900 dark:text-gray-100">+51 {customerPhone}</span></p>
                <p className="text-sm"><span className="text-gray-500">Dirección:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{address}</span></p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Items</p>
                {cart.map(l => (
                  <div key={l.item_id} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">x{l.quantity} {l.name}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(l.total_cents)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Delivery</span><span>{formatPrice(DELIVERY_FEE)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-gray-100 pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span>Total</span><span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Método de pago</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition ${
                        paymentMethod === m
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {paymentMethodLabels[m]}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? 'Cancelar' : 'Atrás'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
              {saving ? 'Creando…' : 'Crear Pedido'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}