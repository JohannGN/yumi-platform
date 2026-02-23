'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import type { AgentPermissions } from '@/types/agent-panel';
import { agentPermissionLabels, agentPermissionDescriptions } from '@/types/agent-panel';

interface Props {
  agentId: string;
  agentName: string;
  onClose: () => void;
}

const ALL_PERMISSIONS: (keyof AgentPermissions)[] = [
  'can_cancel_orders',
  'can_toggle_restaurants',
  'can_manage_menu_global',
  'can_disable_menu_items',
  'can_view_riders',
  'can_create_orders',
  'can_manage_escalations',
  'can_view_finance_daily',
  'can_view_finance_weekly',
];

export function AdminAgentPermissions({ agentId, agentName, onClose }: Props) {
  const [permissions, setPermissions] = useState<AgentPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/permissions`);
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  async function handleToggle(key: keyof AgentPermissions) {
    if (!permissions) return;
    const updated = { ...permissions, [key]: !permissions[key] };
    setPermissions(updated);

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: { [key]: updated[key] } }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Permiso actualizado' });
      } else {
        // Revert
        setPermissions((prev) => prev ? { ...prev, [key]: !updated[key] } : prev);
        setMessage({ type: 'error', text: 'Error al actualizar' });
      }
    } catch {
      setPermissions((prev) => prev ? { ...prev, [key]: !updated[key] } : prev);
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  }

  async function setAll(value: boolean) {
    if (!permissions) return;
    const updated: AgentPermissions = {} as AgentPermissions;
    ALL_PERMISSIONS.forEach((key) => { updated[key] = value; });
    setPermissions(updated);

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: updated }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: value ? 'Todos activados' : 'Todos desactivados' });
      } else {
        fetchPermissions();
        setMessage({ type: 'error', text: 'Error al actualizar' });
      }
    } catch {
      fetchPermissions();
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Permisos</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{agentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {message ? (
          <div className={[
            'mx-5 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
          ].join(' ')}>
            {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {message.text}
          </div>
        ) : null}

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : permissions ? (
            <div className="space-y-2">
              {/* Bulk actions */}
              <div className="flex justify-end gap-2 mb-3">
                <button
                  onClick={() => setAll(true)}
                  disabled={saving}
                  className="text-[10px] font-medium text-green-600 hover:underline disabled:opacity-50"
                >
                  Activar todos
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={() => setAll(false)}
                  disabled={saving}
                  className="text-[10px] font-medium text-red-500 hover:underline disabled:opacity-50"
                >
                  Desactivar todos
                </button>
              </div>

              {ALL_PERMISSIONS.map((key) => (
                <button
                  key={key}
                  onClick={() => handleToggle(key)}
                  disabled={saving}
                  className={[
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors disabled:opacity-50',
                    permissions[key]
                      ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                  ].join(' ')}
                >
                  {/* Checkbox visual */}
                  <div className={[
                    'w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors',
                    permissions[key]
                      ? 'bg-green-500 border-green-500'
                      : 'bg-transparent border-gray-300 dark:border-gray-600',
                  ].join(' ')}>
                    {permissions[key] && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Label + description */}
                  <div className="text-left flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-white block">
                      {agentPermissionLabels[key]}
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      {agentPermissionDescriptions[key]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Error al cargar permisos</p>
          )}
        </div>
      </div>
    </div>
  );
}
