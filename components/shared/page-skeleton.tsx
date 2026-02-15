'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { skeletonConfig } from '@/config/tokens';

interface PageSkeletonProps {
  variant: 'categories' | 'restaurants' | 'menu' | 'orders';
}

export function PageSkeleton({ variant }: PageSkeletonProps) {
  const counts = {
    categories: skeletonConfig.categoryGrid,
    restaurants: skeletonConfig.restaurantList,
    menu: skeletonConfig.menuItems,
    orders: skeletonConfig.orderHistory,
  };

  const count = counts[variant];

  if (variant === 'categories') {
    return (
      <div className="grid grid-cols-4 gap-3 p-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-16 w-16 rounded-xl" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'restaurants') {
    return (
      <div className="flex flex-col gap-4 p-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'menu') {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-6 w-1/3" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // orders
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-2/3" />
          <Skeleton className="mt-1 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
