'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  colors,
  googleMapsConfig,
  orderStatusLabels,
  vehicleTypeLabels,
  formatOrderCode,
} from '@/config/tokens';
import { MapFilterPanel } from './map-filter-panel';
import type {
  MapRider,
  MapRestaurant,
  MapActiveOrder,
  HeatmapPoint,
  MapFilters,
} from '@/types/admin-panel-additions';

const ACTIVE_STATUSES = [
  'awaiting_confirmation', 'pending_confirmation', 'confirmed',
  'preparing', 'ready', 'assigned_rider', 'picked_up', 'in_transit',
];

function getRiderColor(r: MapRider): string {
  if (!r.is_online) return colors.riderStatus.offline;
  if (!r.is_available || r.current_order_id) return colors.riderStatus.busy;
  return colors.riderStatus.available;
}

function getRiderStatus(r: MapRider): string {
  if (!r.is_online) return 'Offline';
  if (!r.is_available || r.current_order_id) return 'Ocupado';
  return 'Disponible';
}

function getOrderColor(status: string): string {
  return (colors.orderStatus as Record<string, string>)[status] || '#9CA3AF';
}

function createMarkerIcon(color: string, size: number = 12): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}" viewBox="0 0 ${size * 2} ${size * 2}">
    <circle cx="${size}" cy="${size}" r="${size - 1}" fill="${color}" stroke="white" stroke-width="2"/>
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(size * 2, size * 2),
    anchor: new google.maps.Point(size, size),
  };
}

function createRestaurantIcon(isOpen: boolean, shouldBeOpen: boolean = false): google.maps.Icon {
  const color = isOpen ? '#22C55E' : shouldBeOpen ? '#F59E0B' : '#EF4444';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <rect x="2" y="2" width="24" height="24" rx="6" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="14" y="19" text-anchor="middle" font-size="14">🏪</text>
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(28, 28),
    anchor: new google.maps.Point(14, 14),
  };
}

function createOrderIcon(color: string): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(24, 32),
    anchor: new google.maps.Point(12, 32),
  };
}

