'use client';

// ============================================================
// ARCHIVO NUEVO: components/admin-panel/create-order-success.tsx
// Step 5 — Éxito tras crear pedido desde admin
// Usado por create-order-form.tsx cuando POST retorna success
// ============================================================

import { useState } from 'react';
import { CheckCircle2, Copy, Check, MessageCircle, ExternalLink, X } from 'lucide-react';

interface CreateOrderSuccessProps {
  order: {
    id: string;
    code: string;
    status: string;
    total_cents: number;
  };
  customer: {
    name: string;
    phone: string;
  };
  onViewOrder: (orderId: string) => void;
  onClose: () => void;
}

export function CreateOrderSuccess({
  order,
  customer,
  onViewOrder,
  onClose,
}: CreateOrderSuccessProps) {
  const [copied, setCopied] = useState(false);

  // URL de seguimiento (funciona en dev y prod)
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? 'https://yumi.pe';

  const trackingUrl = `${appUrl}/pedido/${order.code}`;

  // Formatear código para mostrar: V4K4X4 → V4K-4X4
  const formattedCode = order.code.length === 6
    ? `${order.code.slice(0, 3)}-${order.code.slice(3)}`
    : order.code;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para navegadores sin clipboard API
      const el = document.createElement('textarea');
      el.value = trackingUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    // Limpiar teléfono: quitar +, espacios, guiones → solo dígitos
    const rawPhone = customer.phone.replace(/\D/g, '');
    // Si empieza con 0, reemplazar por 51 (Perú)
    const phoneClean = rawPhone.startsWith('0')
      ? `51${rawPhone.slice(1)}`
      : rawPhone.startsWith('51')
      ? rawPhone
      : `51${rawPhone}`;

    const message = encodeURIComponent(
      `Hola ${customer.name}, tu pedido de YUMI está confirmado 🛵\n` +
      `Sigue tu entrega en tiempo real: ${trackingUrl}`
    );
    const waLink = `https://wa.me/${phoneClean}?text=${message}`;
    window.open(waLink, '_blank', 'noopener,noreferrer');
  };

  const handleViewOrder = () => {
    onViewOrder(order.id);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 text-center">
      {/* Ícono de éxito */}
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
      </div>

      {/* Título */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          ¡Pedido creado exitosamente!
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Código:{' '}
          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
            {formattedCode}
          </span>
        </p>
      </div>

      {/* Enlace de seguimiento */}
      <div className="w-full">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-left">
          Enlace de seguimiento
        </p>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate font-mono">
            {trackingUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Copiar enlace"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Botón WhatsApp */}
      <button
        type="button"
        onClick={handleWhatsApp}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-medium transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        Enviar por WhatsApp a {customer.name}
      </button>

      {/* Acciones secundarias */}
      <div className="flex items-center gap-3 w-full">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={handleViewOrder}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A25] text-white text-sm font-medium transition-colors"
        >
          Ver pedido
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
