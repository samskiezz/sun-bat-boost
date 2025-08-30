// Polygon Feature Extraction

import type { GeoPolygon, PolyFeatures, GeoPoint } from '@/types/geo';
import { polyAreaSqm, polyCentroid, polyBounds } from './polygon-core';

export function featPolyGeometric(polygon: GeoPolygon): PolyFeatures['geometric'] {
  const area = polyAreaSqm(polygon);
  const centroid = polyCentroid(polygon);
  const bounds = polyBounds(polygon);
  
  // Calculate perimeter
  let perimeter = 0;
  const coords = polygon.coordinates;
  for (let i = 0; i < coords.length - 1; i++) {
    perimeter += haversineDistance(coords[i], coords[i + 1]);
  }
  
  // Compactness (isoperimetric quotient)
  const compactness = (4 * Math.PI * area) / (perimeter * perimeter);
  
  // Aspect ratio (width/height of bounding box)
  const width = haversineDistance(
    { lat: bounds.south, lng: bounds.west },
    { lat: bounds.south, lng: bounds.east }
  );
  const height = haversineDistance(
    { lat: bounds.south, lng: bounds.west },
    { lat: bounds.north, lng: bounds.west }
  );
  const aspect_ratio = width / height;
  
  return {
    area_sqm: area,
    perimeter_m: perimeter,
    centroid,
    bounds,
    compactness,
    aspect_ratio
  };
}

export function featPolySolar(
  polygon: GeoPolygon, 
  tilt: number = 30, 
  azimuth: number = 180, 
  shadeIdx: number = 0.1
): PolyFeatures['solar'] {
  const area = polyAreaSqm(polygon);
  const centroid = polyCentroid(polygon);
  
  // Estimate annual irradiance based on location (rough)
  const latitude = Math.abs(centroid.lat);
  const baseIrradiance = 1200 - (latitude * 5); // kWh/m²/year
  
  // Tilt and azimuth adjustments
  const tiltFactor = Math.cos(Math.abs(tilt - latitude) * Math.PI / 180);
  const azimuthFactor = Math.cos((azimuth - 180) * Math.PI / 180) * 0.1 + 0.9;
  
  const annual_irradiance_kwh_m2 = baseIrradiance * tiltFactor * azimuthFactor * (1 - shadeIdx);
  
  // Panel capacity estimate (assuming 400W panels, 2m² each, 80% coverage)
  const usableArea = area * 0.8;
  const panelCount = Math.floor(usableArea / 2);
  const panel_capacity_estimate = panelCount * 0.4; // kW
  
  return {
    tilt_degrees: tilt,
    azimuth_degrees: azimuth,
    shade_index: shadeIdx,
    annual_irradiance_kwh_m2,
    panel_capacity_estimate
  };
}

export function featPolyContext(context: Record<string, any>): PolyFeatures['context'] {
  return {
    postcode: context.postcode?.toString(),
    state: context.state,
    network: context.network,
    meter_type: context.meter_type,
    roof_type: context.roof_type || 'tile',
    building_age: context.building_age || 20
  };
}

export function featPolyTimeSeries(series: Record<string, any>): PolyFeatures['time_series'] {
  // Generate synthetic hourly shade factors if not provided
  const hourly_shade_factors = series.hourly_shade || Array.from({ length: 24 }, (_, i) => {
    // Higher shade in early morning and late evening
    const hour = i;
    if (hour < 6 || hour > 18) return 0.9;
    if (hour < 8 || hour > 16) return 0.3;
    return 0.1;
  });
  
  // Seasonal adjustments (summer = 1.0, winter = 0.7)
  const seasonal_adjustments = series.seasonal || [0.7, 0.8, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.7];
  
  return {
    hourly_shade_factors,
    seasonal_adjustments
  };
}

export function featPolySignature(polygon: GeoPolygon): string {
  // Create a stable hash of the polygon for caching
  const coords = polygon.coordinates;
  const normalized = coords.map(p => ({
    lat: Math.round(p.lat * 1000000) / 1000000,
    lng: Math.round(p.lng * 1000000) / 1000000
  }));
  
  const str = JSON.stringify(normalized);
  return simpleHash(str);
}

// Helper functions
function haversineDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}