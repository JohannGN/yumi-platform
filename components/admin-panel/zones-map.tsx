'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Pencil, Square, Info } from 'lucide-react';
import { AdminZone } from '@/types/admin-panel';
import { formatCurrency } from '@/config/tokens';

interface ZonesMapProps {
  zones: AdminZone[];
  selectedZoneId: string | null;
  onZoneSelect: (zone: AdminZone | null) => void;
  onPolygonComplete: (geojson: string) => void;
  cityCenter?: { lat: number; lng: number };
}

declare global {
  interface Window {
    google: typeof google;
    initYumiZonesMap: () => void;
  }
}

export default function ZonesMap({
  zones,
  selectedZoneId,
  onZoneSelect,
  onPolygonComplete,
  cityCenter = { lat: -5.7083, lng: -78.8089 },
}: ZonesMapProps) {
  const mapRef                = useRef<HTMLDivElement>(null);
  const mapInstanceRef        = useRef<google.maps.Map | null>(null);
  const drawingManagerRef     = useRef<google.maps.drawing.DrawingManager | null>(null);
  const polygonsRef           = useRef<Map<string, google.maps.Polygon>>(new Map());
  const pendingPolygonRef     = useRef<google.maps.Polygon | null>(null);
  const [mapLoaded, setMapLoaded]     = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);

  // ── Inicializar mapa ────────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;
    if (mapInstanceRef.current) return; // ya inicializado

    const map = new window.google.maps.Map(mapRef.current, {
      center: cityCenter,
      zoom: 14,
      mapTypeId: 'roadmap',
      styles: [
        { featureType: 'poi',     elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
      ],
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl:    false,
    });

    mapInstanceRef.current = map;

    const drawingManager = new window.google.maps.drawing.DrawingManager({
      drawingMode:    null,
      drawingControl: false,
      polygonOptions: {
        fillColor:   '#FF6B35',
        fillOpacity: 0.3,
        strokeWeight: 2,
        strokeColor: '#FF6B35',
        clickable:   false,
        editable:    true,
        zIndex:      1,
      },
    });

    drawingManager.setMap(map);
    drawingManagerRef.current = drawingManager;

    window.google.maps.event.addListener(
      drawingManager,
      'polygoncomplete',
      (polygon: google.maps.Polygon) => {
        drawingManager.setDrawingMode(null);
        setDrawingMode(false);

        if (pendingPolygonRef.current) pendingPolygonRef.current.setMap(null);
        pendingPolygonRef.current = polygon;

        const path   = polygon.getPath().getArray();
        const coords = path.map(p => [p.lng(), p.lat()]);
        if (coords.length > 0) coords.push(coords[0]);

        onPolygonComplete(JSON.stringify({ type: 'Polygon', coordinates: [coords] }));
      }
    );

    setMapLoaded(true);
  }, [cityCenter, onPolygonComplete]);

  // ── Cargar SDK ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) return;

    if (window.google?.maps?.drawing) { initMap(); return; }

    const scriptId = 'google-maps-zones';
    if (document.getElementById(scriptId)) {
      // Script ya insertado, esperar a que cargue
      const check = setInterval(() => {
        if (window.google?.maps?.drawing) { clearInterval(check); initMap(); }
      }, 150);
      return () => clearInterval(check);
    }

    window.initYumiZonesMap = initMap;
    const script = document.createElement('script');
    script.id   = scriptId;
    script.src  = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry&callback=initYumiZonesMap`;
    script.async = true;
    script.onerror = () => console.error('Error cargando Google Maps SDK');
    document.head.appendChild(script);
  }, [initMap]);

  // ── Renderizar polígonos reales desde la API ────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    // Limpiar polígonos anteriores
    polygonsRef.current.forEach(poly => poly.setMap(null));
    polygonsRef.current.clear();

    zones.forEach(zone => {
      if (!zone.is_active) return;

      // Fetch del GeoJSON real para esta zona
      fetch(`/api/admin/zones/${zone.id}`)
        .then(r => r.json())
        .then(data => {
          const geojson = data.zone?.geojson;
          if (!geojson || !mapInstanceRef.current) return;

          let parsed: { type: string; coordinates: number[][][] };
          try { parsed = JSON.parse(geojson); } catch { return; }
          if (parsed.type !== 'Polygon' || !parsed.coordinates?.[0]) return;

          // Convertir GeoJSON [lng, lat] → Google Maps {lat, lng}
          const paths = parsed.coordinates[0].map(([lng, lat]) => ({ lat, lng }));

          const isSelected = zone.id === selectedZoneId;
          const poly = new window.google.maps.Polygon({
            paths,
            map:           mapInstanceRef.current,
            fillColor:     zone.color,
            fillOpacity:   isSelected ? 0.4 : 0.25,
            strokeColor:   isSelected ? '#FF6B35' : zone.color,
            strokeWeight:  isSelected ? 3 : 2,
            strokeOpacity: 1,
            clickable:     true,
            zIndex:        isSelected ? 2 : 1,
          });

          poly.addListener('click', () => onZoneSelect(zone));

          polygonsRef.current.set(zone.id, poly);
        })
        .catch(() => {
          // Fallback: marcador simple si falla el fetch
          const marker = new window.google.maps.Marker({
            position: cityCenter,
            map:      mapInstanceRef.current!,
            label:    { text: zone.name.slice(0, 2).toUpperCase(), color: 'white', fontWeight: 'bold', fontSize: '12px' },
            icon:     { path: window.google.maps.SymbolPath.CIRCLE, scale: 20, fillColor: zone.color, fillOpacity: 0.9, strokeColor: 'white', strokeWeight: 2 },
          });
          marker.addListener('click', () => onZoneSelect(zone));
          polygonsRef.current.set(zone.id, marker as unknown as google.maps.Polygon);
        });
    });
  }, [zones, mapLoaded, cityCenter, onZoneSelect, selectedZoneId]);

  // ── Resaltar zona seleccionada ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded) return;
    polygonsRef.current.forEach((poly, id) => {
      const zone       = zones.find(z => z.id === id);
      const isSelected = id === selectedZoneId;
      try {
        (poly as google.maps.Polygon).setOptions({
          fillOpacity:  isSelected ? 0.4  : 0.25,
          strokeColor:  isSelected ? '#FF6B35' : (zone?.color ?? '#3B82F6'),
          strokeWeight: isSelected ? 3    : 2,
          zIndex:       isSelected ? 2    : 1,
        });
      } catch { /* marcador fallback — ignorar */ }
    });
  }, [selectedZoneId, zones, mapLoaded]);

  // ── Toggle modo dibujo ──────────────────────────────────────────────────────
  const toggleDrawingMode = () => {
    if (!drawingManagerRef.current) return;
    if (drawingMode) {
      drawingManagerRef.current.setDrawingMode(null);
      setDrawingMode(false);
    } else {
      if (pendingPolygonRef.current) { pendingPolygonRef.current.setMap(null); pendingPolygonRef.current = null; }
      drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
      setDrawingMode(true);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Map container — ocupa todo el espacio del padre */}
      <div ref={mapRef} className="absolute inset-0 rounded-xl overflow-hidden" />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl z-10">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Cargando mapa...</p>
          </div>
        </div>
      )}

      {/* Drawing controls */}
      {mapLoaded && (
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          <button
            onClick={toggleDrawingMode}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-all ${
              drawingMode
                ? 'bg-orange-500 text-white shadow-orange-200 dark:shadow-orange-900'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {drawingMode ? (
              <><Square className="w-4 h-4" />Dibujando… (clic para cancelar)</>
            ) : (
              <><Pencil className="w-4 h-4" />Dibujar zona</>
            )}
          </button>

          {drawingMode && (
            <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl text-xs text-blue-700 dark:text-blue-300 max-w-xs shadow">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Haz clic en el mapa para crear puntos. Haz clic en el primer punto para cerrar el polígono.</span>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {zones.filter(z => z.is_active).length > 0 && (
        <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-[200px] z-10">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Zonas activas</p>
          <div className="space-y-1.5">
            {zones.filter(z => z.is_active).map(zone => (
              <button
                key={zone.id}
                onClick={() => onZoneSelect(zone)}
                className="flex items-center gap-2 w-full text-left hover:opacity-75 transition"
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{zone.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
