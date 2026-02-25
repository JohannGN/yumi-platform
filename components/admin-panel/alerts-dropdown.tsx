'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ExternalLink, CheckCircle2 } from 'lucide-react';
import type { OperationalAlert, AlertsSummary } from '@/types/admin-panel-additions';

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

const ALERT_ICONS: Record<string, string> = {
  restaurant_not_opened: '🏪',
  rider_offline_in_shift: '🏍️',
  order_stuck_pending: '📋',
  order_stuck_preparing: '🍳',
  rider_disappeared: '📡',
  order_no_rider: '🚫',
};

const PRIORITY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    badge: 'bg-red-500',
  },
  high: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-300',
    badge: 'bg-orange-500',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-700 dark:text-yellow-300',
    badge: 'bg-yellow-500',
  },
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alto',
  warning: 'Advertencia',
};

interface AlertsDropdownProps {
  cityId: string | null;
}

export function AlertsDropdown({ cityId }: AlertsDropdownProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [summary, setSummary] = useState<AlertsSummary>({ critical: 0, high: 0, warning: 0, total: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevTotalRef = useRef(0);

  const fetchAlerts = useCallback(async () => {
    if (!cityId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/alerts?city_id=${cityId}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
        setSummary(data.summary ?? { critical: 0, high: 0, warning: 0, total: 0 });

        // Play subtle sound if new critical alerts appeared
        const newCritical = (data.summary?.critical ?? 0);
        const prevCritical = prevTotalRef.current;
        if (newCritical > 0 && newCritical > prevCritical) {
          // Simple beep using Web Audio API (no external file needed)
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.08;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.stop(ctx.currentTime + 0.3);
          } catch {
            // Audio not available, ignore
          }
        }
        prevTotalRef.current = newCritical;
      }
    } catch {
      // Silently fail — alerts are non-critical UI
    } finally {
      setIsLoading(false);
    }
  }, [cityId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const badgeColor = summary.critical > 0
    ? 'bg-red-500'
    : summary.high > 0
      ? 'bg-orange-500'
      : summary.warning > 0
        ? 'bg-gray-400'
        : '';

  const hasPulse = summary.critical > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchAlerts(); }}
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Alertas operativas"
      >
        <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" />

        {/* Badge */}
        {summary.total > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full ${badgeColor}`}>
            {hasPulse && (
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
            )}
            <span className="relative">{summary.total > 99 ? '99+' : summary.total}</span>
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-[380px] max-h-[480px] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Alertas operativas
                </h3>
                {isLoading && (
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Summary pills */}
            {summary.total > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-50 dark:border-gray-800/50">
                {summary.critical > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {summary.critical} crítico{summary.critical !== 1 ? 's' : ''}
                  </span>
                )}
                {summary.high > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    {summary.high} alto{summary.high !== 1 ? 's' : ''}
                  </span>
                )}
                {summary.warning > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                    {summary.warning} aviso{summary.warning !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            {/* Alerts list */}
            <div className="overflow-y-auto max-h-[350px] divide-y divide-gray-50 dark:divide-gray-800/50">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Todo en orden
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    No hay alertas activas
                  </p>
                </div>
              ) : (
                alerts.map((alert, i) => {
                  const pColors = PRIORITY_COLORS[alert.priority] ?? PRIORITY_COLORS.warning;
                  return (
                    <motion.div
                      key={`${alert.type}-${alert.entity_id}-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer`}
                      onClick={() => {
                        router.push(alert.entity_link);
                        setIsOpen(false);
                      }}
                    >
                      {/* Icon */}
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${pColors.bg}`}>
                        <span className="text-base">{ALERT_ICONS[alert.type] ?? '⚠️'}</span>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${pColors.badge}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${pColors.text}`}>
                            {PRIORITY_LABELS[alert.priority]}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            hace {alert.minutes_elapsed} min
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                          {alert.message}
                        </p>
                      </div>

                      {/* Navigate arrow */}
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0 mt-1" />
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
