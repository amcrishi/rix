'use client';

/**
 * RouteMap — Leaflet map showing GPS route polyline.
 * Loaded via dynamic import (client-side only).
 * live=true → auto-centers on latest coord.
 */

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Polyline, Marker, TileLayer as LTileLayer } from 'leaflet';

interface Coord { lat: number; lng: number; ts: number; }

interface Props {
  coords: Coord[];
  live?: boolean;
}

export default function RouteMap({ coords, live = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<LeafletMap | null>(null);
  const polylineRef  = useRef<Polyline | null>(null);
  const markerRef    = useRef<Marker | null>(null);
  const tileRef      = useRef<LTileLayer | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    (async () => {
      const L = (await import('leaflet')).default;

      // Fix default icon path issue in webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const first = coords[0] || { lat: 13.0827, lng: 80.2707 }; // default: Chennai

      const map = L.map(containerRef.current!, {
        center: [first.lat, first.lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });

      tileRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19 }
      ).addTo(map);

      // Route polyline
      polylineRef.current = L.polyline(
        coords.map(c => [c.lat, c.lng]),
        { color: '#ffffff', weight: 4, opacity: 0.85, lineJoin: 'round' }
      ).addTo(map);

      // Start marker (green)
      if (coords.length > 0) {
        L.circleMarker([coords[0].lat, coords[0].lng], {
          radius: 7, color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1, weight: 2,
        }).addTo(map).bindTooltip('Start', { permanent: false });
      }

      // Current position marker
      if (coords.length > 0) {
        const last = coords[coords.length - 1];
        markerRef.current = L.marker([last.lat, last.lng]).addTo(map);
      }

      mapRef.current = map;
    })();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      polylineRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update polyline + marker when coords change (live mode)
  useEffect(() => {
    if (!mapRef.current || !polylineRef.current || coords.length === 0) return;

    const latlngs = coords.map(c => [c.lat, c.lng] as [number, number]);
    polylineRef.current.setLatLngs(latlngs);

    const last = coords[coords.length - 1];
    if (markerRef.current) {
      markerRef.current.setLatLng([last.lat, last.lng]);
    }

    if (live) {
      mapRef.current.panTo([last.lat, last.lng], { animate: true, duration: 0.5 });
    }
  }, [coords, live]);

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', minHeight: 200, borderRadius: 'inherit' }}
      />
    </>
  );
}
