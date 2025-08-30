// Computer Vision - Satellite Processing

import type { GeoBounds, GeoPolygon } from '@/types/geo';
import { supabase } from '@/integrations/supabase/client';

export async function cvFetchSatTiles(
  bounds: GeoBounds, 
  zoom: number = 18
): Promise<{ tiles: string[]; cacheKey: string }> {
  try {
    // Create cache key from bounds and zoom
    const cacheKey = `sat_${bounds.north}_${bounds.south}_${bounds.east}_${bounds.west}_z${zoom}`;
    
    // Check tile cache first
    const { data: cached } = await supabase
      .from('tile_cache')
      .select('blob_ref, ttl')
      .eq('key', cacheKey)
      .single();
    
    if (cached && new Date(cached.ttl) > new Date()) {
      return {
        tiles: [cached.blob_ref],
        cacheKey
      };
    }
    
    // Fetch fresh tiles via Edge Function
    const { data, error } = await supabase.functions.invoke('tiles-sat', {
      body: {
        bounds,
        zoom,
        format: 'webp',
        size: 1024
      }
    });
    
    if (error) {
      console.error('Satellite tile fetch error:', error);
      return { tiles: [], cacheKey };
    }
    
    // Cache the result
    await supabase.from('tile_cache').upsert({
      key: cacheKey,
      blob_ref: data.tile_ref,
      ttl: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });
    
    return {
      tiles: [data.tile_ref],
      cacheKey
    };
  } catch (error) {
    console.error('Satellite tile fetch failed:', error);
    return { tiles: [], cacheKey: 'error' };
  }
}

export async function cvSegmentRoof(imageUrl: string): Promise<{
  segments: GeoPolygon[];
  confidence: number;
  processing_time_ms: number;
}> {
  // Deterministic roof segmentation for now
  const startTime = Date.now();
  
  try {
    // Create synthetic roof segments based on image hash
    const hash = simpleImageHash(imageUrl);
    const segments: GeoPolygon[] = [];
    
    // Generate 1-3 roof segments based on hash
    const segmentCount = (hash % 3) + 1;
    const baseLatLng = { lat: -33.8688, lng: 151.2093 }; // Sydney
    
    for (let i = 0; i < segmentCount; i++) {
      const offsetLat = ((hash >> (i * 4)) % 200 - 100) / 100000; // ±0.001 degrees
      const offsetLng = ((hash >> (i * 4 + 2)) % 200 - 100) / 100000;
      
      const size = 0.0002 + ((hash >> (i * 2)) % 100) / 1000000; // Variable roof size
      
      segments.push({
        coordinates: [
          { lat: baseLatLng.lat + offsetLat, lng: baseLatLng.lng + offsetLng },
          { lat: baseLatLng.lat + offsetLat + size, lng: baseLatLng.lng + offsetLng },
          { lat: baseLatLng.lat + offsetLat + size, lng: baseLatLng.lng + offsetLng + size },
          { lat: baseLatLng.lat + offsetLat, lng: baseLatLng.lng + offsetLng + size },
          { lat: baseLatLng.lat + offsetLat, lng: baseLatLng.lng + offsetLng }
        ]
      });
    }
    
    const confidence = 0.75 + ((hash % 100) / 400); // 0.75-1.0
    const processing_time_ms = Date.now() - startTime;
    
    return {
      segments,
      confidence,
      processing_time_ms
    };
  } catch (error) {
    console.error('Roof segmentation error:', error);
    return {
      segments: [],
      confidence: 0,
      processing_time_ms: Date.now() - startTime
    };
  }
}

