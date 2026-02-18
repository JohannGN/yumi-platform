'use client';

import { colors, orderStatusLabels, formatDate } from '@/config/tokens';
import type { OrderStatusHistory } from '@/types/admin-panel';

const STATUS_ICONS: Record<string, string> = {
  cart:                  '🛒',
  awaiting_confirmation: '⏳',
  pending_confirmation:  '📱',
  confirmed:             '✅',
  rejected:              '❌',
  preparing:             '👨‍🍳',
  ready:                 '🔔',
  assigned_rider:        '🏍️',
  picked_up:             '📦',
  in_transit:            '🚀',
  delivered:             '🎉',
  cancelled:             '🚫',
};

interface OrderTimelineProps {
  history: OrderStatusHistory[];
}

export function OrderTimeline({ history }: OrderTimelineProps) {
  if (!history.length) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
        Sin historial de estados
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((entry, idx) => {
        const isLast = idx === history.length - 1;
        const color  = colors.orderStatus[entry.to_status as keyof typeof colors.orderStatus] ?? '#6B7280';
        const icon   = STATUS_ICONS[entry.to_status] ?? '•';

        return (
          <div key={entry.id} className="flex gap-4">
            {/* Timeline vertical line */}
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border-2 bg-white dark:bg-gray-900 z-10"
                style={{ borderColor: color }}
              >
                {icon}
              </div>
              {!isLast && (
                <div className="w-px flex-1 my-1" style={{ backgroundColor: `${color}40`, minHeight: '24px' }} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 ${isLast ? '' : ''}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-sm font-semibold"
                  style={{ color }}
                >
                  {orderStatusLabels[entry.to_status] ?? entry.to_status}
                </span>
                {entry.from_status && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    (desde {orderStatusLabels[entry.from_status] ?? entry.from_status})
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {formatDate(entry.created_at)}
              </p>
              {entry.notes && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                  "{entry.notes}"
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
