'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgent } from '@/components/agent-panel/agent-context';
import {
  escalationReasonLabels,
  escalationPriorityLabels,
  formatTime,
  formatDate,
  formatPhone,
  formatOrderCode,
  colors,
} from '@/config/design-tokens';
import type { AgentEscalation } from '@/types/agent-panel';
import {
  AlertTriangle,
  Phone,
  Clock,
  ExternalLink,
  MessageSquare,
  Loader2,
  RefreshCw,
  Filter,
  ShoppingBag,
} from 'lucide-react';
import { AgentEscalationDetail } from './agent-escalation-detail';

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'resolved', label: 'Resuelto' },
];

const PRIORITY_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'urgent', label: 'Urgente' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  in_progress: '#3B82F6',
  resolved: '#22C55E',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#9CA3AF',
  medium: '#F59E0B',
  high: '#EF4444',
  urgent: '#DC2626',
};

function PriorityBadge({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority] ?? '#6B7280';
  const label = escalationPriorityLabels[priority] ?? priority;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {priority === 'urgent' && <AlertTriangle className="w-3 h-3 mr-1" />}
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#6B7280';
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: `${color}18`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function AgentEscalationsList() {
  const { activeCityId, agent } = useAgent();
  const [escalations, setEscalations] = useState<AgentEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedEscalation, setSelectedEscalation] = useState<AgentEscalation | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchEscalations = useCallback(async () => {
    if (!activeCityId) return;
    try {
      const params = new URLSearchParams({ city_id: activeCityId });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/agent/escalations?${params}`);
      if (!res.ok) throw new Error('Error');
      const data: AgentEscalation[] = await res.json();
      setEscalations(data);
      setLastRefresh(new Date());
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [activeCityId, statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 30000);
    return () => clearInterval(interval);
  }, [fetchEscalations]);

  const handleRefresh = () => {
    setLoading(true);
    fetchEscalations();
  };

  const handleEscalationUpdated = () => {
    fetchEscalations();
    setSelectedEscalation(null);
  };

  // Client-side priority filter
  const filtered = escalations.filter((e) =>
    !priorityFilter || e.priority === priorityFilter
  );

  if (loading && escalations.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            {PRIORITY_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <span className="text-xs text-gray-400">
          {filtered.length} escalación{filtered.length !== 1 ? 'es' : ''}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-gray-400 hidden sm:inline">
            {formatTime(lastRefresh)}
          </span>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <AlertTriangle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No hay escalaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((esc) => (
            <button
              key={esc.id}
              onClick={() => setSelectedEscalation(esc)}
              className="w-full text-left bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PriorityBadge priority={esc.priority} />
                    <StatusBadge status={esc.status} />
                    {esc.related_order_code && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                        <ShoppingBag className="w-3 h-3" />
                        {formatOrderCode(esc.related_order_code)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {escalationReasonLabels[esc.escalation_reason] ?? esc.escalation_reason}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {formatPhone(esc.customer_phone)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(esc.created_at)}
                    </span>
                  </div>
                  {esc.assigned_to_name && (
                    <p className="text-[10px] text-gray-400">
                      Asignado a: <strong>{esc.assigned_to_name}</strong>
                    </p>
                  )}
                </div>

                {esc.chatwoot_conversation_id && (
                  <span className="flex-shrink-0 p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedEscalation ? (
        <AgentEscalationDetail
          escalation={selectedEscalation}
          agentId={agent?.id ?? null}
          agentName={agent?.name ?? null}
          onClose={() => setSelectedEscalation(null)}
          onUpdated={handleEscalationUpdated}
        />
      ) : null}
    </>
  );
}
