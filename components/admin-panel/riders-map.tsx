'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { googleMapsConfig, formatDate } from '@/config/tokens';
import type { AdminRider } from '@/types/admin-panel';

declare global {
  interface Window {
    google: typeof google;
    initRidersMap?: () => void;
  }
}

interface RidersMapProps {
  riders: AdminRider[];
  onRefresh: () => void;
  loading: boolean;
}

const RIDER_STATUS_COLORS: Record<string, string> = {
  available: '#22C55E',
  busy:      '#F59E0B',
  offline:   '#9CA3AF',
};

function getRiderStatus(rider: AdminRider): 'available' | 'busy' | 'offline' {
  if (!rider.is_online) return 'offline';
  if (!rider.is_available || rider.current_order_id) return 'busy';
  return 'available';
}

function createMarkerIcon(color: string): google.maps.Symbol {
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 12,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 2.5,
  };
}

export function RidersMap({ riders, onRefresh, loading }: RidersMapProps) {
  const mapRef       = useRef<HTMLDivElement>(null);
  const mapInstance  = useRef<google.maps.Map | null>(null);
  const markers      = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindow   = useRef<google.maps.InfoWindow | null>(null);
  const [mapsReady, setMapsReady] = useState(false);

  // ── Inicializar mapa (separado de la carga del SDK) ────────────────────────
  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstance.current) return;
    if (!window.google?.maps) return;

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center:           googleMapsConfig.defaultCenter,
      zoom:             googleMapsConfig.defaultZoom,
      styles: [
        { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
      disableDefaultUI:    false,
      zoomControl:         true,
      mapTypeControl:      false,
      streetViewControl:   false,
      fullscreenControl:   true,
    });

    infoWindow.current = new window.google.maps.InfoWindow();
  }, []);

  // ── Cargar SDK (o reusar el ya cargado por zones-map) ─────────────────────
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) return;

    // SDK ya disponible (cargado por zones-map u otro componente)
    if (window.google?.maps) {
      setMapsReady(true);
      return;
    }

    // Script ya insertado en DOM, esperar callback
    const existingScript =
      document.getElementById('google-maps-zones') ||
      document.getElementById('google-maps-riders');

    if (existingScript) {
      const check = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(check);
          setMapsReady(true);
        }
      }, 150);
      return () => clearInterval(check);
    }

    // Primera carga: insertar script
    window.initRidersMap = () => setMapsReady(true);
    const script   = document.createElement('script');
    script.id      = 'google-maps-riders';
    script.src     = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry&callback=initRidersMap`;
    script.async   = true;
    script.onerror = () => console.error('Error cargando Google Maps SDK');
    document.head.appendChild(script);

    return () => { delete window.initRidersMap; };
  }, []);

  // ── Inicializar mapa cuando SDK esté listo y ref disponible ───────────────
  useEffect(() => {
    if (!mapsReady) return;
    // Pequeño delay para asegurar que mapRef.current esté montado
    const timer = setTimeout(initMap, 50);
    return () => clearTimeout(timer);
  }, [mapsReady, initMap]);

  // ── Actualizar markers cuando cambian riders ───────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !mapsReady) return;

    const ridersWithLocation = riders.filter((r) => r.current_lat && r.current_lng);
    const currentIds = new Set(ridersWithLocation.map((r) => r.id));

    // Eliminar markers de riders que ya no están o no tienen ubicación
    markers.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markers.current.delete(id);
      }
    });

    // Actualizar o crear markers
    ridersWithLocation.forEach((rider) => {
      const position = { lat: rider.current_lat!, lng: rider.current_lng! };
      const status   = getRiderStatus(rider);
      const color    = RIDER_STATUS_COLORS[status];

      const existing = markers.current.get(rider.id);

      if (existing) {
        existing.setPosition(position);
        existing.setIcon(createMarkerIcon(color));
      } else {
        const marker = new window.google.maps.Marker({
          position,
          map:   mapInstance.current!,
          icon:  createMarkerIcon(color),
          title: rider.name,
        });

        marker.addListener('click', () => {
          const lastUpdate = rider.last_location_update
            ? formatDate(rider.last_location_update)
            : 'Desconocido';

          infoWindow.current?.setContent(`
            <div style="font-family:sans-serif;padding:8px;min-width:180px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
                <strong style="font-size:14px">${rider.name}</strong>
              </div>
              <p style="margin:0;font-size:12px;color:#6B7280">🏍️ ${rider.vehicle_type}${rider.vehicle_plate ? ` · ${rider.vehicle_plate}` : ''}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#6B7280">
                ${rider.current_order_id ? `📦 Pedido: ${rider.current_order_code ?? '—'}` : '✅ Disponible'}
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#9CA3AF">GPS: ${lastUpdate}</p>
            </div>
          `);
          infoWindow.current?.open(mapInstance.current!, marker);
        });

        markers.current.set(rider.id, marker);
      }
    });
  }, [riders, mapsReady]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
      {/* Map container — ocupa todo el espacio */}
      <div ref={mapRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {!mapsReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargando mapa…</p>
          </div>
        </div>
      )}

      {/* Leyenda + refresh */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-900 shadow border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-2.5 space-y-1.5">
          {Object.entries(RIDER_STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {status === 'available' ? 'Disponible' : status === 'busy' ? 'Con pedido' : 'Offline'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sin riders online */}
      {mapsReady && riders.filter((r) => r.is_online).length === 0 && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center z-10">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg px-4 py-2.5 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              🏍️ Sin riders online en este momento
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
