'use client';

import { Smartphone } from 'lucide-react';
import { colors } from '@/config/tokens';

export function DesktopBanner() {
  return (
    <div
      className="hidden items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white lg:flex"
      style={{ backgroundColor: colors.brand.secondary }}
    >
      <Smartphone className="h-4 w-4" />
      <span>Para pedir delivery, abre YUMI desde tu celular</span>
    </div>
  );
}
