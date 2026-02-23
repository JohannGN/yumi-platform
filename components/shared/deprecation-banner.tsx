'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface DeprecationBannerProps {
  targetLabel?: string;
  targetHref?: string;
  message?: string;
}

export function DeprecationBanner({
  targetLabel = 'Finanzas → Créditos',
  targetHref = '/admin/finanzas/creditos',
  message,
}: DeprecationBannerProps) {
  return (
    <div className="mb-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {message || 'Esta vista usa el modelo de liquidaciones anterior.'}{' '}
          Los datos actualizados están en{' '}
          <Link
            href={targetHref}
            className="font-medium underline hover:text-amber-900 dark:hover:text-amber-100"
          >
            {targetLabel}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
