'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, ArrowRight, Loader2 } from 'lucide-react';
import type { CustomerInfo } from '@/types/checkout';

const STORAGE_KEY = 'yumi_customer_info';

function getSavedCustomer(): { name: string; phone: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCustomer(name: string, phone: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, phone }));
  } catch { /* ignore */ }
}

interface StepCustomerInfoProps {
  value: CustomerInfo;
  onChange: (info: CustomerInfo) => void;
  onNext: () => void;
}

export function StepCustomerInfo({
  value,
  onChange,
  onNext,
}: StepCustomerInfoProps) {
  const [name, setName] = useState(value.name);
  const [phone, setPhone] = useState(value.phone);
  const [phoneError, setPhoneError] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    if (loaded) return;
    const saved = getSavedCustomer();
    if (saved) {
      if (!value.name && saved.name) setName(saved.name);
      if (!value.phone && saved.phone) setPhone(saved.phone);
    }
    setLoaded(true);
  }, [loaded, value.name, value.phone]);

  const isPhoneValid = /^9\d{8}$/.test(phone);
  const isNameValid = name.trim().length >= 2;
  const canContinue = isNameValid && isPhoneValid && !phoneError;

  const handlePhoneChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 9);
    setPhone(digits);
    setPhoneError('');

    if (digits.length === 9 && !digits.startsWith('9')) {
      setPhoneError('El número debe empezar con 9');
    }
  };

  const lookupCustomer = useCallback(async (phoneNumber: string) => {
    if (!/^9\d{8}$/.test(phoneNumber)) return;
    setIsLookingUp(true);
    try {
      const res = await fetch(
        `/api/check-penalty?phone=${encodeURIComponent(`+51${phoneNumber}`)}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.is_banned) {
          setPhoneError(
            'Tu cuenta tiene una restricción temporal. Contacta soporte.',
          );
        }
      }
    } catch {
      // Silenciar errores de lookup
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  useEffect(() => {
    if (phone.length === 9) {
      lookupCustomer(phone);
    }
  }, [phone, lookupCustomer]);

  const handleSubmit = () => {
    if (!canContinue) return;
    const trimmedName = name.trim();
    // Save to localStorage for next time
    saveCustomer(trimmedName, phone);
    onChange({ name: trimmedName, phone });
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-14 h-14 bg-[#FF6B35]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <User className="w-7 h-7 text-[#FF6B35]" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          ¿Cómo te llamas?
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Para que el rider sepa quién recibe el pedido
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="customer-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Nombre completo
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="customer-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              autoComplete="name"
              className="
                w-full pl-10 pr-4 py-3 rounded-xl
                bg-gray-50 dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                text-gray-900 dark:text-white placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]
                transition-all duration-200
              "
              onKeyDown={(e) => e.key === 'Enter' && document.getElementById('customer-phone')?.focus()}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="customer-phone"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            WhatsApp
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 font-medium">+51</span>
            </div>
            <input
              id="customer-phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="987 654 321"
              autoComplete="tel"
              maxLength={9}
              className={`
                w-full pl-[4.5rem] pr-4 py-3 rounded-xl
                bg-gray-50 dark:bg-gray-800
                border transition-all duration-200
                text-gray-900 dark:text-white placeholder-gray-400
                focus:outline-none focus:ring-2
                ${
                  phoneError
                    ? 'border-red-400 focus:ring-red-400/50 focus:border-red-400'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]'
                }
              `}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            {isLookingUp && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
          {phoneError && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-500 mt-1.5 ml-1"
            >
              {phoneError}
            </motion.p>
          )}
          <p className="text-xs text-gray-400 mt-1.5 ml-1">
            Te enviaremos la confirmación por WhatsApp
          </p>
        </div>
      </div>

      <motion.button
        onClick={handleSubmit}
        disabled={!canContinue}
        className={`
          w-full py-3.5 rounded-xl font-semibold text-white
          flex items-center justify-center gap-2
          transition-all duration-200
          ${
            canContinue
              ? 'bg-[#FF6B35] hover:bg-[#E55A25] active:scale-[0.98] shadow-lg shadow-[#FF6B35]/25'
              : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
          }
        `}
        whileTap={canContinue ? { scale: 0.98 } : {}}
      >
        Continuar
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}
