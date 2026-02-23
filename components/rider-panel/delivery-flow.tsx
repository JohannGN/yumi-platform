'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRider } from './rider-context';
import { PaymentConfirm } from './payment-confirm';
import { CashCalculator } from './cash-calculator';
import { QrDisplay } from './qr-display';
import { PosPhoto } from './pos-photo';
import { PhotoCapture } from './photo-capture';
import { DeliveryBreakdown } from './delivery-breakdown';
import { formatCurrency, formatOrderCode, colors, paymentMethodLabels } from '@/config/tokens';
import type { RiderCurrentOrder, PaymentMethodType, DeliveryFlowStep } from '@/types/rider-panel';

interface DeliveryFlowProps {
  order: RiderCurrentOrder;
  onClose: () => void;
}

export function DeliveryFlow({ order, onClose }: DeliveryFlowProps) {
  const { rider, refetchOrder, refetchRider, setCurrentOrder } = useRider();

  // Flow state
  const [step, setStep] = useState<DeliveryFlowStep>('confirm_payment');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType>(
    // Map yape to plin for the selector (same QR)
    order.payment_method === 'yape' ? 'plin' : order.payment_method
  );
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [deliveryProofUrl, setDeliveryProofUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CREDITOS-2A: Breakdown state
  const [showBreakdown, setShowBreakdown] = useState(false);

  // === Step handlers ===

  const handleConfirmPayment = () => {
    switch (selectedPayment) {
      case 'cash':
        setStep('cash_calculator');
        break;
      case 'pos':
        setStep('pos_photo');
        break;
      case 'plin':
      case 'yape':
        setStep('qr_display');
        break;
    }
  };

  const handleCashExact = () => {
    // Skip calculator, go directly to delivery photo
    setStep('delivery_photo');
  };

  const handleCashContinue = () => {
    setStep('delivery_photo');
  };

  const handlePaymentPhotoUploaded = (url: string) => {
    setPaymentProofUrl(url);
  };

  const handlePaymentPhotoContinue = () => {
    setStep('delivery_photo');
  };

  const handleDeliveryPhotoUploaded = (url: string) => {
    setDeliveryProofUrl(url);
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryProofUrl) return;

    // Validate: if non-cash, need payment proof
    const needsPaymentProof = ['pos', 'yape', 'plin'].includes(selectedPayment);
    if (needsPaymentProof && !paymentProofUrl) {
      setError('Falta la foto de pago');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/rider/current-order/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'delivered',
          actual_payment_method: selectedPayment,
          delivery_proof_url: deliveryProofUrl,
          payment_proof_url: paymentProofUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al confirmar entrega');
        return;
      }

      // CREDITOS-2A: Show breakdown for commission riders before success
      if (rider?.pay_type === 'commission') {
        setStep('success');
        setShowBreakdown(true);
      } else {
        setStep('success');
      }

      await refetchRider();
    } catch {
      setError('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToHome = () => {
    setCurrentOrder(null);
    refetchOrder();
    onClose();
  };

  // === Back navigation ===
  const handleBack = () => {
    switch (step) {
      case 'cash_calculator':
      case 'pos_photo':
      case 'qr_display':
        setStep('confirm_payment');
        setPaymentProofUrl(null);
        break;
      case 'delivery_photo':
        if (selectedPayment === 'cash') {
          setStep('cash_calculator');
        } else if (selectedPayment === 'pos') {
          setStep('pos_photo');
        } else {
          setStep('qr_display');
        }
        break;
      default:
        onClose();
    }
  };

  return (
    <div className="min-h-[calc(100vh-7.5rem)]">
      {/* Back button (not on success) */}
      {step !== 'success' && (
        <div className="sticky top-0 z-10 px-4 py-2 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-md">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 active:scale-95 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Volver
          </button>
        </div>
      )}

      {/* Error toast */}
      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mb-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50"
          >
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Steps */}
      <AnimatePresence mode="wait">
        {step === 'confirm_payment' && (
          <PaymentConfirm
            key="confirm"
            orderCode={order.code}
            totalCents={order.total_cents}
            originalMethod={order.payment_method}
            selectedMethod={selectedPayment}
            onSelectMethod={setSelectedPayment}
            onConfirm={handleConfirmPayment}
          />
        )}

        {step === 'cash_calculator' && (
          <CashCalculator
            key="cash"
            totalCents={order.total_cents}
            onExactAmount={handleCashExact}
            onContinue={handleCashContinue}
          />
        )}

        {step === 'pos_photo' && (
          <PosPhoto
            key="pos"
            totalCents={order.total_cents}
            orderId={order.id}
            onPhotoUploaded={handlePaymentPhotoUploaded}
            paymentProofUrl={paymentProofUrl}
            onContinue={handlePaymentPhotoContinue}
          />
        )}

        {step === 'qr_display' && (
          <QrDisplay
            key="qr"
            totalCents={order.total_cents}
            orderId={order.id}
            onPhotoUploaded={handlePaymentPhotoUploaded}
            paymentProofUrl={paymentProofUrl}
            onContinue={handlePaymentPhotoContinue}
          />
        )}

        {step === 'delivery_photo' && (
          <motion.div
            key="delivery"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5 p-4"
          >
            <div className="text-center">
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide">
                Foto de entrega
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Toma una foto del pedido entregado al cliente
              </p>
            </div>

            <PhotoCapture
              label="Tomar foto"
              sublabel="Pedido entregado al cliente"
              orderId={order.id}
              type="delivery"
              onUploadComplete={handleDeliveryPhotoUploaded}
            />

            {/* Summary */}
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Pedido</span>
                <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
                  {formatOrderCode(order.code)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500 dark:text-gray-400">Pago</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {getPaymentIcon(selectedPayment)}{' '}
                  {paymentMethodLabels[selectedPayment] || selectedPayment}
                </span>
              </div>
            </div>

            {/* Confirm delivery button */}
            <button
              onClick={handleConfirmDelivery}
              disabled={!deliveryProofUrl || isSubmitting}
              className="w-full py-4 rounded-2xl text-base font-bold text-white shadow-lg disabled:opacity-40 active:scale-[0.97] transition-all"
              style={{ backgroundColor: colors.semantic.success }}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirmando...
                </div>
              ) : (
                '✅ Confirmar entrega'
              )}
            </button>
          </motion.div>
        )}

        {step === 'success' && (
          <SuccessScreen
            key="success"
            orderCode={order.code}
            totalCents={order.total_cents}
            paymentMethod={selectedPayment}
            onGoHome={handleBackToHome}
          />
        )}
      </AnimatePresence>

      {/* CREDITOS-2A: Delivery breakdown sheet — shown after successful delivery */}
      {showBreakdown && step === 'success' && (
        <DeliveryBreakdown
          orderCode={order.code}
          restaurantName={order.restaurant_name}
          totalCents={order.total_cents}
          subtotalCents={order.subtotal_cents}
          deliveryFeeCents={order.delivery_fee_cents}
          paymentMethod={selectedPayment}
          isCommission={rider?.pay_type === 'commission'}
          onClose={() => setShowBreakdown(false)}
        />
      )}
    </div>
  );
}

