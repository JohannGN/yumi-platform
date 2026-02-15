// ============================================================
// YUMI — Breadcrumb: Inicio > Jaén > Don Pep
// ============================================================

'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1 overflow-x-auto px-4 py-2 text-xs text-gray-500 [&::-webkit-scrollbar]:hidden dark:text-gray-400 ${className}`}
    >
      <Link
        href="/"
        className="flex shrink-0 items-center gap-0.5 transition-colors hover:text-gray-800 dark:hover:text-gray-200"
      >
        <Home className="h-3 w-3" />
        <span>Inicio</span>
      </Link>

      {items.map((item, i) => (
        <span key={item.href} className="flex shrink-0 items-center gap-1">
          <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600" />
          {i === items.length - 1 ? (
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="transition-colors hover:text-gray-800 dark:hover:text-gray-200"
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
