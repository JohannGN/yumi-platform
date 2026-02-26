'use client';

import { useState } from 'react';
import {
  escalationReasonLabels,
  escalationPriorityLabels,
  formatDate,
  formatPhone,
  formatOrderCode,
} from '@/config/design-tokens';
import type { AgentEscalation } from '@/types/agent-panel';
import {
  X,
  Phone,
  Clock,
  ExternalLink,
  ShoppingBag,
  User,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Play,
} from 'lucide-react';

interface Props {
  escalation: AgentEscalation;
  agentId: string | null;
  agentName: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

const CHATWOOT_BASE_URL = process.env.NEXT_PUBLIC_CHATWOOT_URL || 'https://chat.yumi.pe';

export function AgentEscalationDetail({ escalation, agentId, agentName, onClose, onUpdated }: Props) {
  const [resolutionNotes, setResolutionNotes] = useState(escalation.resolution_notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateEscalation(updates: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/escalations/${escalation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Error al actualizar');
      }
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  function handleAssignToMe() {
    if (!agentId) return;
    updateEscalation({ assigned_to_user_id: agentId, status: 'in_progress' });
  }

  function handleMarkInProgress() {
    updateEscalation({ status: 'in_progress' });
  }

  function handleResolve() {
    if (!resolutionNotes.trim()) {
      setError('Escribe notas de resolución antes de cerrar');
      return;
    }
    updateEscalation({ status: 'resolved', resolution_notes: resolutionNotes.trim() });
  }

  const chatwootUrl = escalation.chatwoot_conversation_id
    ? `${CHATWOOT_BASE_URL}/app/accounts/1/conversations/${escalation.chatwoot_conversation_id}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Detalle escalación
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Info principal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {escalationReasonLabels[escalation.escalation_reason] ?? escalation.escalation_reason}
              </span>
              <span className="text-xs text-gray-400">{escalationPriorityLabels[escalation.priority]}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Phone className="w-3.5 h-3.5" />
                <span>{formatPhone(escalation.customer_phone)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDate(escalation.created_at)}</span>
              </div>
              {escalation.related_order_code && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="font-mono text-xs">{formatOrderCode(escalation.related_order_code)}</span>
                </div>
              )}
              {escalation.assigned_to_name && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <User className="w-3.5 h-3.5" />
                  <span>{escalation.assigned_to_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Link Chatwoot */}
          {chatwootUrl && (
            <a
              href={chatwootUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Abrir en Chatwoot
              <ExternalLink className="w-3.5 h-3.5 ml-auto" />
            </a>
          )}

          {/* Contexto conversación */}
          {escalation.conversation_context && escalation.conversation_context.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contexto de la conversación</p>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                {escalation.conversation_context.map((msg, idx) => (
                  <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                    {msg.role && (
                      <span className="font-semibold text-gray-500 dark:text-gray-300 mr-1">
                        {String(msg.role)}:
                      </span>
                    )}
                    <span>{String((msg as Record<string, unknown>).content ?? (msg as Record<string, unknown>).message ?? JSON.stringify(msg))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Notas de resolución
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={3}
              placeholder="Describe cómo se resolvió o qué acciones se tomaron..."
              disabled={escalation.status === 'resolved'}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Resolved info */}
          {escalation.status === 'resolved' && escalation.resolved_at && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">
                Resuelto el {formatDate(escalation.resolved_at)}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {escalation.status !== 'resolved' && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            {!escalation.assigned_to_user_id && agentId && (
              <button
                onClick={handleAssignToMe}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                Asignarme
              </button>
            )}

            {escalation.status === 'pending' && (
              <button
                onClick={handleMarkInProgress}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                En progreso
              </button>
            )}

            <button
              onClick={handleResolve}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Resolver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