export async function cvDetectObstacles(imageUrl: string): Promise<{
  obstacles: Array<{
    type: 'chimney' | 'tree' | 'vent' | 'antenna' | 'shadow';
    polygon: GeoPolygon;
    confidence: number;
  }>;
  processing_time_ms: number;
}> {
  const startTime = Date.now();
  
  try {
    // Generate synthetic obstacles based on image characteristics
    const hash = simpleImageHash(imageUrl);
    const obstacles: Array<{
      type: 'chimney' | 'tree' | 'vent' | 'antenna' | 'shadow';
      polygon: GeoPolygon;
      confidence: number;
    }> = [];
    
    const obstacleTypes: Array<'chimney' | 'tree' | 'vent' | 'antenna' | 'shadow'> = 
      ['chimney', 'tree', 'vent', 'antenna', 'shadow'];
    
    const obstacleCount = (hash % 4) + 1; // 1-4 obstacles
    const baseLatLng = { lat: -33.8688, lng: 151.2093 };
    
    for (let i = 0; i < obstacleCount; i++) {
      const typeIndex = (hash >> (i * 3)) % obstacleTypes.length;
      const type = obstacleTypes[typeIndex];
      
      const offsetLat = ((hash >> (i * 4)) % 200 - 100) / 100000;
      const offsetLng = ((hash >> (i * 4 + 2)) % 200 - 100) / 100000;
      
      // Different sizes for different obstacle types
      const sizeMultiplier = type === 'tree' ? 2 : type === 'shadow' ? 3 : 1;
      const size = (0.00005 + ((hash >> i) % 50) / 2000000) * sizeMultiplier;
      
      obstacles.push({
        type,
        polygon: {
          coordinates: [
            { lat: baseLatLng.lat + offsetLat, lng: baseLatLng.lng + offsetLng },
            { lat: baseLatLng.lat + offsetLat + size, lng: baseLatLng.lng + offsetLng },
            { lat: baseLatLng.lat + offsetLat + size, lng: baseLatLng.lng + offsetLng + size },
            { lat: baseLatLng.lat + offsetLat, lng: baseLatLng.lng + offsetLng + size },
            { lat: baseLatLng.lat + offsetLat, lng: baseLatLng.lng + offsetLng }
          ]
        },
        confidence: 0.6 + ((hash >> (i * 2)) % 40) / 100 // 0.6-1.0
      });
    }
    
    return {
      obstacles,
      processing_time_ms: Date.now() - startTime
    };
  } catch (error) {
    console.error('Obstacle detection error:', error);
    return {
      obstacles: [],
      processing_time_ms: Date.now() - startTime
    };
  }
}

export async function cvShadeMask(
  imageUrl: string, 
  sunAngle: { azimuth: number; elevation: number }
): Promise<{
  shade_mask: number[][]; // 2D array of shade factors (0-1)
  shade_index: number; // Overall shade percentage
  processing_time_ms: number;
}> {
  const startTime = Date.now();
  
  try {
    const hash = simpleImageHash(imageUrl);
    const gridSize = 20; // 20x20 grid
    const shade_mask: number[][] = [];
    
    // Generate synthetic shade mask based on sun angle and image hash
    for (let i = 0; i < gridSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < gridSize; j++) {
        // Base shade from sun elevation (lower sun = more shade)
        let shadeBase = Math.max(0, 1 - sunAngle.elevation / 90);
        
        // Add variation based on hash and position
        const positionHash = (hash + i * 7 + j * 13) % 1000;
        const variation = (positionHash / 1000 - 0.5) * 0.3; // ±15% variation
        
        // Azimuth effect (shadows cast in opposite direction)
        const azimuthEffect = Math.sin((sunAngle.azimuth + i * 18 + j * 12) * Math.PI / 180) * 0.2;
        
        const shadeFactor = Math.max(0, Math.min(1, shadeBase + variation + azimuthEffect));
        row.push(shadeFactor);
      }
      shade_mask.push(row);
    }
    
    // Calculate overall shade index
    const totalShade = shade_mask.flat().reduce((sum, val) => sum + val, 0);
    const shade_index = totalShade / (gridSize * gridSize);
    
    return {
      shade_mask,
      shade_index,
      processing_time_ms: Date.now() - startTime
    };
  } catch (error) {
    console.error('Shade mask generation error:', error);
    return {
      shade_mask: Array(20).fill(Array(20).fill(0.1)),
      shade_index: 0.1,
      processing_time_ms: Date.now() - startTime
    };
  }
}

// Utility functions
function simpleImageHash(url: string): number {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}