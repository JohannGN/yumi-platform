'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook that watches the rider's GPS position and sends it to the API
 * every 30 seconds while the rider is online.
 */
export function useRiderLocation(isOnline: boolean) {
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!isOnline) {
      // Clear watch when going offline
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      console.warn('Geolocation not available');
      return;
    }

    const sendLocation = async (lat: number, lng: number) => {
      const now = Date.now();
      // Throttle: minimum 25s between sends
      if (now - lastSentRef.current < 25000) return;
      lastSentRef.current = now;

      try {
        await fetch('/api/rider/location', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        });
      } catch (err) {
        console.error('Failed to send location:', err);
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('GPS error:', error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOnline]);
}
