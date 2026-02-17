'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { colors } from '@/config/tokens';
import { business } from '@/config/tokens';

interface WhatsAppStatusRiderProps {
  lastMessageAt: string | null;
}

export function WhatsAppStatusRider({ lastMessageAt }: WhatsAppStatusRiderProps) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    const calculateRemaining = () => {
      if (!lastMessageAt) {
        setRemaining(0);
        return;
      }
      const expiresAt =
        new Date(lastMessageAt).getTime() +
        business.whatsappWindowHours * 60 * 60 * 1000;
      setRemaining(Math.max(0, expiresAt - Date.now()));
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [lastMessageAt]);

  const isActive = remaining > 0;
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (isActive) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50">
        <div className="relative flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <motion.div
            className="absolute inset-0 rounded-full bg-green-500"
            animate={{ scale: [1, 2], opacity: [0.4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-green-700 dark:text-green-400">
            WhatsApp activo
          </span>
          <span className="text-[10px] text-green-600 dark:text-green-500 ml-1.5">
            {hours}h {minutes}m
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          WhatsApp desconectado
        </span>
      </div>
      <p className="text-[11px] text-amber-600 dark:text-amber-500 leading-relaxed">
        Envía <strong>INICIO</strong> al{' '}
        <a
          href={`https://wa.me/${business.yumiWhatsApp.replace('+', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold"
          style={{ color: colors.brand.primary }}
        >
          WhatsApp de YUMI
        </a>{' '}
        para recibir notificaciones de pedidos.
      </p>
    </div>
  );
}
