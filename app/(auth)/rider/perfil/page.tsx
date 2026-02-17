'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRider } from '@/components/rider-panel/rider-context';
import { WhatsAppStatusRider } from '@/components/rider-panel/whatsapp-status-rider';
import { ConfirmModal } from '@/components/restaurant-panel/confirm-modal';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatPhone, formatTime, vehicleTypeLabels, colors } from '@/config/tokens';
import { motion } from 'framer-motion';
import type { RiderStats } from '@/types/rider-panel';

export default function RiderProfilePage() {
  const router = useRouter();
  const { rider, refetchRider } = useRider();
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [isShiftLoading, setIsShiftLoading] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/rider/stats');
        if (res.ok) setStats(await res.json());
      } catch { /* silent */ }
    };
    fetchStats();
  }, []);

  // Shift timer
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!rider?.is_online || !rider?.shift_started_at) return;
    const update = () => {
      const diff = Date.now() - new Date(rider.shift_started_at!).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(`${h}h ${m.toString().padStart(2, '0')}min`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [rider?.is_online, rider?.shift_started_at]);

  const handleShiftAction = async (action: 'start' | 'end') => {
    setIsShiftLoading(true);
    setShiftError(null);
    try {
      const res = await fetch('/api/rider/shift', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShiftError(data.error || 'Error');
        return;
      }
      await refetchRider();
    } catch {
      setShiftError('Error de conexión');
    } finally {
      setIsShiftLoading(false);
      setShowEndShiftModal(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (!rider) {
    return <ProfileSkeleton />;
  }

  const isOnShift = rider.is_online;
  const vehicleLabel = vehicleTypeLabels[rider.vehicle_type] || rider.vehicle_type;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">
          Mi perfil
        </h1>
      </div>

      {/* Avatar + info */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-2xl flex-shrink-0">
            🏍️
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {rider.name}
            </h2>
            {rider.phone && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                📱 {formatPhone(rider.phone)}
              </p>
            )}
            {rider.email && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {rider.email}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Vehículo
            </p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
              {vehicleLabel}
              {rider.vehicle_plate && (
                <span className="ml-1 text-gray-400">({rider.vehicle_plate})</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Ciudad
            </p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
              {rider.city_name}
            </p>
          </div>
        </div>
      </motion.div>

      {/* === TURNO — CONTROL ÚNICO === */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`rounded-2xl border-2 p-5 ${
          isOnShift
            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${isOnShift ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <h3 className={`text-sm font-bold ${
            isOnShift
              ? 'text-green-800 dark:text-green-300'
              : 'text-gray-900 dark:text-white'
          }`}>
            {isOnShift ? 'Turno activo' : 'Sin turno activo'}
          </h3>
        </div>

        {isOnShift ? (
          <div className="space-y-4">
            {/* Shift info */}
            <div className="flex items-center justify-between rounded-xl bg-white/60 dark:bg-gray-800/60 px-4 py-3">
              <div>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hora de inicio
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {rider.shift_started_at ? formatTime(rider.shift_started_at) : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tiempo activo
                </p>
                <p className="text-sm font-black tabular-nums" style={{ color: colors.semantic.success }}>
                  ⏱️ {elapsed || '0h 00min'}
                </p>
              </div>
            </div>

            {/* Status note */}
            <p className="text-xs text-green-700 dark:text-green-400 text-center">
              Estás en línea recibiendo pedidos
            </p>

            {/* End shift button */}
            <button
              onClick={() => {
                if (rider.current_order_id) {
                  setShiftError('Completa tu entrega antes de finalizar turno');
                  return;
                }
                setShowEndShiftModal(true);
              }}
              disabled={isShiftLoading}
              className="w-full py-3.5 rounded-xl border-2 border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-sm font-bold text-red-600 dark:text-red-400 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {isShiftLoading ? 'Finalizando...' : '⏹ Finalizar turno'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Last shift info */}
            {rider.shift_ended_at && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Último turno finalizado: {formatTime(rider.shift_ended_at)}
              </p>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
              Al iniciar turno te conectarás y empezarás a recibir pedidos
            </p>

            <button
              onClick={() => handleShiftAction('start')}
              disabled={isShiftLoading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-green-500/20"
              style={{ backgroundColor: colors.semantic.success }}
            >
              {isShiftLoading ? 'Iniciando...' : '▶️ Iniciar turno'}
            </button>
          </div>
        )}

        {/* Error */}
        {shiftError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-500 font-medium mt-3 text-center"
          >
            {shiftError}
          </motion.p>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5"
      >
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
          Estadísticas
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
              {stats?.deliveries_today ?? 0}
            </p>
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Hoy</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
              {stats?.deliveries_week ?? 0}
            </p>
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Semana</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
              {stats?.deliveries_month ?? 0}
            </p>
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Mes</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="text-lg">⭐</span>
          <span className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
            {stats?.avg_rating ? stats.avg_rating.toFixed(1) : '—'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
            ({stats?.total_ratings ?? 0} calificaciones)
          </span>
        </div>
      </motion.div>

      {/* Earnings (conditional) */}
      {rider.show_earnings && stats?.earnings_today_cents !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-100 dark:border-orange-900/40 p-5"
        >
          <h3 className="text-sm font-bold text-orange-800 dark:text-orange-300 mb-3">
            Ganancias
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-black text-orange-700 dark:text-orange-300 tabular-nums">
                {formatCurrency(stats.earnings_today_cents)}
              </p>
              <p className="text-[10px] font-medium text-orange-500 dark:text-orange-400">Hoy</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-orange-700 dark:text-orange-300 tabular-nums">
                {formatCurrency(stats.earnings_week_cents ?? 0)}
              </p>
              <p className="text-[10px] font-medium text-orange-500 dark:text-orange-400">Semana</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-orange-700 dark:text-orange-300 tabular-nums">
                {formatCurrency(stats.earnings_month_cents ?? 0)}
              </p>
              <p className="text-[10px] font-medium text-orange-500 dark:text-orange-400">Mes</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* WhatsApp status */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <WhatsAppStatusRider lastMessageAt={rider.whatsapp_last_message_at} />
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <button
           onClick={() => {
            if (rider.current_order_id) {
              setShiftError('Completa tu entrega antes de cerrar sesión');
              return;
            }
            setShowLogoutModal(true);
          }}
          className="w-full py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-500 dark:text-gray-400 active:scale-[0.98] transition-transform"
        >
          Cerrar sesión
        </button>
      </motion.div>

      {/* End shift modal */}
      {showEndShiftModal && (
        <ConfirmModal
          isOpen={true}
          title="Finalizar turno"
          message="¿Seguro que quieres finalizar? Te desconectarás y dejarás de recibir pedidos."
          confirmLabel="Finalizar turno"
          variant="danger"
          onConfirm={() => handleShiftAction('end')}
          onCancel={() => setShowEndShiftModal(false)}
        />
      )}

      {/* Logout modal */}
      {showLogoutModal && (
        <ConfirmModal
          isOpen={true}
          title="Cerrar sesión"
          message="¿Seguro que quieres salir? Deberás volver a iniciar sesión."
          confirmLabel="Salir"
          variant="danger"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="w-28 h-6 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="w-32 h-5 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-24 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 h-28 animate-pulse" />
      ))}
    </div>
  );
}
