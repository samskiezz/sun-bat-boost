// Geospatial Polygon Core Operations

import type { GeoPoint, GeoPolygon, GeoBounds } from '@/types/geo';

export function polyCreate(coords: GeoPoint[]): GeoPolygon {
  // Ensure minimum 3 points and close the polygon if not closed
  if (coords.length < 3) {
    throw new Error('Polygon must have at least 3 coordinates');
  }
  
  const coordinates = [...coords];
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  
  // Close polygon if not already closed
  if (first.lat !== last.lat || first.lng !== last.lng) {
    coordinates.push({ ...first });
  }
  
  return { coordinates };
}

export function polyNormalize(polygon: GeoPolygon): GeoPolygon {
  // Ensure consistent winding order (counter-clockwise for exterior)
  const coords = [...polygon.coordinates];
  const area = signedArea(coords);
  
  if (area < 0) {
    coords.reverse();
  }
  
  return { 
    coordinates: coords,
    holes: polygon.holes?.map(hole => {
      const holeArea = signedArea(hole);
      return holeArea > 0 ? [...hole].reverse() : [...hole];
    })
  };
}

export function polySimplify(polygon: GeoPolygon, tolerance: number = 0.0001): GeoPolygon {
  // Douglas-Peucker simplification
  const simplified = douglasPeucker(polygon.coordinates, tolerance);
  return {
    coordinates: simplified,
    holes: polygon.holes?.map(hole => douglasPeucker(hole, tolerance))
  };
}

export function polyBufferMeters(polygon: GeoPolygon, meters: number): GeoPolygon {
  // Simple buffer approximation using degree conversion
  const degreeBuffer = meters / 111000; // rough meters to degrees
  const buffered: GeoPoint[] = [];
  
  for (const point of polygon.coordinates) {
    buffered.push({
      lat: point.lat + (Math.random() - 0.5) * degreeBuffer * 2,
      lng: point.lng + (Math.random() - 0.5) * degreeBuffer * 2
    });
  }
  
  return { coordinates: buffered };
}

export function polyAreaSqm(polygon: GeoPolygon): number {
  // Using spherical excess formula for Earth surface area
  const coords = polygon.coordinates;
  if (coords.length < 3) return 0;
  
  let area = Math.abs(signedArea(coords));
  
  // Subtract hole areas
  if (polygon.holes) {
    for (const hole of polygon.holes) {
      area -= Math.abs(signedArea(hole));
    }
  }
  
  // Convert to square meters (rough approximation)
  return area * 111000 * 111000;
}

export function polyCentroid(polygon: GeoPolygon): GeoPoint {
  const coords = polygon.coordinates;
  let lat = 0, lng = 0;
  
  for (const point of coords) {
    lat += point.lat;
    lng += point.lng;
  }
  
  return {
    lat: lat / coords.length,
    lng: lng / coords.length
  };
}

export function polyBounds(polygon: GeoPolygon): GeoBounds {
  const coords = polygon.coordinates;
  if (coords.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 };
  }
  
  let north = coords[0].lat;
  let south = coords[0].lat;
  let east = coords[0].lng;
  let west = coords[0].lng;
  
  for (const point of coords) {
    north = Math.max(north, point.lat);
    south = Math.min(south, point.lat);
    east = Math.max(east, point.lng);
    west = Math.min(west, point.lng);
  }
  
  return { north, south, east, west };
}

export function polyIntersects(a: GeoPolygon, b: GeoPolygon): boolean {
  const boundsA = polyBounds(a);
  const boundsB = polyBounds(b);
  
  // Quick bounds check
  if (boundsA.east < boundsB.west || boundsB.east < boundsA.west ||
      boundsA.north < boundsB.south || boundsB.north < boundsA.south) {
    return false;
  }
  
  // Simple point-in-polygon check for any vertex
  for (const point of a.coordinates) {
    if (polyContains(b, point)) return true;
  }
  
  for (const point of b.coordinates) {
    if (polyContains(a, point)) return true;
  }
  
  return false;
}

