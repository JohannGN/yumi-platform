'use client';

import { useState, useCallback } from 'react';
import { useRider } from '@/components/rider-panel/rider-context';
import { WaitingState } from '@/components/rider-panel/waiting-state';
import { ActiveOrderCard } from '@/components/rider-panel/active-order-card';
import { OrderStatusActions } from '@/components/rider-panel/order-status-actions';
import { DeliveryFlow } from '@/components/rider-panel/delivery-flow';
import { useRiderLocation } from '@/hooks/use-rider-location';
import { AnimatePresence, motion } from 'framer-motion';

export default function RiderDashboardPage() {
  const { rider, currentOrder, isLoading, isOrderLoading } = useRider();
  const [showDeliveryFlow, setShowDeliveryFlow] = useState(false);

  // Send GPS while online
  useRiderLocation(rider?.is_online ?? false);

  // Navigate to restaurant via Google Maps
  const handleNavigateRestaurant = useCallback(() => {
    if (!currentOrder) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${currentOrder.restaurant_lat},${currentOrder.restaurant_lng}&travelmode=driving`;
    window.open(url, '_blank');
  }, [currentOrder]);

  // Navigate to client via Google Maps
  const handleNavigateClient = useCallback(() => {
    if (!currentOrder) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${currentOrder.delivery_lat},${currentOrder.delivery_lng}&travelmode=driving`;
    window.open(url, '_blank');
  }, [currentOrder]);

  // Loading skeleton
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Delivery flow overlay
  if (showDeliveryFlow && currentOrder) {
    return (
      <DeliveryFlow
        order={currentOrder}
        onClose={() => setShowDeliveryFlow(false)}
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      {currentOrder ? (
        <motion.div
          key="active-order"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Order loading overlay */}
          {isOrderLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/50 dark:bg-gray-900/50">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Active order details */}
          <ActiveOrderCard
            order={currentOrder}
            onNavigateRestaurant={handleNavigateRestaurant}
            onNavigateClient={handleNavigateClient}
          />

          {/* Action buttons */}
          <OrderStatusActions
            order={currentOrder}
            onStartDeliveryFlow={() => setShowDeliveryFlow(true)}
          />
        </motion.div>
      ) : (
        <motion.div
          key="waiting"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <WaitingState />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// === Skeleton ===
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Hero skeleton */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />
          <div className="w-40 h-5 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          <div className="w-56 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4"
          >
            <div className="w-12 h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="w-20 h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* WhatsApp skeleton */}
      <div className="rounded-xl bg-gray-100 dark:bg-gray-800 h-16 animate-pulse" />
    </div>
  );
}
