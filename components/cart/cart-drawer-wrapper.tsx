'use client';

import { CartDrawer } from '@/components/cart/cart-drawer';
import { colors } from '@/config/tokens';

export function CartDrawerWrapper() {
  return <CartDrawer themeColor={colors.brand.primary} />;
}