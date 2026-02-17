'use client';

import { motion } from 'framer-motion';
import { formatCurrency, colors } from '@/config/tokens';
import { PhotoCapture } from './photo-capture';

interface QrDisplayProps {
  totalCents: number;
  orderId: string;
  onPhotoUploaded: (url: string) => void;
  paymentProofUrl: string | null;
  onContinue: () => void;
}

export function QrDisplay({
  totalCents,
  orderId,
  onPhotoUploaded,
  paymentProofUrl,
  onContinue,
}: QrDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 p-4"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide">
          Pago QR Digital
        </h2>
      </div>

      {/* Instructions */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 p-3">
        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
          Muestra este QR al cliente. Puede escanearlo con <strong>Yape</strong> o <strong>Plin</strong>.
        </p>
      </div>

      {/* QR Image */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 flex flex-col items-center">
        <div className="relative w-56 h-56 rounded-xl overflow-hidden bg-white flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/qr-yumi-plin.png"
            alt="QR Plin de YUMI"
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">
          Cuenta Plin de YUMI
        </p>
      </div>

      {/* Total reminder */}
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">Total a cobrar</p>
        <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
          {formatCurrency(totalCents)}
        </p>
      </div>

      {/* Payment proof photo */}
      <div>
        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
          Verifica que el pago llegó y toma foto:
        </p>
        <PhotoCapture
          label="Subir foto de pago"
          sublabel="Captura de la confirmación del pago"
          orderId={orderId}
          type="payment"
          onUploadComplete={onPhotoUploaded}
        />
      </div>

      {/* Continue */}
      <button
        onClick={onContinue}
        disabled={!paymentProofUrl}
        className="w-full py-4 rounded-2xl text-base font-bold text-white shadow-lg disabled:opacity-40 active:scale-[0.97] transition-all"
        style={{ backgroundColor: colors.brand.primary }}
      >
        Continuar →
      </button>
    </motion.div>
  );
}
