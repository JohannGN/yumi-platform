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
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="w-16 h-5 rounded bg-gray-100 dark:bg-gray-800 animate-pulse mb-1.5" />
            <div className="w-20 h-3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const isPositive = trend ? trend.value >= 0 : true;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">{value}</p>
            {trend && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0
                ${isPositive
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                }`}
              >
                {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {trend.label}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{title}</p>
          {subtitle && (
            <p className="text-[10px] text-gray-300 dark:text-gray-600 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