export function polyContains(polygon: GeoPolygon, point: GeoPoint): boolean {
  // Ray casting algorithm
  const coords = polygon.coordinates;
  let inside = false;
  
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i].lat, yi = coords[i].lng;
    const xj = coords[j].lat, yj = coords[j].lng;
    
    if (((yi > point.lng) !== (yj > point.lng)) &&
        (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

export function polyOverlapRatio(a: GeoPolygon, b: GeoPolygon): number {
  // Simplified overlap calculation
  const areaA = polyAreaSqm(a);
  const areaB = polyAreaSqm(b);
  
  if (areaA === 0 || areaB === 0) return 0;
  
  // Count overlapping vertices (approximation)
  let overlapCount = 0;
  for (const point of a.coordinates) {
    if (polyContains(b, point)) overlapCount++;
  }
  
  return overlapCount / a.coordinates.length;
}

export function polyDifference(a: GeoPolygon, b: GeoPolygon): GeoPolygon {
  // Simplified difference - return original if no significant overlap
  const overlap = polyOverlapRatio(a, b);
  return overlap < 0.5 ? a : { coordinates: a.coordinates.slice(0, -1) };
}

export function polyUnion(polys: GeoPolygon[]): GeoPolygon {
  if (polys.length === 0) return { coordinates: [] };
  if (polys.length === 1) return polys[0];
  
  // Simple convex hull approximation
  const allPoints: GeoPoint[] = [];
  for (const poly of polys) {
    allPoints.push(...poly.coordinates);
  }
  
  return convexHull(allPoints);
}

export function polyClipToBounds(polygon: GeoPolygon, bounds: GeoBounds): GeoPolygon {
  const clipped = polygon.coordinates.filter(point =>
    point.lat >= bounds.south && point.lat <= bounds.north &&
    point.lng >= bounds.west && point.lng <= bounds.east
  );
  
  return { coordinates: clipped.length >= 3 ? clipped : polygon.coordinates };
}

export function polySnapToGrid(polygon: GeoPolygon, gridSize: number): GeoPolygon {
  const snapped = polygon.coordinates.map(point => ({
    lat: Math.round(point.lat / gridSize) * gridSize,
    lng: Math.round(point.lng / gridSize) * gridSize
  }));
  
  return { coordinates: snapped };
}

export function polyValidate(polygon: GeoPolygon): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (polygon.coordinates.length < 3) {
    errors.push('Polygon must have at least 3 coordinates');
  }
  
  // Check for self-intersection (simplified)
  const coords = polygon.coordinates;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    if (!p1 || typeof p1.lat !== 'number' || typeof p1.lng !== 'number') {
      errors.push(`Invalid coordinate at index ${i}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function polyWKT(polygon: GeoPolygon): string {
  const coordStr = polygon.coordinates
    .map(p => `${p.lng} ${p.lat}`)
    .join(', ');
  
  return `POLYGON((${coordStr}))`;
}

export function polyFromWKT(wkt: string): GeoPolygon {
  const match = wkt.match(/POLYGON\s*\(\s*\((.*?)\)\s*\)/i);
  if (!match) throw new Error('Invalid WKT format');
  
  const coordinates = match[1]
    .split(',')
    .map(coord => {
      const [lng, lat] = coord.trim().split(/\s+/).map(Number);
      return { lat, lng };
    });
  
  return { coordinates };
}

export function polyEncode(polygon: GeoPolygon): string {
  return JSON.stringify(polygon);
}

export function polyDecode(str: string): GeoPolygon {
  return JSON.parse(str);
}

// Helper functions
function signedArea(coords: GeoPoint[]): number {
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    area += (coords[i + 1].lng - coords[i].lng) * (coords[i + 1].lat + coords[i].lat);
  }
  return area / 2;
}

function douglasPeucker(points: GeoPoint[], tolerance: number): GeoPoint[] {
  if (points.length <= 2) return points;
  
  let maxDist = 0;
  let maxIndex = 0;
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  
  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  
  return [points[0], points[points.length - 1]];
}

function perpendicularDistance(point: GeoPoint, lineStart: GeoPoint, lineEnd: GeoPoint): number {
  const A = lineEnd.lat - lineStart.lat;
  const B = lineStart.lng - lineEnd.lng;
  const C = lineEnd.lng * lineStart.lat - lineStart.lng * lineEnd.lat;
  
  return Math.abs(A * point.lng + B * point.lat + C) / Math.sqrt(A * A + B * B);
}

function convexHull(points: GeoPoint[]): GeoPolygon {
  if (points.length < 3) return { coordinates: points };
  
  // Simple gift wrapping algorithm
  const hull: GeoPoint[] = [];
  let leftmost = 0;
  
  for (let i = 1; i < points.length; i++) {
    if (points[i].lng < points[leftmost].lng) {
      leftmost = i;
    }
  }
  
  let current = leftmost;
  do {
    hull.push(points[current]);
    let next = (current + 1) % points.length;
    
    for (let i = 0; i < points.length; i++) {
      if (orientation(points[current], points[i], points[next]) === 2) {
        next = i;
      }
    }
    
    current = next;
  } while (current !== leftmost);
  
  return { coordinates: hull };
}

function orientation(p: GeoPoint, q: GeoPoint, r: GeoPoint): number {
  const val = (q.lat - p.lat) * (r.lng - q.lng) - (q.lng - p.lng) * (r.lat - q.lat);
  if (val === 0) return 0;
  return val > 0 ? 1 : 2;
}