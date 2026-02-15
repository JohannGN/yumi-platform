'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, ArrowRight, ArrowLeft, Loader2,
  AlertTriangle, Navigation, FileText, Search,
  Clock, X, ChevronDown, Plus, Minus,
} from 'lucide-react';
import type { DeliveryAddress, DeliveryFeeResponse } from '@/types/checkout';
import { formatCurrency } from '@/config/tokens';

const DEFAULT_CENTER = { lat: -5.7083, lng: -78.8089 }; // Jaén
const DEFAULT_ZOOM = 15;
const LOCATED_ZOOM = 17;
const STORAGE_KEY = 'yumi_saved_addresses';
const MAX_SAVED_ADDRESSES = 5;

// ============================================================
// Clean map styles — hide ALL POIs, transit, business names
// ============================================================
const CLEAN_MAP_STYLES: google.maps.MapTypeStyle[] = [
  // Hide all POI icons and labels
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  // Hide transit
  { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
  // Hide business names on roads
  {
    featureType: 'poi.business',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  // Keep road names visible
  {
    featureType: 'road',
    elementType: 'labels.text',
    stylers: [{ visibility: 'on' }],
  },
  // Keep neighborhood/locality names
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels',
    stylers: [{ visibility: 'on' }],
  },
];

// ============================================================
// Saved addresses helpers
// ============================================================
interface SavedAddress {
  id: string;
  address: string;
  lat: number;
  lng: number;
  reference: string;
  label: string;
  lastUsed: number;
}

function getSavedAddresses(): SavedAddress[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAddress(addr: Omit<SavedAddress, 'id'>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedAddresses();
    // Update if same coords (~50m), otherwise add new
    const idx = existing.findIndex(
      (a) => Math.abs(a.lat - addr.lat) < 0.0005 && Math.abs(a.lng - addr.lng) < 0.0005,
    );
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...addr, lastUsed: Date.now() };
    } else {
      existing.unshift({ ...addr, id: crypto.randomUUID(), lastUsed: Date.now() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, MAX_SAVED_ADDRESSES)));
  } catch { /* ignore */ }
}