// === Success screen ===

function SuccessScreen({
  orderCode,
  totalCents,
  paymentMethod,
  onGoHome,
}: {
  orderCode: string;
  totalCents: number;
  paymentMethod: PaymentMethodType;
  onGoHome: () => void;
}) {
  const label = paymentMethodLabels[paymentMethod] || paymentMethod;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center"
    >
      {/* Animated check */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
        className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: `${colors.semantic.success}15` }}
      >
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl"
        >
          🎉
        </motion.span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-black text-gray-900 dark:text-white"
      >
        ¡Entregado!
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 space-y-1"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Pedido <span className="font-mono font-bold">{formatOrderCode(orderCode)}</span> completado
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Pago: {label}
        </p>
        <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
          {formatCurrency(totalCents)}
        </p>
      </motion.div>

      {/* Confetti particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: [
                colors.brand.primary,
                colors.brand.accent,
                colors.semantic.success,
                '#EC4899',
                '#8B5CF6',
              ][i % 5],
              left: `${Math.random() * 100}%`,
              top: '-10px',
            }}
            initial={{ y: -10, opacity: 1, rotate: 0 }}
            animate={{
              y: typeof window !== 'undefined' ? window.innerHeight + 20 : 800,
              opacity: 0,
              rotate: Math.random() * 720 - 360,
              x: Math.random() * 200 - 100,
            }}
            transition={{
              duration: 1.5 + Math.random() * 1.5,
              delay: Math.random() * 0.5,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={onGoHome}
        className="mt-8 px-8 py-3.5 rounded-2xl font-bold text-sm text-white active:scale-[0.97] transition-transform"
        style={{ backgroundColor: colors.brand.primary }}
      >
        Volver al inicio
      </motion.button>
    </motion.div>
  );
}

// Helper
function getPaymentIcon(method: string): string {
  switch (method) {
    case 'cash': return '💵';
    case 'pos': return '💳';
    case 'yape':
    case 'plin': return '📱';
    default: return '💰';
  }
}
