'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Smartphone } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { CheckoutStepper } from './checkout-stepper';
import { StepCustomerInfo } from './step-customer-info';
import { StepDeliveryAddress } from './step-delivery-address';
import { StepPaymentMethod } from './step-payment-method';
import { StepOrderSummary } from './step-order-summary';
import type {
  CheckoutStep,
  CheckoutFormState,
  DeliveryFeeResponse,
  CreateOrderResponse,
} from '@/types/checkout';

interface CheckoutRestaurant {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  isOpen: boolean;
  cityId: string;
  themeColor: string;
  logoUrl: string | null;
  defaultLogo: boolean;
}

interface CheckoutCity {
  id: string;
  name: string;
  slug: string;
}

interface CheckoutPageClientProps {
  restaurant: CheckoutRestaurant;
  city: CheckoutCity;
}

export function CheckoutPageClient({
  restaurant,
  city,
}: CheckoutPageClientProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const items = useCartStore((s) => s.items);
  const restaurantId = useCartStore((s) => s.restaurantId);
  const clearCart = useCartStore((s) => s.clearCart);

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('customer');
  const [completedSteps, setCompletedSteps] = useState<Set<CheckoutStep>>(new Set());
  const [formState, setFormState] = useState<CheckoutFormState>({
    customer: { name: '', phone: '' },
    address: { address: '', lat: 0, lng: 0, reference: '' },
    payment: { method: 'cash' },
    deliveryFee: null,
  });

  // Redirect if cart empty or wrong restaurant
  useEffect(() => {
    if (items.length === 0 || restaurantId !== restaurant.id) {
      router.replace(`/${city.slug}/${restaurant.slug}`);
    }
  }, [items.length, restaurantId, restaurant.id, restaurant.slug, city.slug, router]);

  // Redirect if restaurant closed
  useEffect(() => {
    if (!restaurant.isOpen) {
      router.replace(`/${city.slug}/${restaurant.slug}`);
    }
  }, [restaurant.isOpen, restaurant.slug, city.slug, router]);

  const subtotalCents = items.reduce((sum, item) => sum + item.line_total_cents, 0);
  const deliveryFeeCents = formState.deliveryFee?.fee_cents || 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  const goToStep = useCallback((step: CheckoutStep) => {
    setCurrentStep(step);
  }, []);

  const markCompleted = useCallback((step: CheckoutStep) => {
    setCompletedSteps((prev) => new Set(prev).add(step));
  }, []);

  const handleOrderCreated = useCallback(
    (response: CreateOrderResponse) => {
      if (response.whatsapp_url) {
        window.open(response.whatsapp_url, '_blank');
      }
      router.push(`/confirmar/${response.confirmation_token}`);
    },
    [router],
  );

  // Desktop: show "use your phone" screen
  if (isMobile === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 bg-[#FF6B35]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Smartphone className="w-10 h-10 text-[#FF6B35]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Usa tu celular para pedir
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Para una mejor experiencia y ubicación precisa, abre YUMI desde tu celular.
          </p>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-2">
              Visita desde tu celular:
            </p>
            <p className="text-[#FF6B35] font-bold text-lg">
              yumi.pe/{city.slug}/{restaurant.slug}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Loading / hydration
  if (isMobile === undefined) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-safe">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3 max-w-[430px] mx-auto">
          <button
            onClick={() => {
              if (currentStep === 'customer') {
                router.back();
              } else {
                const steps: CheckoutStep[] = ['customer', 'address', 'payment', 'summary'];
                const idx = steps.indexOf(currentStep);
                if (idx > 0) setCurrentStep(steps[idx - 1]);
              }
            }}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">Tu pedido</h1>
            <p className="text-xs text-gray-500 truncate">{restaurant.name}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B35]/10 rounded-full">
            <ShoppingBag className="w-3.5 h-3.5 text-[#FF6B35]" />
            <span className="text-xs font-bold text-[#FF6B35]">
              {items.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          </div>
        </div>
        <div className="max-w-[430px] mx-auto px-4 pb-2">
          <CheckoutStepper currentStep={currentStep} completedSteps={completedSteps} />
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-[430px] mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {currentStep === 'customer' && (
            <StepCustomerInfo
              key="customer"
              value={formState.customer}
              onChange={(info) => setFormState((prev) => ({ ...prev, customer: info }))}
              onNext={() => { markCompleted('customer'); goToStep('address'); }}
            />
          )}

          {currentStep === 'address' && (
            <StepDeliveryAddress
              key="address"
              value={formState.address}
              onChange={(addr) => setFormState((prev) => ({ ...prev, address: addr }))}
              deliveryFee={formState.deliveryFee}
              onDeliveryFeeChange={(fee: DeliveryFeeResponse | null) =>
                setFormState((prev) => ({ ...prev, deliveryFee: fee }))
              }
              restaurantId={restaurant.id}
              restaurantLat={restaurant.lat}
              restaurantLng={restaurant.lng}
              restaurantName={restaurant.name}
              onNext={() => { markCompleted('address'); goToStep('payment'); }}
              onBack={() => goToStep('customer')}
            />
          )}

          {currentStep === 'payment' && (
            <StepPaymentMethod
              key="payment"
              value={formState.payment}
              onChange={(pay) => setFormState((prev) => ({ ...prev, payment: pay }))}
              totalCents={totalCents}
              onNext={() => { markCompleted('payment'); goToStep('summary'); }}
              onBack={() => goToStep('address')}
            />
          )}

          {currentStep === 'summary' && formState.deliveryFee && (
            <StepOrderSummary
              key="summary"
              customer={formState.customer}
              address={formState.address}
              payment={formState.payment}
              deliveryFee={formState.deliveryFee}
              items={items}
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              cityId={restaurant.cityId}
              onBack={() => goToStep('payment')}
              onOrderCreated={handleOrderCreated}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
