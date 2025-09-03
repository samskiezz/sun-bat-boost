import React, { useEffect, useRef, useState } from 'react';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { GoogleMapsApiKeyInput } from '@/components/GoogleMapsApiKeyInput';

type LatLng = [number, number];

interface GooglePolygonMapProps {
  center: LatLng;
  zoom: number;
  onMapClick?: (latlng: LatLng) => void;
  polygonPoints?: LatLng[];
  isDrawing?: boolean;
  isPolygonClosed?: boolean;
  className?: string;
}

export function GooglePolygonMap({ 
  center, 
  zoom, 
  onMapClick, 
  polygonPoints = [], 
  isDrawing = false,
  isPolygonClosed = false,
  className = "h-full w-full" 
}: GooglePolygonMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const polygon = useRef<google.maps.Polygon | null>(null);
  const polyline = useRef<google.maps.Polyline | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  
  const [apiKey, setApiKey] = useState<string | null>(() => 
    localStorage.getItem('google_maps_api_key')
  );
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey);
  
  const { isLoaded, loadError } = useGoogleMapsLoader({ 
    apiKey: apiKey || '',
    libraries: ['places', 'geometry']
  });

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapContainer.current || !apiKey) return;

    map.current = new google.maps.Map(mapContainer.current, {
      center: { lat: center[0], lng: center[1] },
      zoom: Math.min(zoom, 21), // Google Maps satellite max zoom
      mapTypeId: google.maps.MapTypeId.SATELLITE,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      gestureHandling: 'auto',
      restriction: {
        latLngBounds: new google.maps.LatLngBounds(
          new google.maps.LatLng(-85, -180),
          new google.maps.LatLng(85, 180)
        ),
        strictBounds: false
      }
    });

    // Handle map clicks for polygon drawing
    if (onMapClick && isDrawing) {
      const clickListener = map.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          onMapClick([lat, lng]);
        }
      });

      return () => {
        google.maps.event.removeListener(clickListener);
      };
    }
  }, [isLoaded, apiKey, center, zoom, onMapClick, isDrawing]);

  // Update polygon visualization
  useEffect(() => {
    if (!map.current || !isLoaded || polygonPoints.length === 0) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];

    // Clear existing polygon/polyline
    if (polygon.current) {
      polygon.current.setMap(null);
      polygon.current = null;
    }
    if (polyline.current) {
      polyline.current.setMap(null);
      polyline.current = null;
    }

    // Add vertex markers
    polygonPoints.forEach((point, index) => {
      const marker = new google.maps.Marker({
        position: { lat: point[0], lng: point[1] },
        map: map.current,
        title: `Point ${index + 1}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      markers.current.push(marker);
    });

    if (isPolygonClosed && polygonPoints.length >= 3) {
      // Closed polygon - show filled area
      const path = polygonPoints.map(point => ({ lat: point[0], lng: point[1] }));
      
      polygon.current = new google.maps.Polygon({
        paths: path,
        strokeColor: '#3b82f6',
        strokeOpacity: 1,
        strokeWeight: 3,
        fillColor: '#3b82f6',
        fillOpacity: 0.3,
        map: map.current
      });
    } else if (polygonPoints.length >= 2) {
      // Drawing mode - show line
      const path = polygonPoints.map(point => ({ lat: point[0], lng: point[1] }));
      
      polyline.current = new google.maps.Polyline({
        path: path,
        strokeColor: '#3b82f6',
        strokeOpacity: 1,
        strokeWeight: 3,
        map: map.current
      });
    }
  }, [polygonPoints, isPolygonClosed, isLoaded]);

  // Fit map to polygon bounds when polygon is completed
  useEffect(() => {
    if (!map.current || !isLoaded || !isPolygonClosed || polygonPoints.length < 3) return;

    const bounds = new google.maps.LatLngBounds();
    polygonPoints.forEach(point => {
      bounds.extend(new google.maps.LatLng(point[0], point[1]));
    });

    map.current.fitBounds(bounds);
  }, [isPolygonClosed, polygonPoints, isLoaded]);

  const handleApiKeySubmit = (newApiKey: string) => {
    setApiKey(newApiKey);
    setShowApiKeyInput(false);
  };

  if (showApiKeyInput || !apiKey) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <GoogleMapsApiKeyInput onApiKeySubmit={handleApiKeySubmit} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted rounded-lg border-2 border-dashed border-muted-foreground/20`}>
        <div className="text-center p-6">
          <div className="text-destructive mb-2">⚠️ Google Maps Error</div>
          <div className="text-sm text-muted-foreground">{loadError}</div>
          <button 
            onClick={() => setShowApiKeyInput(true)}
            className="mt-2 text-primary underline text-sm"
          >
            Update API Key
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Loading Google Maps...</div>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className={className} />;
}