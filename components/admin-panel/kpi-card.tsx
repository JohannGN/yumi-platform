import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  trend?: {
    value: number;
    label: string;
  };
  isLoading?: boolean;
}

export function KpiCard({ title, value, subtitle, icon: Icon, color, trend, isLoading }: KpiCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="w-16 h-4 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
        <div className="w-24 h-7 rounded bg-gray-100 dark:bg-gray-800 animate-pulse mb-2" />
        <div className="w-20 h-3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

  const isPositive = trend ? trend.value >= 0 : true;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
            ${isPositive
              ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.label}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
