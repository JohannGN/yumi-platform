'use client';

import { motion } from 'framer-motion';
import { formatCurrency, colors } from '@/config/tokens';
import { PhotoCapture } from './photo-capture';

interface PosPhotoProps {
  totalCents: number;
  orderId: string;
  onPhotoUploaded: (url: string) => void;
  paymentProofUrl: string | null;
  onContinue: () => void;
}

export function PosPhoto({
  totalCents,
  orderId,
  onPhotoUploaded,
  paymentProofUrl,
  onContinue,
}: PosPhotoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 p-4"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide">
          Pago con POS
        </h2>
      </div>

      {/* Instructions */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 p-3">
        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
          Pasa la tarjeta del cliente por el terminal POS. Una vez aprobada la operación, toma foto de la pantalla del POS.
        </p>
      </div>

      {/* Total */}
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">Total a cobrar</p>
        <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums mt-0.5">
          {formatCurrency(totalCents)}
        </p>
      </div>

      {/* POS proof photo */}
      <div>
        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
          Foto de la pantalla del POS:
        </p>
        <PhotoCapture
          label="Subir foto del POS"
          sublabel="Pantalla mostrando operación exitosa"
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
