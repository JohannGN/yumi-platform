'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin,
  RefreshCw,
  Loader2,
  Bike,
  Car,
  Phone,
  Package,
  Star,
} from 'lucide-react';
import { useAgent } from '@/components/agent-panel/agent-context';
import { colors } from '@/config/design-tokens';
import { orderStatusLabels, vehicleTypeLabels } from '@/config/design-tokens';
import type { AgentRider } from '@/types/agent-panel';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

function getStatusColor(rider: AgentRider): string {
  if (!rider.is_online) return colors.riderStatus.offline;
  if (!rider.is_available) return colors.riderStatus.busy;
  return colors.riderStatus.available;
}

function getStatusLabel(rider: AgentRider): string {
  if (!rider.is_online) return 'Offline';
  if (!rider.is_available) return 'Ocupado';
  return 'Disponible';
}

export function AgentRiderMap() {
  const { activeCityId } = useAgent();
  const [riders, setRiders] = useState<AgentRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<AgentRider | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const fetchRiders = useCallback(async () => {
    if (!activeCityId) return;
    try {
      const res = await fetch(`/api/agent/riders?city_id=${activeCityId}`);
      if (res.ok) {
        const data: AgentRider[] = await res.json();
        setRiders(data);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [activeCityId]);

  // Initial + polling 30s
  useEffect(() => {
    setLoading(true);
    fetchRiders();
    const interval = setInterval(fetchRiders, 30000);
    return () => clearInterval(interval);
  }, [fetchRiders]);

  // Initialize Google Maps (only once globally)
  useEffect(() => {
    if (!mapRef.current || !GOOGLE_MAPS_KEY) return;
    if (mapInstanceRef.current) return;

    function initMap() {
      if (!mapRef.current || mapInstanceRef.current) return;
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: -5.7083, lng: -78.8089 }, // Jaén default
        zoom: 14,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    }

    // If Google Maps is already loaded (e.g. another component or hot reload), use it
    if (window.google?.maps) {
      initMap();
      return;
    }

    // Check if script tag already exists but hasn't finished loading
    const existingScript = document.querySelector(
      `script[src^="https://maps.googleapis.com/maps/api/js"]`
    );

    if (existingScript) {
      // Script exists but might still be loading — wait for it
      existingScript.addEventListener('load', initMap);
      return () => existingScript.removeEventListener('load', initMap);
    }

    // No script yet — inject it (only once)
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);
    // Don't remove on cleanup — other components may need it
  }, []);

  // Update markers when riders change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const ridersWithLocation = riders.filter((r) => r.current_lat && r.current_lng);

    ridersWithLocation.forEach((rider) => {
      const color = getStatusColor(rider);
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="${color}"/>
          <circle cx="16" cy="16" r="8" fill="white"/>
          <text x="16" y="20" text-anchor="middle" fill="${color}" font-size="12" font-weight="bold">🏍️</text>
        </svg>`;

      const marker = new google.maps.Marker({
        position: { lat: rider.current_lat!, lng: rider.current_lng! },
        map: mapInstanceRef.current!,
        title: rider.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new google.maps.Size(32, 40),
          anchor: new google.maps.Point(16, 40),
        },
      });

      marker.addListener('click', () => {
        setSelectedRider(rider);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if riders exist
    if (ridersWithLocation.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      ridersWithLocation.forEach((r) => {
        bounds.extend({ lat: r.current_lat!, lng: r.current_lng! });
      });
      mapInstanceRef.current.fitBounds(bounds, 60);
      if (ridersWithLocation.length === 1) {
        mapInstanceRef.current.setZoom(15);
      }
    }
  }, [riders]);

  const onlineCount = riders.filter((r) => r.is_online).length;
  const availableCount = riders.filter((r) => r.is_online && r.is_available).length;
  const busyCount = riders.filter((r) => r.is_online && !r.is_available).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {availableCount} disponible{availableCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            {busyCount} ocupado{busyCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            {riders.length - onlineCount} offline
          </span>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => { setLoading(true); fetchRiders(); }}
            disabled={loading}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div ref={mapRef} className="w-full h-[400px] bg-gray-100 dark:bg-gray-800" />
        {!GOOGLE_MAPS_KEY && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <p className="text-sm text-gray-400">Google Maps API key no configurada</p>
          </div>
        )}
      </div>

      {/* Rider list */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Lista de riders ({riders.length})
        </h3>
        {riders.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            No hay riders registrados en esta ciudad
          </div>
        ) : (
          <div className="grid gap-2">
            {riders.map((rider) => (
              <div
                key={rider.id}
                onClick={() => setSelectedRider(selectedRider?.id === rider.id ? null : rider)}
                className={[
                  'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                  selectedRider?.id === rider.id
                    ? 'border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                ].join(' ')}
              >
                {/* Status dot */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getStatusColor(rider) }}
                />

                {/* Name + info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{rider.name}</span>
                    <span className="text-[10px] text-gray-400">
                      {vehicleTypeLabels[rider.vehicle_type] ?? rider.vehicle_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${getStatusColor(rider)}20`,
                        color: getStatusColor(rider),
                      }}
                    >
                      {getStatusLabel(rider)}
                    </span>
                    {rider.current_order_code && (
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                        <Package className="w-2.5 h-2.5 inline mr-0.5" />
                        {rider.current_order_code}
                        {rider.current_order_status && (
                          <span className="text-gray-400 ml-1">
                            ({orderStatusLabels[rider.current_order_status] ?? rider.current_order_status})
                          </span>
                        )}
                      </span>
                    )}
                    {rider.avg_rating > 0 && (
                      <span className="text-[10px] text-yellow-600 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" />
                        {rider.avg_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Phone */}
                {rider.phone && (
                  <a
                    href={`https://wa.me/${rider.phone.replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex-shrink-0"
                    title="WhatsApp"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
