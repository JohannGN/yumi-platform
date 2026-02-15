'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/lib/utils/rounding';
import {
  colors,
  paymentMethodLabels,
  rejectionReasonLabels,
  business,
} from '@/config/tokens';

// ─── Types ─────────────────────────────────────────────────

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  theme_color: string;
}

interface OrderItem {
  menu_item_id: string;
  name: string;
  variant_id: string | null;
  variant_name: string | null;
  base_price_cents: number;
  quantity: number;
  modifiers: {
    group_name: string;
    selections: { name: string; price_cents: number }[];
  }[];
  unit_total_cents: number;
  line_total_cents: number;
}

interface RiderInfo {
  id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  vehicle_type: string;
  vehicle_plate?: string | null;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
}

interface StatusHistoryEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  created_at: string;
  notes: string | null;
}

interface OrderData {
  id: string;
  code: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_instructions: string | null;
  items: OrderItem[];
  subtotal_cents: number;
  delivery_fee_cents: number;
  service_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  payment_method: string;
  payment_status: string;
  rejection_reason: string | null;
  rejection_notes: string | null;
  customer_rating: number | null;
  customer_comment: string | null;
  estimated_prep_time_minutes: number | null;
  estimated_delivery_time_minutes: number | null;
  created_at: string;
  confirmed_at: string | null;
  restaurant_confirmed_at: string | null;
  ready_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  restaurant: Restaurant;
  rider_id: string | null;
}

interface TrackingData {
  order: OrderData;
  status_history: StatusHistoryEntry[];
  rider: RiderInfo | null;
}

// ─── Timeline Steps (with contextual messages) ─────────────

interface TimelineStep {
  status: string;
  icon: string;
  label: string;
  getContextMessage: (restaurantName: string) => string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    status: 'pending_confirmation',
    icon: '📋',
    label: 'Pedido recibido',
    getContextMessage: (r) => `Recibido en ${r}, esperando su confirmación`,
  },
  {
    status: 'confirmed',
    icon: '✅',
    label: 'Confirmado',
    getContextMessage: (r) => `${r} ha confirmado tu pedido`,
  },
  {
    status: 'preparing',
    icon: '👨‍🍳',
    label: 'Preparando',
    getContextMessage: (r) => `${r} está cocinando para ti`,
  },
  {
    status: 'ready',
    icon: '📦',
    label: 'Listo',
    getContextMessage: () => `Tu pedido está listo para recoger`,
  },
  {
    status: 'assigned_rider',
    icon: '🏍️',
    label: 'Rider asignado',
    getContextMessage: () => `Hemos asignado un rider para ti`,
  },
  {
    status: 'picked_up',
    icon: '🛵',
    label: 'Recogido',
    getContextMessage: () => `El rider recogió tu pedido del restaurante`,
  },
  {
    status: 'in_transit',
    icon: '🚀',
    label: 'En camino',
    getContextMessage: () => `Tu pedido va en camino hacia ti`,
  },
  {
    status: 'delivered',
    icon: '🎉',
    label: '¡Entregado!',
    getContextMessage: () => `¡Buen provecho! Gracias por pedir con YUMI`,
  },
];

function getStepIndex(status: string): number {
  const idx = TIMELINE_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : -1;
}