export function OperationalMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [loading, setLoading] = useState(true);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [riders, setRiders] = useState<MapRider[]>([]);
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([]);
  const [activeOrders, setActiveOrders] = useState<MapActiveOrder[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);

  const [filters, setFilters] = useState<MapFilters>({
    showRiders: true,
    showRestaurants: true,
    showOrders: true,
    showHeatmap: false,
    riderStatus: 'all',
    orderStatus: 'all',
    heatmapDays: 30,
  });

  const [cityId, setCityId] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [vizAvailable, setVizAvailable] = useState(false);
  const supabase = createClient();

  // ── Load Google Maps Script ───────────────────────────────────────────────
  useEffect(() => {
    async function loadMaps() {
      // Case 1: Maps already loaded by another component
      if (window.google?.maps) {
        // Ensure Map constructor is ready (modern async API may require importLibrary)
        if (typeof google.maps.Map !== 'function' && typeof google.maps.importLibrary === 'function') {
          try {
            await google.maps.importLibrary('maps');
          } catch {
            setMapError('Error al inicializar Google Maps.');
            return;
          }
        }

        // Verify Map is now available
        if (typeof google.maps.Map !== 'function') {
          setMapError('Google Maps no se cargó correctamente. Recarga la página.');
          return;
        }

        setMapsLoaded(true);

        // Try visualization for heatmap (optional)
        if (window.google.maps.visualization) {
          setVizAvailable(true);
        } else if (typeof google.maps.importLibrary === 'function') {
          try {
            await google.maps.importLibrary('visualization');
            setVizAvailable(true);
          } catch {
            console.info('[OperationalMap] Heatmap not available');
          }
        }
        return;
      }

      // Case 2: Script tag exists but hasn't fired yet
      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existing) {
        const onLoad = () => {
          // Wait a tick for constructors to initialize
          setTimeout(() => {
            if (typeof google?.maps?.Map === 'function') {
              setMapsLoaded(true);
              if (window.google?.maps?.visualization) setVizAvailable(true);
            }
          }, 100);
        };
        existing.addEventListener('load', onLoad);
        existing.addEventListener('error', () => setMapError('No se pudo cargar Google Maps.'));
        return;
      }

      // Case 3: First load — include visualization
      const callbackName = '_yumiMapsCallback';
      (window as Record<string, unknown>)[callbackName] = () => {
        setMapsLoaded(true);
        if (window.google?.maps?.visualization) setVizAvailable(true);
        delete (window as Record<string, unknown>)[callbackName];
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=visualization&callback=${callbackName}&loading=async`;
      script.async = true;
      script.onerror = () => {
        setMapError('No se pudo cargar Google Maps. Si usas un bloqueador de anuncios, desactívalo para este sitio.');
        delete (window as Record<string, unknown>)[callbackName];
      };
      document.head.appendChild(script);
    }

    loadMaps();
  }, []);

  // ── Get city_id from profile ──────────────────────────────────────────────
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('users')
        .select('role, city_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (profile.role === 'owner') {
          // Owner: usar primera ciudad activa
          const { data: cities } = await supabase
            .from('cities')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .single();
          setCityId(cities?.id ?? null);
        } else {
          setCityId(profile.city_id);
        }
      }
    }
    loadProfile();
  }, [supabase]);

  // ── Fetch map data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!cityId) return;
    try {
      const res = await fetch(
        `/api/admin/map/data?city_id=${cityId}&heatmap_days=${filters.heatmapDays}`
      );
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setRiders(data.riders ?? []);
      setRestaurants(data.restaurants ?? []);
      setActiveOrders(data.active_orders ?? []);
      setHeatmapPoints(data.heatmap_points ?? []);
    } catch (err) {
      console.error('[OperationalMap] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [cityId, filters.heatmapDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Realtime subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!cityId) return;

    const ridersChannel = supabase
      .channel('map-riders')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'riders' },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          setRiders((prev) =>
            prev.map((r) =>
              r.id === updated.id
                ? {
                    ...r,
                    lat: Number(updated.current_lat ?? r.lat),
                    lng: Number(updated.current_lng ?? r.lng),
                    is_online: updated.is_online as boolean,
                    is_available: updated.is_available as boolean,
                    current_order_id: updated.current_order_id as string | null,
                  }
                : r
            )
          );
        }
      )
      .subscribe();

    const ordersChannel = supabase
      .channel('map-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Record<string, unknown>;
            const status = updated.status as string;

            if (ACTIVE_STATUSES.includes(status)) {
              setActiveOrders((prev) => {
                const exists = prev.find((o) => o.id === updated.id);
                if (exists) {
                  return prev.map((o) =>
                    o.id === updated.id ? { ...o, status } : o
                  );
                }
                // New active order — refetch to get names
                fetchData();
                return prev;
              });
            } else {
              // Delivered/cancelled — remove from map
              setActiveOrders((prev) =>
                prev.filter((o) => o.id !== updated.id)
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ridersChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [cityId, supabase, fetchData]);

  // ── Initialize map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: googleMapsConfig.defaultCenter,
      zoom: googleMapsConfig.defaultZoom,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    infoWindowRef.current = new google.maps.InfoWindow();
  }, [mapsLoaded]);

  // ── Update markers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !mapsLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current!;

    // ── Rider markers ─────────────────────────────────────────────────────
    if (filters.showRiders) {
      const filteredRiders = riders.filter((r) => {
        if (filters.riderStatus === 'all') return true;
        if (filters.riderStatus === 'available') return r.is_online && r.is_available && !r.current_order_id;
        if (filters.riderStatus === 'busy') return r.is_online && (!r.is_available || !!r.current_order_id);
        if (filters.riderStatus === 'offline') return !r.is_online;
        return true;
      });

      filteredRiders.forEach((r) => {
        const marker = new google.maps.Marker({
          position: { lat: r.lat, lng: r.lng },
          map,
          icon: createMarkerIcon(getRiderColor(r), 10),
          title: r.name,
          zIndex: 3,
        });

        marker.addListener('click', () => {
          infoWindow.setContent(`
            <div style="min-width:180px;font-family:system-ui;font-size:13px">
              <strong>${r.name}</strong>
              <div style="color:${getRiderColor(r)};font-size:12px;margin:4px 0">
                ● ${getRiderStatus(r)}
              </div>
              <div style="color:#6B7280;font-size:11px">
                ${vehicleTypeLabels[r.vehicle_type] || r.vehicle_type}
                ${r.current_order_id ? '<br/>📦 Pedido activo' : ''}
              </div>
              <a href="/admin/riders" style="color:#3B82F6;font-size:11px;text-decoration:none;margin-top:6px;display:inline-block">
                Ver detalle →
              </a>
            </div>
          `);
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });
    }

    // ── Restaurant markers ────────────────────────────────────────────────
    if (filters.showRestaurants) {
      restaurants.forEach((rest) => {
        const marker = new google.maps.Marker({
          position: { lat: rest.lat, lng: rest.lng },
          map,
          icon: createRestaurantIcon(rest.is_open, rest.schedule_open),
          title: rest.name,
          zIndex: 1,
        });

        marker.addListener('click', () => {
          // Smart status: is_open vs schedule
          let statusText = '';
          let statusColor = '';
          if (rest.is_open) {
            statusText = 'Abierto';
            statusColor = '#22C55E';
          } else if (rest.schedule_open) {
            // Should be open per schedule but isn't
            statusText = '⚠️ No abrió';
            statusColor = '#F59E0B';
          } else {
            statusText = 'Cerrado';
            statusColor = '#EF4444';
          }

          infoWindow.setContent(`
            <div style="min-width:200px;font-family:system-ui;font-size:13px;padding:4px 0">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#111827">${rest.name || 'Sin nombre'}</div>
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor}"></span>
                <span style="font-size:12px;color:${statusColor};font-weight:600">${statusText}</span>
              </div>
              <div style="color:#9CA3AF;font-size:11px;margin-bottom:4px">${rest.schedule_label}</div>
              <div style="color:#6B7280;font-size:11px;margin-bottom:2px">${rest.category_name}</div>
              ${rest.address ? `<div style="color:#9CA3AF;font-size:11px;margin-bottom:6px">${rest.address}</div>` : ''}
              <a href="/admin/restaurantes" style="color:#3B82F6;font-size:11px;text-decoration:none;font-weight:500">
                Ver detalle →
              </a>
            </div>
          `);
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });
    }

    // ── Order markers ─────────────────────────────────────────────────────
    if (filters.showOrders) {
      const filteredOrders = activeOrders.filter((o) => {
        if (filters.orderStatus === 'all') return true;
        return o.status === filters.orderStatus;
      });

      filteredOrders.forEach((order) => {
        const marker = new google.maps.Marker({
          position: { lat: order.delivery_lat, lng: order.delivery_lng },
          map,
          icon: createOrderIcon(getOrderColor(order.status)),
          title: formatOrderCode(order.code),
          zIndex: 2,
        });

        marker.addListener('click', () => {
          const statusLabel = orderStatusLabels[order.status] || order.status;
          infoWindow.setContent(`
            <div style="min-width:200px;font-family:system-ui;font-size:13px">
              <strong>📦 ${formatOrderCode(order.code)}</strong>
              <div style="color:${getOrderColor(order.status)};font-size:12px;margin:4px 0">
                ● ${statusLabel}
              </div>
              <div style="color:#6B7280;font-size:11px">
                🏪 ${order.restaurant_name}
                ${order.rider_name ? `<br/>🏍️ ${order.rider_name}` : '<br/><em>Sin rider</em>'}
              </div>
              <a href="/admin/pedidos" style="color:#3B82F6;font-size:11px;text-decoration:none;margin-top:6px;display:inline-block">
                Ver pedido →
              </a>
            </div>
          `);
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });
    }
  }, [riders, restaurants, activeOrders, filters, mapsLoaded]);

  // ── Heatmap layer (only if visualization library loaded) ────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !mapsLoaded || !vizAvailable) return;

    // Remove existing
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }

    if (!filters.showHeatmap || heatmapPoints.length === 0) return;

    const data = heatmapPoints.map((p) => ({
      location: new google.maps.LatLng(p.lat, p.lng),
      weight: p.weight,
    }));

    heatmapRef.current = new google.maps.visualization.HeatmapLayer({
      data,
      map: mapInstanceRef.current,
      radius: 40,
      opacity: 0.6,
      gradient: [
        'rgba(0, 0, 0, 0)',
        'rgba(255, 107, 53, 0.4)',
        'rgba(255, 107, 53, 0.6)',
        'rgba(255, 184, 0, 0.8)',
        'rgba(239, 68, 68, 1)',
      ],
    });
  }, [heatmapPoints, filters.showHeatmap, mapsLoaded, vizAvailable]);

  // ── Counts for filter panel ───────────────────────────────────────────────
  const counts = {
    riders: riders.filter((r) => {
      if (filters.riderStatus === 'all') return true;
      if (filters.riderStatus === 'available') return r.is_online && r.is_available && !r.current_order_id;
      if (filters.riderStatus === 'busy') return r.is_online && (!r.is_available || !!r.current_order_id);
      if (filters.riderStatus === 'offline') return !r.is_online;
      return true;
    }).length,
    restaurants: restaurants.length,
    orders: activeOrders.filter((o) =>
      filters.orderStatus === 'all' ? true : o.status === filters.orderStatus
    ).length,
    heatmap: heatmapPoints.reduce((sum, p) => sum + p.weight, 0),
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const isReady = mapsLoaded && !loading;

  return (
    <div className="relative -m-4 lg:-m-6 h-[calc(100vh-64px)] overflow-hidden">
      {/* Map container — ALWAYS rendered so ref is available for init */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading overlay */}
      {!isReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-30">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargando mapa operativo...</p>
          </motion.div>
        </div>
      )}

      {/* Error overlay */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-30">
          <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Filter panel overlay */}
      {isReady && (
        <MapFilterPanel
          filters={filters}
          onChange={setFilters}
          counts={counts}
        />
      )}

      {/* Legend mini */}
      {isReady && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 text-xs space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: colors.riderStatus.available }} />
            <span className="text-gray-600 dark:text-gray-400">Rider disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: colors.riderStatus.busy }} />
            <span className="text-gray-600 dark:text-gray-400">Rider ocupado</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-orange-500" />
            <span className="text-gray-600 dark:text-gray-400">Pedido activo</span>
          </div>
        </div>
      )}
    </div>
  );
}
