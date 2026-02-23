'use client';

import {
  formatCurrency,
  getCreditStatusColor,
  getCreditStatusLabel,
} from '@/config/design-tokens';

interface RiderCreditBadgeProps {
  balanceCents: number;
  payType: string;
  compact?: boolean;
}

/**
 * Badge compacto de créditos para riders commission.
 * fixed_salary riders: no renderiza nada (#117).
 */
export function RiderCreditBadge({
  balanceCents,
  payType,
  compact = false,
}: RiderCreditBadgeProps) {
  // Fixed salary riders don't show credits (#117)
  if (payType === 'fixed_salary') return null;

  const color = getCreditStatusColor(balanceCents);
  const label = getCreditStatusLabel(balanceCents);

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
        style={{ backgroundColor: `${color}18`, color }}
        title={label}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        {formatCurrency(balanceCents)}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap"
        style={{ backgroundColor: `${color}18`, color }}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        {formatCurrency(balanceCents)}
      </span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