function getStatusColor(status: string): string {
  const colorMap = colors.orderStatus as Record<string, string>;
  return colorMap[status] || '#9CA3AF';
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return '';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: business.timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

const vehicleIcons: Record<string, string> = {
  motorcycle: '🏍️',
  bicycle: '🚲',
  car: '🚗',
};

// ─── Main Component ────────────────────────────────────────

interface OrderTrackingClientProps {
  code: string;
}

export function OrderTrackingClient({ code }: OrderTrackingClientProps) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const riderMarkerRef = useRef<google.maps.Marker | null>(null);
  const prevStatusRef = useRef<string>('');

  // ─── Fetch Order Data ──────────────────────────────────

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/track/${code}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Pedido no encontrado');
      }
      const trackingData: TrackingData = await res.json();
      setData(trackingData);

      // Detect delivery for confetti
      if (
        prevStatusRef.current &&
        prevStatusRef.current !== 'delivered' &&
        trackingData.order.status === 'delivered'
      ) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
      prevStatusRef.current = trackingData.order.status;

      // Pre-fill rating
      if (trackingData.order.customer_rating) {
        setRatingValue(trackingData.order.customer_rating);
        setRatingComment(trackingData.order.customer_comment || '');
        setRatingDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // ─── Supabase Realtime ─────────────────────────────────

  useEffect(() => {
    if (!data?.order) return;

    let channel: ReturnType<typeof import('@supabase/supabase-js').createClient> | null = null;

    const setupRealtime = async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Listen for order status changes
      const orderChannel = supabase
        .channel(`order-track-${data.order.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${data.order.id}`,
          },
          () => {
            // Refetch all order data on any update
            fetchOrder();
          }
        );

      // Listen for rider location updates if rider assigned
      if (data.rider?.id) {
        orderChannel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'riders',
            filter: `id=eq.${data.rider.id}`,
          },
          (payload) => {
            const newData = payload.new as Record<string, unknown>;
            if (newData.current_lat && newData.current_lng) {
              updateRiderMarker(
                Number(newData.current_lat),
                Number(newData.current_lng)
              );
              setData((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  rider: prev.rider
                    ? {
                        ...prev.rider,
                        current_lat: Number(newData.current_lat),
                        current_lng: Number(newData.current_lng),
                      }
                    : prev.rider,
                };
              });
            }
          }
        );
      }

      orderChannel.subscribe();
      channel = orderChannel as any;
    };

    setupRealtime();

    return () => {
      if (channel && typeof (channel as any).unsubscribe === 'function') {
        (channel as any).unsubscribe();
      }
    };
  }, [data?.order?.id, data?.rider?.id, fetchOrder]);

  // ─── Google Maps ───────────────────────────────────────

  const showMap = useMemo(() => {
    if (!data?.order) return false;
    const mapStatuses = ['assigned_rider', 'picked_up', 'in_transit', 'delivered'];
    return mapStatuses.includes(data.order.status) && data.rider;
  }, [data]);

  useEffect(() => {
    if (!showMap || !mapRef.current || !data?.order) return;

    const initMap = async () => {
      if (typeof google === 'undefined') {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`;
        script.async = true;
        script.defer = true;
        script.onload = () => createMap();
        document.head.appendChild(script);
      } else {
        createMap();
      }
    };

    const createMap = () => {
      if (!mapRef.current || !data?.order) return;

      const restaurant = data.order.restaurant;
      const center = {
        lat: (restaurant.lat + data.order.delivery_lat) / 2,
        lng: (restaurant.lng + data.order.delivery_lng) / 2,
      };

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });

      googleMapRef.current = map;

      // Restaurant marker
      new google.maps.Marker({
        position: { lat: Number(restaurant.lat), lng: Number(restaurant.lng) },
        map,
        label: { text: '🏪', fontSize: '24px' },
        title: restaurant.name,
      });

      // Customer marker
      new google.maps.Marker({
        position: { lat: data.order.delivery_lat, lng: data.order.delivery_lng },
        map,
        label: { text: '📍', fontSize: '24px' },
        title: 'Tu ubicación',
      });

      // Rider marker
      if (data.rider?.current_lat && data.rider?.current_lng) {
        riderMarkerRef.current = new google.maps.Marker({
          position: { lat: data.rider.current_lat, lng: data.rider.current_lng },
          map,
          label: { text: vehicleIcons[data.rider.vehicle_type] || '🏍️', fontSize: '24px' },
          title: data.rider.name,
        });
      }

      // Fit bounds
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: Number(restaurant.lat), lng: Number(restaurant.lng) });
      bounds.extend({ lat: data.order.delivery_lat, lng: data.order.delivery_lng });
      if (data.rider?.current_lat && data.rider?.current_lng) {
        bounds.extend({ lat: data.rider.current_lat, lng: data.rider.current_lng });
      }
      map.fitBounds(bounds, 60);
    };

    initMap();
  }, [showMap, data?.order?.id]);

  const updateRiderMarker = (lat: number, lng: number) => {
    if (riderMarkerRef.current) {
      const start = riderMarkerRef.current.getPosition();
      if (!start) {
        riderMarkerRef.current.setPosition({ lat, lng });
        return;
      }
      const startLat = start.lat();
      const startLng = start.lng();
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t * (2 - t); // ease-out quad
        const newLat = startLat + (lat - startLat) * eased;
        const newLng = startLng + (lng - startLng) * eased;
        riderMarkerRef.current?.setPosition({ lat: newLat, lng: newLng });
        if (t < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  };

  // ─── Rating ────────────────────────────────────────────

  const handleSubmitRating = async () => {
    if (!data?.order || ratingValue === 0) return;
    setRatingSubmitting(true);
    try {
      const res = await fetch(`/api/orders/rate/${data.order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingValue, comment: ratingComment.trim() || undefined }),
      });
      if (res.ok) {
        setRatingDone(true);
      }
    } catch {
      // Silent fail, user can retry
    } finally {
      setRatingSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────

  if (loading) return <TrackingSkeleton />;
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <span className="text-5xl block">🔍</span>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {error || 'Pedido no encontrado'}
          </h1>
          <a
            href="/"
            className="inline-block px-6 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: colors.brand.primary }}
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  const { order, rider } = data;
  const currentStepIdx = getStepIndex(order.status);
  const isTerminal = ['delivered', 'cancelled', 'rejected'].includes(order.status);
  const formattedCode = `${order.code.slice(0, 3)}-${order.code.slice(3)}`;
  const restaurantName = order.restaurant.name;

  // Map status to timestamp
  const statusTimestamps: Record<string, string | null> = {
    pending_confirmation: order.confirmed_at || order.created_at,
    confirmed: order.restaurant_confirmed_at,
    preparing: order.restaurant_confirmed_at,
    ready: order.ready_at,
    assigned_rider: order.assigned_at,
    picked_up: order.picked_up_at,
    in_transit: order.in_transit_at,
    delivered: order.delivered_at,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Confetti overlay */}
      {showConfetti && <ConfettiOverlay />}

      <div className="max-w-[430px] mx-auto pb-8">
        {/* ─── Header (redesigned) ────────────────────── */}
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <a
              href="/"
              className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0"
            >
              ← Inicio
            </a>
            <button
              onClick={() => setDetailsOpen(true)}
              className="text-center group transition-transform active:scale-95"
            >
              <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-semibold">
                Código de seguimiento
              </p>
              <p
                className="text-lg font-bold tracking-wider tabular-nums mt-0.5"
                style={{ color: colors.brand.primary }}
              >
                {formattedCode}
              </p>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                Toca para ver detalle ▾
              </p>
            </button>
            <div className="shrink-0 w-12" />
          </div>
          {/* Restaurant context bar */}
          <div className="flex items-center gap-2 px-4 pb-2.5">
            {order.restaurant.logo_url ? (
              <img
                src={order.restaurant.logo_url}
                alt=""
                className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: colors.brand.primary }}
              >
                {restaurantName.charAt(0)}
              </div>
            )}
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
              {restaurantName}
            </span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {paymentMethodLabels[order.payment_method] || order.payment_method}
            </span>
          </div>
        </div>

        {/* ─── Status Banner (current state summary) ──── */}
        {!isTerminal && currentStepIdx >= 0 && (
          <motion.div
            key={order.status}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 p-3.5 rounded-2xl border"
            style={{
              backgroundColor: `${getStatusColor(order.status)}10`,
              borderColor: `${getStatusColor(order.status)}30`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {TIMELINE_STEPS[currentStepIdx].icon}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-bold"
                  style={{ color: getStatusColor(order.status) }}
                >
                  {TIMELINE_STEPS[currentStepIdx].label}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {TIMELINE_STEPS[currentStepIdx].getContextMessage(restaurantName)}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Rejected state */}
        {order.status === 'rejected' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 p-5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center space-y-3"
          >
            <span className="text-4xl block">😔</span>
            <h2 className="text-xl font-bold text-red-700 dark:text-red-400">
              Tu pedido fue rechazado
            </h2>
            {order.rejection_reason && (
              <p className="text-sm text-red-600 dark:text-red-300">
                Motivo: {rejectionReasonLabels[order.rejection_reason] || order.rejection_reason}
              </p>
            )}
            {order.rejection_notes && (
              <p className="text-sm text-red-500 dark:text-red-400 italic">
                &quot;{order.rejection_notes}&quot;
              </p>
            )}
            <a
              href={`/${order.restaurant.slug}`}
              className="inline-block mt-2 px-6 py-2.5 rounded-xl font-semibold text-white"
              style={{ backgroundColor: colors.brand.primary }}
            >
              Pedir de nuevo
            </a>
          </motion.div>
        )}

        {/* Cancelled state */}
        {order.status === 'cancelled' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 p-5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-center space-y-3"
          >
            <span className="text-4xl block">🚫</span>
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">
              Pedido cancelado
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Si tienes dudas, contáctanos por WhatsApp
            </p>
            <a
              href="/"
              className="inline-block mt-2 px-6 py-2.5 rounded-xl font-semibold text-white"
              style={{ backgroundColor: colors.brand.primary }}
            >
              Volver al inicio
            </a>
          </motion.div>
        )}

        {/* ─── Rider Info Card (improved, with plate + YUMI support) ── */}
        {rider && ['assigned_rider', 'picked_up', 'in_transit'].includes(order.status) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center gap-3">
              {/* Rider avatar */}
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-2xl shrink-0">
                {vehicleIcons[rider.vehicle_type] || '🏍️'}
              </div>

              {/* Rider info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {rider.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {rider.vehicle_plate && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-[11px] font-mono font-bold text-gray-700 dark:text-gray-300 tracking-wide">
                      {rider.vehicle_plate}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {order.status === 'assigned_rider'
                      ? 'Yendo al restaurante'
                      : order.status === 'picked_up'
                        ? 'Recogió tu pedido'
                        : 'En camino hacia ti'}
                  </span>
                </div>
              </div>

              {/* Contact button → YUMI WhatsApp support (protects rider privacy) */}
              <a
                href={`https://wa.me/${business.yumiWhatsApp.replace('+', '')}?text=${encodeURIComponent(`Hola, necesito ayuda con mi pedido ${formattedCode}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/40 text-lg shrink-0 transition-transform active:scale-90"
                title="Contactar soporte YUMI"
              >
                💬
              </a>
            </div>
          </motion.div>
        )}

        {/* Map (appears when rider assigned) */}
        {showMap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 200 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="mx-4 mt-4 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div ref={mapRef} className="w-full h-[200px]" />
          </motion.div>
        )}

        {/* ─── Timeline (with contextual messages) ────── */}
        {!['rejected', 'cancelled'].includes(order.status) && (
          <div className="mx-4 mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
              Seguimiento
            </h3>
            <div className="relative">
              {TIMELINE_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const isFuture = idx > currentStepIdx;
                const timestamp = statusTimestamps[step.status];
                const statusColor = getStatusColor(step.status);
                const isLast = idx === TIMELINE_STEPS.length - 1;

                return (
                  <div key={step.status} className="flex gap-4 pb-1 last:pb-0">
                    {/* Vertical line + circle */}
                    <div className="flex flex-col items-center w-10 shrink-0">
                      {/* Circle */}
                      <div className="relative">
                        {/* Ripple rings for current step — SLOWED to 3s for calm UX */}
                        {isCurrent && (
                          <>
                            <span
                              className="absolute inset-[-6px] rounded-full opacity-0"
                              style={{
                                backgroundColor: statusColor,
                                animation: 'tracking-ripple 3s ease-out infinite',
                              }}
                            />
                            <span
                              className="absolute inset-[-6px] rounded-full opacity-0"
                              style={{
                                backgroundColor: statusColor,
                                animation: 'tracking-ripple 3s ease-out infinite 1s',
                              }}
                            />
                            <span
                              className="absolute inset-[-6px] rounded-full opacity-0"
                              style={{
                                backgroundColor: statusColor,
                                animation: 'tracking-ripple 3s ease-out infinite 2s',
                              }}
                            />
                          </>
                        )}

                        <div
                          className={`
                            relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                            text-lg transition-all duration-500
                            ${isCurrent ? 'ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900 shadow-lg' : ''}
                            ${isCompleted ? 'bg-green-100 dark:bg-green-900/40' : ''}
                            ${isFuture ? 'bg-gray-100 dark:bg-gray-800' : ''}
                          `}
                          style={
                            isCurrent
                              ? { backgroundColor: statusColor, ringColor: statusColor }
                              : undefined
                          }
                        >
                          {isCompleted ? (
                            <span className="text-green-600 dark:text-green-400 text-sm font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className={isFuture ? 'grayscale opacity-40' : ''}>
                              {step.icon}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Connecting line */}
                      {!isLast && (
                        <div
                          className={`w-0.5 flex-1 min-h-[24px] transition-colors duration-500 ${
                            isCompleted
                              ? 'bg-green-400 dark:bg-green-600'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      )}
                    </div>

                    {/* Label + context message + timestamp */}
                    <div className={`flex-1 pt-2 ${isLast ? 'pb-0' : 'pb-4'}`}>
                      <p
                        className={`text-sm font-semibold transition-colors ${
                          isCurrent
                            ? 'text-gray-900 dark:text-white'
                            : isCompleted
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-gray-400 dark:text-gray-600'
                        }`}
                      >
                        {step.label}
                      </p>

                      {/* Contextual message */}
                      {(isCompleted || isCurrent) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {step.getContextMessage(restaurantName)}
                        </p>
                      )}

                      {/* Timestamp */}
                      {(isCompleted || isCurrent) && timestamp && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums mt-0.5">
                          {formatTimestamp(timestamp)}
                        </p>
                      )}

                      {/* Prep time estimate */}
                      {isCurrent && order.estimated_prep_time_minutes && step.status === 'preparing' && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          ⏱ ~{order.estimated_prep_time_minutes} min estimados
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rating (delivered only) */}
        {order.status === 'delivered' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-4 mt-4 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3"
          >
            <div className="text-center">
              <span className="text-3xl block mb-1">🎉</span>
              <h3 className="font-bold text-gray-900 dark:text-white">
                {ratingDone ? '¡Gracias por calificar!' : '¿Cómo estuvo tu pedido?'}
              </h3>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => !ratingDone && setRatingValue(star)}
                  className="text-3xl transition-all duration-200"
                  style={{ opacity: star <= ratingValue ? 1 : 0.3 }}
                  disabled={ratingDone}
                >
                  ⭐
                </motion.button>
              ))}
            </div>

            {/* Comment */}
            {!ratingDone && ratingValue > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Cuéntanos más... (opcional)"
                  maxLength={500}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:border-[#FF6B35]"
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmitRating}
                  disabled={ratingSubmitting}
                  className="w-full mt-2 py-2.5 rounded-xl font-semibold text-white transition-all"
                  style={{ backgroundColor: colors.brand.primary }}
                >
                  {ratingSubmitting ? 'Enviando...' : 'Enviar calificación'}
                </motion.button>
              </motion.div>
            )}

            {ratingDone && ratingComment && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center italic">
                &quot;{ratingComment}&quot;
              </p>
            )}
          </motion.div>
        )}

        {/* Bottom Sheet Drawer — triggered from header code */}
        <AnimatePresence>
          {detailsOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/50"
                onClick={() => setDetailsOpen(false)}
              />

              {/* Drawer */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-50"
              >
                <div className="bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col">
                  {/* Drag handle + header */}
                  <div className="pt-3 pb-2 px-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-3" />
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Detalle del pedido
                      </h3>
                      <button
                        onClick={() => setDetailsOpen(false)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors text-sm font-bold"
                      >
                        –
                      </button>
                    </div>
                    {/* Code + restaurant */}
                    <div className="flex items-center gap-2 mt-1 mb-1">
                      <span
                        className="text-xs font-bold tracking-wider tabular-nums"
                        style={{ color: colors.brand.primary }}
                      >
                        {formattedCode}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {restaurantName}
                      </span>
                    </div>
                  </div>

                  {/* Scrollable content */}
                  <div className="overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
                    {/* Items */}
                    {(order.items as OrderItem[]).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between gap-2 py-1.5 border-b border-dashed border-gray-200 dark:border-gray-700 last:border-0"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            x{item.quantity} {item.name}
                            {item.variant_name && (
                              <span className="text-gray-500"> — {item.variant_name}</span>
                            )}
                          </p>
                          {item.modifiers?.map((mod, mIdx) => (
                            <p key={mIdx} className="text-xs text-gray-400 dark:text-gray-500">
                              {mod.group_name}:{' '}
                              {mod.selections.map((s) => s.name).join(', ')}
                            </p>
                          ))}
                        </div>
                        <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300 shrink-0">
                          {formatPrice(item.line_total_cents)}
                        </span>
                      </div>
                    ))}

                    {/* Totals */}
                    <div className="pt-2 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="tabular-nums text-gray-700 dark:text-gray-300">
                          {formatPrice(order.subtotal_cents)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Delivery</span>
                        <span className="tabular-nums text-gray-700 dark:text-gray-300">
                          {formatPrice(order.delivery_fee_cents)}
                        </span>
                      </div>
                      {order.discount_cents > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Descuento</span>
                          <span className="tabular-nums">-{formatPrice(order.discount_cents)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-900 dark:text-white">Total</span>
                        <span className="tabular-nums" style={{ color: colors.brand.primary }}>
                          {formatPrice(order.total_cents)}
                        </span>
                      </div>
                    </div>

                    {/* Payment & delivery */}
                    <div className="pt-2 space-y-1.5 text-xs text-gray-500 dark:text-gray-400 pb-4">
                      <p>
                        <span className="font-medium">Pago:</span>{' '}
                        {paymentMethodLabels[order.payment_method] || order.payment_method}
                      </p>
                      <p>
                        <span className="font-medium">Cliente:</span>{' '}
                        {order.customer_name}
                      </p>
                      <p>
                        <span className="font-medium">Dirección:</span>{' '}
                        {order.delivery_address}
                      </p>
                      {order.delivery_instructions && (
                        <p>
                          <span className="font-medium">Ref:</span>{' '}
                          {order.delivery_instructions}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Ripple keyframes — SLOWED to 3s for calm tracking UX */}
      <style jsx global>{`
        @keyframes tracking-ripple {
          0% {
            transform: scale(0.8);
            opacity: 0.4;
          }
          100% {
            transform: scale(2.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────

function TrackingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[430px] mx-auto">
        {/* Header skeleton */}
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="w-12 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="w-12" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>

        {/* Status banner skeleton */}
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-2 flex-1">
              <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="w-48 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>

        {/* Timeline skeleton */}
        <div className="px-4 pt-5 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                {i < 5 && <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-700 mt-1" />}
              </div>
              <div className="flex-1 pt-2 space-y-1">
                <div className="w-28 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="w-40 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Confetti (CSS-only) ───────────────────────────────────

function ConfettiOverlay() {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => {
        const confettiColors = ['#FF6B35', '#FFB800', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];
        const color = confettiColors[i % confettiColors.length];
        const left = `${Math.random() * 100}%`;
        const delay = `${Math.random() * 0.8}s`;
        const duration = `${1.5 + Math.random() * 1.5}s`;
        const size = 6 + Math.random() * 6;

        return (
          <div
            key={i}
            className="absolute top-0"
            style={{
              left,
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animation: `confetti-fall ${duration} ease-in ${delay} forwards`,
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(${360 + Math.random() * 360}deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
