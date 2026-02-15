'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart-store';

interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

export function BackButton({ href, label, className = '' }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    const { leaveGuard } = useCartStore.getState();

    // Si hay un guard activo, dejar que el guard maneje la navegación
    if (leaveGuard) {
      const blocked = leaveGuard(href || null);
      if (blocked) return; // El guard mostrará el modal
    }

    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`gap-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
      aria-label={label ?? 'Volver'}
    >
      <ArrowLeft className="h-4 w-4" />
      {label && <span>{label}</span>}
    </Button>
  );
}