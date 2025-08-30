// Geospatial + ML Enhancement Pack - Core Types

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoPolygon {
  coordinates: GeoPoint[];
  holes?: GeoPoint[][];
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface PolyFeatures {
  geometric: {
    area_sqm: number;
    perimeter_m: number;
    centroid: GeoPoint;
    bounds: GeoBounds;
    compactness: number;
    aspect_ratio: number;
  };
  solar?: {
    tilt_degrees: number;
    azimuth_degrees: number;
    shade_index: number;
    annual_irradiance_kwh_m2: number;
    panel_capacity_estimate: number;
  };
  context?: {
    postcode?: string;
    state?: string;
    network?: string;
    meter_type?: string;
    roof_type?: string;
    building_age?: number;
  };
  time_series?: {
    hourly_shade_factors: number[];
    seasonal_adjustments: number[];
  };
}

export interface PolyMatch {
  target_id: string;
  score: number;
  confidence: number;
  features: PolyFeatures;
  meta: Record<string, any>;
}

export interface VectorEmbedding {
  dimensions: number;
  values: number[];
  format: 'f32' | 'f16' | 'int8';
}

export interface MatchCandidate {
  id: string;
  kind: string;
  embedding: VectorEmbedding;
  meta: Record<string, any>;
  score?: number;
}

export interface MatchResult {
  source_id: string;
  matches: MatchCandidate[];
  strategy: string;
  timestamp: string;
  total_candidates: number;
}

export interface MLVectorRecord {
  id: string;
  kind: string;
  dim: number;
  embedding_format: string;
  embedding: Uint8Array;
  meta: Record<string, any>;
  created_at: string;
}

export interface MLMatchRecord {
  id: string;
  source_id: string;
  target_id: string;
  score: number;
  kind: string;
  meta: Record<string, any>;
  created_at: string;
}