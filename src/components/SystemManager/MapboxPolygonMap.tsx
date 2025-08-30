import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";

type LatLng = [number, number];

interface MapboxPolygonMapProps {
  center: LatLng;
  zoom: number;
  onMapClick?: (latlng: LatLng) => void;
  polygonPoints?: LatLng[];
  isDrawing?: boolean;
  isPolygonClosed?: boolean;
  className?: string;
}

export function MapboxPolygonMap({ 
  center, 
  zoom, 
  onMapClick, 
  polygonPoints = [], 
  isDrawing = false,
  isPolygonClosed = false,
  className = "h-full w-full" 
}: MapboxPolygonMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
          mapboxgl.accessToken = data.token;
        } else {
          throw new Error('No token received');
        }
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
        setError('Failed to load map. Please ensure Mapbox token is configured.');
      }
    };
    fetchToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12', // High-res satellite imagery
      center: [center[1], center[0]], // Mapbox uses [lng, lat]
      zoom: zoom,
      pitch: 0, // Top-down view for polygon drawing
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Handle map clicks for polygon drawing
    if (onMapClick) {
      map.current.on('click', (e) => {
        if (isDrawing) {
          const { lng, lat } = e.lngLat;
          onMapClick([lat, lng]);
        }
      });
    }

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, center, zoom, onMapClick, isDrawing]);

  // Update polygon visualization
  useEffect(() => {
    if (!map.current || polygonPoints.length === 0) return;

    // Remove existing sources and layers
    if (map.current.getSource('polygon')) {
      map.current.removeLayer('polygon-fill');
      map.current.removeLayer('polygon-stroke');
      map.current.removeSource('polygon');
    }
    if (map.current.getSource('polygon-line')) {
      map.current.removeLayer('polygon-line-stroke');
      map.current.removeSource('polygon-line');
    }
    if (map.current.getSource('vertices')) {
      map.current.removeLayer('vertices');
      map.current.removeSource('vertices');
    }

    // Convert points to GeoJSON format (Mapbox uses [lng, lat])
    const coordinates = polygonPoints.map(point => [point[1], point[0]]);
    
    // Add vertex markers
    map.current.addSource('vertices', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: polygonPoints.map((point, index) => ({
          type: 'Feature',
          properties: { index },
          geometry: {
            type: 'Point',
            coordinates: [point[1], point[0]]
          }
        }))
      }
    });

    map.current.addLayer({
      id: 'vertices',
      type: 'circle',
      source: 'vertices',
      paint: {
        'circle-radius': 6,
        'circle-color': '#3b82f6',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    if (isPolygonClosed && coordinates.length >= 3) {
      // Closed polygon - show filled area
      const closedCoordinates = [...coordinates, coordinates[0]]; // Close the polygon
      
      map.current.addSource('polygon', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [closedCoordinates]
          }
        }
      });

      map.current.addLayer({
        id: 'polygon-fill',
        type: 'fill',
        source: 'polygon',
        layout: {},
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.3
        }
      });

      map.current.addLayer({
        id: 'polygon-stroke',
        type: 'line',
        source: 'polygon',
        layout: {},
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3
        }
      });
    } else if (coordinates.length >= 2) {
      // Drawing mode - show line
      map.current.addSource('polygon-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      });

      map.current.addLayer({
        id: 'polygon-line-stroke',
        type: 'line',
        source: 'polygon-line',
        layout: {},
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3,
          'line-dasharray': [2, 2] // Dashed line for drawing mode
        }
      });
    }

  }, [polygonPoints, isPolygonClosed]);

  // Fit map to polygon bounds when polygon is completed
  useEffect(() => {
    if (!map.current || !isPolygonClosed || polygonPoints.length < 3) return;

    const coordinates = polygonPoints.map(point => [point[1], point[0]]);
    const bounds = coordinates.reduce((bounds, coord) => {
      return bounds.extend(coord as [number, number]);
    }, new mapboxgl.LngLatBounds());

    map.current.fitBounds(bounds, { 
      padding: 50,
      duration: 1000
    });
  }, [isPolygonClosed, polygonPoints]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300`}>
        <div className="text-center p-4">
          <div className="text-red-500 mb-2">⚠️ Map Error</div>
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Loading satellite map...</div>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className={className} />;
}