function deleteSavedAddress(id: string): SavedAddress[] {
  if (typeof window === 'undefined') return [];
  try {
    const updated = getSavedAddresses().filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

// ============================================================
// Restaurant marker icon (small, subtle)
// ============================================================
const RESTAURANT_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="#1B2A4A" stroke="white" stroke-width="2"/>
  <text x="16" y="21" text-anchor="middle" font-size="14">🍽️</text>
</svg>
`;

// ============================================================
// Custom pin icon (orange YUMI pin)
// ============================================================
const PIN_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <path d="M20 0C9 0 0 9 0 20c0 15 20 28 20 28s20-13 20-28C40 9 31 0 20 0z" fill="#FF6B35" filter="url(#shadow)"/>
  <circle cx="20" cy="18" r="8" fill="white"/>
</svg>
`;

// ============================================================
// Component
// ============================================================
interface StepDeliveryAddressProps {
  value: DeliveryAddress;
  onChange: (address: DeliveryAddress) => void;
  onDeliveryFeeChange: (fee: DeliveryFeeResponse | null) => void;
  deliveryFee: DeliveryFeeResponse | null;
  restaurantId: string;
  restaurantLat?: number;
  restaurantLng?: number;
  restaurantName?: string;
  onNext: () => void;
  onBack: () => void;
}

export function StepDeliveryAddress({
  value,
  onChange,
  onDeliveryFeeChange,
  deliveryFee,
  restaurantId,
  restaurantLat,
  restaurantLng,
  restaurantName,
  onNext,
  onBack,
}: StepDeliveryAddressProps) {
  const [address, setAddress] = useState(value.address);
  const [reference, setReference] = useState(value.reference);
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(
    value.lat && value.lng ? { lat: value.lat, lng: value.lng } : null,
  );
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const restaurantMarkerRef = useRef<google.maps.Marker | null>(null);
  const pulseOverlayRef = useRef<google.maps.OverlayView | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const feeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoLocated = useRef(false);

  const hasPin = markerPos !== null;
  const isAddressValid = address.trim().length >= 3;
  const isCovered = deliveryFee?.is_covered ?? false;
  const canContinue = hasPin && isAddressValid && isCovered;

  // Load saved addresses on mount
  useEffect(() => {
    const saved = getSavedAddresses();
    setSavedAddresses(saved);

    // Pre-load most recent address if no value provided
    if (!value.lat && !value.lng && saved.length > 0) {
      const most = saved[0];
      setAddress(most.address);
      setReference(most.reference);
      setMarkerPos({ lat: most.lat, lng: most.lng });
      setSearchInput(most.address);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // Load Google Maps Script
  // ============================================================
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) return;
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setLocationError('Error cargando Google Maps');
    document.head.appendChild(script);
  }, []);

  // ============================================================
  // Reverse geocode — fills address from pin coords
  // ============================================================
  const reverseGeocode = useCallback((pos: { lat: number; lng: number }) => {
    if (!window.google?.maps) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: pos }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const formatted = results[0].formatted_address
          .replace(/, Peru$/i, '')
          .replace(/, Perú$/i, '');
        setAddress(formatted);
        setSearchInput(formatted);
      }
    });
  }, []);

  // ============================================================
  // Pulse overlay (ripple on pin)
  // ============================================================
  const createPulseOverlay = useCallback((pos: { lat: number; lng: number }) => {
    if (!googleMapRef.current || !window.google?.maps) return;
    if (pulseOverlayRef.current) {
      pulseOverlayRef.current.setMap(null);
    }

    class PulseOverlay extends google.maps.OverlayView {
      private position: google.maps.LatLng;
      private div: HTMLDivElement | null = null;

      constructor(position: google.maps.LatLng) {
        super();
        this.position = position;
      }

      onAdd() {
        this.div = document.createElement('div');
        this.div.style.position = 'absolute';
        this.div.style.width = '80px';
        this.div.style.height = '80px';
        this.div.style.pointerEvents = 'none';
        this.div.innerHTML = `
          <div style="position:relative;width:100%;height:100%">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:#FF6B35;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(255,107,53,0.4);z-index:3;"></div>
            <div class="yumi-pulse-ring yumi-pulse-ring-1" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;border:2px solid #FF6B35;border-radius:50%;opacity:0;z-index:2;"></div>
            <div class="yumi-pulse-ring yumi-pulse-ring-2" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;border:2px solid #FF6B35;border-radius:50%;opacity:0;z-index:1;"></div>
          </div>
        `;
        this.getPanes()?.overlayMouseTarget.appendChild(this.div);
      }

      draw() {
        if (!this.div) return;
        const proj = this.getProjection();
        if (!proj) return;
        const point = proj.fromLatLngToDivPixel(this.position);
        if (point) {
          this.div.style.left = `${point.x - 40}px`;
          this.div.style.top = `${point.y - 40}px`;
        }
      }

      onRemove() {
        this.div?.parentNode?.removeChild(this.div);
        this.div = null;
      }
    }

    const overlay = new PulseOverlay(new google.maps.LatLng(pos.lat, pos.lng));
    overlay.setMap(googleMapRef.current);
    pulseOverlayRef.current = overlay;
  }, []);

  // ============================================================
  // Place / move marker (draggable)
  // ============================================================
  const placeMarker = useCallback(
    (pos: { lat: number; lng: number }, autoFillAddress = true) => {
      setMarkerPos(pos);

      if (markerRef.current) {
        markerRef.current.setPosition(pos);
      } else if (googleMapRef.current) {
        markerRef.current = new google.maps.Marker({
          position: pos,
          map: googleMapRef.current,
          draggable: true,
          animation: google.maps.Animation.DROP,
          icon: {
            url: 'data:image/svg+xml,' + encodeURIComponent(PIN_ICON_SVG),
            scaledSize: new google.maps.Size(40, 48),
            anchor: new google.maps.Point(20, 48),
          },
          zIndex: 10,
        });

        markerRef.current.addListener('dragend', () => {
          const newPos = markerRef.current?.getPosition();
          if (newPos) {
            const coords = { lat: newPos.lat(), lng: newPos.lng() };
            setMarkerPos(coords);
            reverseGeocode(coords);
            createPulseOverlay(coords);
            scheduleFeeCalc(coords);
          }
        });
      }

      createPulseOverlay(pos);
      if (autoFillAddress) reverseGeocode(pos);
      scheduleFeeCalc(pos);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [restaurantId, reverseGeocode, createPulseOverlay],
  );

  // ============================================================
  // Restaurant marker (subtle, non-draggable)
  // ============================================================
  const placeRestaurantMarker = useCallback(() => {
    if (!googleMapRef.current || !restaurantLat || !restaurantLng) return;
    if (restaurantMarkerRef.current) return; // Already placed

    restaurantMarkerRef.current = new google.maps.Marker({
      position: { lat: restaurantLat, lng: restaurantLng },
      map: googleMapRef.current,
      draggable: false,
      icon: {
        url: 'data:image/svg+xml,' + encodeURIComponent(RESTAURANT_ICON_SVG),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16),
      },
      title: restaurantName || 'Restaurante',
      zIndex: 5,
    });
  }, [restaurantLat, restaurantLng, restaurantName]);

  // ============================================================
  // Delivery fee (debounced)
  // ============================================================
  const scheduleFeeCalc = (pos: { lat: number; lng: number }) => {
    if (feeTimeoutRef.current) clearTimeout(feeTimeoutRef.current);
    feeTimeoutRef.current = setTimeout(() => fetchDeliveryFee(pos), 500);
  };

  const fetchDeliveryFee = async (pos: { lat: number; lng: number }) => {
    setIsLoadingFee(true);
    onDeliveryFeeChange(null);
    try {
      const res = await fetch(
        `/api/delivery-fee?lat=${pos.lat}&lng=${pos.lng}&restaurant_id=${restaurantId}`,
      );
      if (res.ok) {
        const data: DeliveryFeeResponse = await res.json();
        onDeliveryFeeChange(data);
      }
    } catch {
      onDeliveryFeeChange({ fee_cents: 0, zone_name: null, zone_id: null, is_covered: false });
    } finally {
      setIsLoadingFee(false);
    }
  };

  // ============================================================
  // Custom zoom handlers
  // ============================================================
  const handleZoomIn = () => {
    const map = googleMapRef.current;
    if (map) map.setZoom((map.getZoom() || DEFAULT_ZOOM) + 1);
  };

  const handleZoomOut = () => {
    const map = googleMapRef.current;
    if (map) map.setZoom((map.getZoom() || DEFAULT_ZOOM) - 1);
  };

  // ============================================================
  // Init map + auto GPS + restaurant marker
  // ============================================================
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || googleMapRef.current) return;

    const initialPos = markerPos || DEFAULT_CENTER;

    const map = new google.maps.Map(mapRef.current, {
      center: initialPos,
      zoom: markerPos ? LOCATED_ZOOM : DEFAULT_ZOOM,
      // Disable ALL default UI — we use our own buttons
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      styles: CLEAN_MAP_STYLES,
    });

    googleMapRef.current = map;

    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      placeMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });

    // Place restaurant marker
    placeRestaurantMarker();

    // Restore customer marker if coming back
    if (markerPos) {
      placeMarker(markerPos, !address);
      if (address) scheduleFeeCalc(markerPos);
    }

    // Auto-detect GPS only if no saved address was loaded
    if (!hasAutoLocated.current && !markerPos && navigator.geolocation) {
      hasAutoLocated.current = true;
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
          placeMarker(pos);
          map.panTo(pos);
          map.setZoom(LOCATED_ZOOM);
          setIsLocating(false);
        },
        () => setIsLocating(false),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]);

  // ============================================================
  // Places Autocomplete
  // ============================================================
  useEffect(() => {
    if (!mapLoaded || !searchInputRef.current || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
      componentRestrictions: { country: 'PE' },
      fields: ['geometry', 'formatted_address', 'name'],
      types: ['address'],
    });

    autocomplete.setBounds(
      new google.maps.LatLngBounds(
        { lat: -5.76, lng: -78.85 },
        { lat: -5.67, lng: -78.77 },
      ),
    );

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      const pos = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      const formatted = (place.formatted_address || place.name || '')
        .replace(/, Peru$/i, '')
        .replace(/, Perú$/i, '');

      setAddress(formatted);
      setSearchInput(formatted);
      setShowSavedAddresses(false);
      placeMarker(pos, false);
      googleMapRef.current?.panTo(pos);
      googleMapRef.current?.setZoom(LOCATED_ZOOM);
    });

    autocompleteRef.current = autocomplete;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]);

  // ============================================================
  // Inject ripple CSS
  // ============================================================
  useEffect(() => {
    if (document.getElementById('yumi-pulse-styles')) return;
    const style = document.createElement('style');
    style.id = 'yumi-pulse-styles';
    style.textContent = `
      @keyframes yumiPulseRipple {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        100% { transform: translate(-50%, -50%) scale(4.5); opacity: 0; }
      }
      .yumi-pulse-ring-1 { animation: yumiPulseRipple 1.8s ease-out infinite; }
      .yumi-pulse-ring-2 { animation: yumiPulseRipple 1.8s ease-out infinite 0.6s; }
    `;
    document.head.appendChild(style);
  }, []);

  // ============================================================
  // Saved address handlers
  // ============================================================
  const handleSelectSavedAddress = (saved: SavedAddress) => {
    setAddress(saved.address);
    setSearchInput(saved.address);
    setReference(saved.reference);
    setShowSavedAddresses(false);
    const pos = { lat: saved.lat, lng: saved.lng };
    setMarkerPos(pos);
    if (googleMapRef.current) {
      placeMarker(pos, false);
      googleMapRef.current.panTo(pos);
      googleMapRef.current.setZoom(LOCATED_ZOOM);
    }
  };

  const handleDeleteSavedAddress = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedAddresses(deleteSavedAddress(id));
  };

  // ============================================================
  // Manual GPS
  // ============================================================
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización');
      return;
    }
    setIsLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        placeMarker(pos);
        googleMapRef.current?.panTo(pos);
        googleMapRef.current?.setZoom(LOCATED_ZOOM);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setLocationError(
          err.code === 1
            ? 'Permite acceso a tu ubicación en el navegador'
            : 'No pudimos obtener tu ubicación',
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // ============================================================
  // Submit — saves address, PIN coordinates are the source of truth
  // ============================================================
  const handleSubmit = () => {
    if (!canContinue || !markerPos) return;

    saveAddress({
      address: address.trim(),
      lat: markerPos.lat,
      lng: markerPos.lng,
      reference: reference.trim(),
      label: savedAddresses.length === 0 ? 'Casa' : 'Otra dirección',
      lastUsed: Date.now(),
    });

    // PIN coordinates are THE source of truth — always sent to backend
    onChange({
      address: address.trim(),
      lat: markerPos.lat,
      lng: markerPos.lng,
      reference: reference.trim(),
    });
    onNext();
  };

  // ============================================================
  // Custom control button style
  // ============================================================
  const controlBtnClass =
    'flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all text-gray-600 dark:text-gray-300';

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="text-center">
        <div className="w-14 h-14 bg-[#FF6B35]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <MapPin className="w-7 h-7 text-[#FF6B35]" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          ¿Dónde lo entregamos?
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Busca tu dirección o usa tu ubicación actual
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 z-10" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onFocus={() => savedAddresses.length > 0 && setShowSavedAddresses(true)}
          placeholder="Buscar dirección..."
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35] transition-all text-sm shadow-sm"
        />
        {savedAddresses.length > 0 && (
          <button
            onClick={() => setShowSavedAddresses(!showSavedAddresses)}
            className="absolute right-3 top-3 p-0.5 text-gray-400 hover:text-[#FF6B35] transition-colors"
            title="Direcciones guardadas"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showSavedAddresses ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Saved addresses dropdown */}
      <AnimatePresence>
        {showSavedAddresses && savedAddresses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg divide-y divide-gray-100 dark:divide-gray-700">
              <div className="px-3 py-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Direcciones recientes
                </span>
              </div>
              {savedAddresses.map((saved) => (
                <button
                  key={saved.id}
                  onClick={() => handleSelectSavedAddress(saved)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-[#FF6B35]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {saved.address}
                    </p>
                    {saved.reference && (
                      <p className="text-xs text-gray-400 truncate">{saved.reference}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDeleteSavedAddress(e, saved.id)}
                    className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Eliminar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map with custom controls */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
        <div ref={mapRef} className="w-full h-[260px] bg-gray-100 dark:bg-gray-800" />

        {/* Custom zoom buttons — left side, vertical */}
        {mapLoaded && (
          <div className="absolute left-3 bottom-3 flex flex-col gap-1.5 z-10">
            <button onClick={handleZoomIn} className={controlBtnClass} aria-label="Acercar">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={handleZoomOut} className={controlBtnClass} aria-label="Alejar">
              <Minus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* GPS button — bottom right */}
        <button
          onClick={handleGetLocation}
          disabled={isLocating}
          className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 text-[#FF6B35] animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 text-[#FF6B35]" />
          )}
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {isLocating ? 'Buscando...' : 'Mi ubicación'}
          </span>
        </button>

        {/* Loading overlay */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 gap-2">
            <Loader2 className="w-6 h-6 text-[#FF6B35] animate-spin" />
            <span className="text-xs text-gray-500">Cargando mapa...</span>
          </div>
        )}

        {/* Locating overlay */}
        {mapLoaded && isLocating && !markerPos && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-[2px] gap-2">
            <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Detectando tu ubicación...
            </span>
          </div>
        )}
      </div>

      {/* Location error */}
      {locationError && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-amber-600 dark:text-amber-400 text-center">
          {locationError}
        </motion.p>
      )}

      {/* Hint */}
      {!hasPin && !isLocating && mapLoaded && (
        <p className="text-xs text-gray-400 text-center">
          Toca el mapa o busca arriba para marcar tu dirección
        </p>
      )}

      {/* Delivery fee */}
      {hasPin && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
            isLoadingFee
              ? 'bg-gray-50 dark:bg-gray-800 text-gray-500'
              : isCovered
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}
        >
          {isLoadingFee ? (
            <><Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /><span>Calculando delivery...</span></>
          ) : isCovered ? (
            <>
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>
                Delivery: <strong>{formatCurrency(deliveryFee?.fee_cents || 0)}</strong>
                {deliveryFee?.zone_name && <span className="text-xs opacity-75"> · Zona {deliveryFee.zone_name}</span>}
              </span>
            </>
          ) : (
            <><AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>No llegamos aquí todavía. Mueve el pin dentro de la zona.</span></>
          )}
        </motion.div>
      )}

      {/* Address (read-only from pin — just for visual reference) */}
      {hasPin && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Dirección detectada
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <div className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm min-h-[44px]">
              {address || <span className="text-gray-400">Mueve el pin para detectar</span>}
            </div>
          </div>
        </div>
      )}

      {/* Reference */}
      {hasPin && (
        <div>
          <label htmlFor="delivery-reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Referencia para el rider <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <textarea
              id="delivery-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej: Portón verde, 2do piso, frente al parque"
              rows={2}
              className="w-full pl-10 pr-4 py-3 rounded-xl resize-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35] transition-all text-sm"
            />
          </div>
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Atrás
        </button>
        <motion.button
          onClick={handleSubmit}
          disabled={!canContinue}
          className={`flex-1 py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 ${
            canContinue
              ? 'bg-[#FF6B35] hover:bg-[#E55A25] shadow-lg shadow-[#FF6B35]/25'
              : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
          }`}
          whileTap={canContinue ? { scale: 0.98 } : {}}
        >
          Continuar
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
