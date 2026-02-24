'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Ban, Loader2, AlertTriangle, Search, Shield,
} from 'lucide-react';
import { penaltyLevelLabels, formatDate } from '@/config/tokens';
import type { PenaltyInfo } from '@/types/admin-panel-additions';

interface BanPhoneModalProps {
  open: boolean;
  onClose: () => void;
}

const LEVELS = [
  { value: 'warning', label: 'Advertencia', color: '#F59E0B', desc: 'Solo advertencia, puede seguir pidiendo' },
  { value: 'restricted', label: 'Restringido', color: '#F97316', desc: 'Pedidos requieren aprobación de agente' },
  { value: 'banned', label: 'Baneado', color: '#EF4444', desc: 'No puede hacer pedidos por X días' },
] as const;

export function BanPhoneModal({ open, onClose }: BanPhoneModalProps) {
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState<'warning' | 'restricted' | 'banned'>('warning');
  const [reason, setReason] = useState('');
  const [bannedDays, setBannedDays] = useState(7);
  const [instantBan, setInstantBan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [existing, setExisting] = useState<PenaltyInfo | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setPhone('');
    setLevel('warning');
    setReason('');
    setBannedDays(7);
    setInstantBan(false);
    setExisting(null);
    setSuccess(false);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Buscar penalidad existente
  const handleSearch = async () => {
    const formatted = phone.startsWith('+51') ? phone : `+51${phone.replace(/\D/g, '')}`;
    if (!/^\+51\d{9}$/.test(formatted)) {
      setError('Formato inválido. Ingresa 9 dígitos o +51XXXXXXXXX');
      return;
    }

    setSearching(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/penalties?phone=${encodeURIComponent(formatted)}`);
      if (!res.ok) throw new Error('Error buscando');
      const data = await res.json();
      setExisting(data);
      setPhone(formatted);
    } catch {
      setError('Error al buscar penalidad');
    } finally {
      setSearching(false);
    }
  };

  // Aplicar ban
  const handleSubmit = async () => {
    const formatted = phone.startsWith('+51') ? phone : `+51${phone.replace(/\D/g, '')}`;
    if (!/^\+51\d{9}$/.test(formatted)) {
      setError('Formato de teléfono inválido');
      return;
    }
    if (!reason.trim()) {
      setError('El motivo es obligatorio');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const finalLevel = instantBan ? 'banned' : level;
      const res = await fetch('/api/admin/penalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formatted,
          level: finalLevel,
          reason: reason.trim(),
          banned_days: finalLevel === 'banned' ? bannedDays : undefined,
          instant_ban: instantBan,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al aplicar penalidad');
      }

      setSuccess(true);
      setTimeout(handleClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[480px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Banear número
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Aplicar penalidad manual a un teléfono
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Success state */}
            {success ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  Penalidad aplicada
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {phone}
                </p>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {/* Phone input + search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Teléfono del cliente
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="+51987654321"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setExisting(null);
                      }}
                      className="flex-1 px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searching || !phone.trim()}
                      className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      {searching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      Buscar
                    </button>
                  </div>
                </div>

                {/* Existing penalty info */}
                {existing && existing.penalty_level !== 'none' && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Ya tiene penalidad: {penaltyLevelLabels[existing.penalty_level]}
                      </span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {existing.total_penalties} infracción{existing.total_penalties !== 1 ? 'es' : ''}
                      {existing.banned_until && (
                        <> · Baneado hasta {formatDate(existing.banned_until)}</>
                      )}
                    </p>
                    {existing.reasons.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {existing.reasons.slice(-3).map((r, i) => (
                          <p key={i} className="text-xs text-amber-600 dark:text-amber-500">
                            • {r.reason}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {existing && existing.penalty_level === 'none' && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      ✓ Sin penalidades previas
                    </p>
                  </div>
                )}

                {/* Instant ban checkbox */}
                <label className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instantBan}
                    onChange={(e) => {
                      setInstantBan(e.target.checked);
                      if (e.target.checked) setLevel('banned');
                    }}
                    className="w-4 h-4 text-red-500 rounded border-gray-300 focus:ring-red-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      Ban instantáneo
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Directo a baneado sin escalado (abuso verbal, maltrato)
                    </p>
                  </div>
                </label>

                {/* Level selector (disabled if instant ban) */}
                {!instantBan && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nivel de penalidad
                    </label>
                    <div className="space-y-2">
                      {LEVELS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            level === opt.value
                              ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="level"
                            value={opt.value}
                            checked={level === opt.value}
                            onChange={() => setLevel(opt.value)}
                            className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ background: opt.color }}
                              />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {opt.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {opt.desc}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Banned days (only if level=banned or instant) */}
                {(level === 'banned' || instantBan) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Días de ban
                    </label>
                    <div className="flex gap-2">
                      {[3, 7, 14, 30].map((d) => (
                        <button
                          key={d}
                          onClick={() => setBannedDays(d)}
                          className={`px-4 py-2 text-sm rounded-lg transition-all ${
                            bannedDays === d
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {d} días
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reason */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe el motivo del ban..."
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none"
                  />
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !phone.trim() || !reason.trim()}
                    className="flex-1 px-4 py-2.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Ban className="w-4 h-4" />
                    )}
                    Aplicar penalidad
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
