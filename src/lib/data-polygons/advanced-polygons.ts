// Advanced Polygon Construction in Embedding Space

import type { Point, Polygon } from './core';

export function concaveHullKNN(points: Point[], k: number = 3): Polygon {
  if (points.length < 3) return points;
  
  // Find the starting point (leftmost)
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i][0] < points[start][0] || 
        (points[i][0] === points[start][0] && points[i][1] < points[start][1])) {
      start = i;
    }
  }
  
  const hull: Point[] = [];
  const used = new Set<number>();
  let current = start;
  
  do {
    hull.push(points[current]);
    used.add(current);
    
    // Find k nearest neighbors
    const neighbors = points
      .map((p, i) => ({ point: p, index: i, distance: distance(points[current], p) }))
      .filter(n => !used.has(n.index))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);
    
    if (neighbors.length === 0) break;
    
    // Choose the neighbor that makes the smallest right turn
    let bestNeighbor = neighbors[0];
    let smallestAngle = Infinity;
    
    for (const neighbor of neighbors) {
      const angle = calculateTurnAngle(
        hull.length >= 2 ? hull[hull.length - 2] : points[current],
        points[current],
        neighbor.point
      );
      
      if (angle < smallestAngle) {
        smallestAngle = angle;
        bestNeighbor = neighbor;
      }
    }
    
    current = bestNeighbor.index;
  } while (current !== start && hull.length < points.length);
  
  return hull;
}

export function alphaShape(points: Point[], alpha: number = 1.0): Polygon[] {
  if (points.length < 3) return [points];
  
  // Simplified alpha shape using Delaunay triangulation approximation
  const triangles = delaunayTriangulation(points);
  const validEdges = new Map<string, Point[]>();
  
  for (const triangle of triangles) {
    const edges = [
      [triangle[0], triangle[1]],
      [triangle[1], triangle[2]],
      [triangle[2], triangle[0]]
    ];
    
    for (const edge of edges) {
      const circumRadius = calculateCircumRadius(triangle);
      
      if (circumRadius <= 1 / alpha) {
        const key = edgeKey(edge[0], edge[1]);
        if (!validEdges.has(key)) {
          validEdges.set(key, edge);
        } else {
          validEdges.delete(key); // Remove shared edges
        }
      }
    }
  }
  
  // Build polygons from remaining edges
  return buildPolygonsFromEdges(Array.from(validEdges.values()));
}

export function polygonSmoothChaikin(polygon: Polygon, iterations: number = 2): Polygon {
  let result = [...polygon];
  
  for (let iter = 0; iter < iterations; iter++) {
    const smoothed: Point[] = [];
    
    for (let i = 0; i < result.length; i++) {
      const current = result[i];
      const next = result[(i + 1) % result.length];
      
      // Chaikin's corner cutting
      const p1: Point = [
        current[0] * 0.75 + next[0] * 0.25,
        current[1] * 0.75 + next[1] * 0.25
      ];
      const p2: Point = [
        current[0] * 0.25 + next[0] * 0.75,
        current[1] * 0.25 + next[1] * 0.75
      ];
      
      smoothed.push(p1, p2);
    }
    
    result = smoothed;
  }
  
  return result;
}

export function polygonResampleN(polygon: Polygon, n: number): Polygon {
  if (polygon.length <= 1 || n <= 0) return polygon;
  
  // Calculate total perimeter
  let totalLength = 0;
  const segmentLengths: number[] = [];
  
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const length = distance(current, next);
    segmentLengths.push(length);
    totalLength += length;
  }
  
  // Resample at equal arc length intervals
  const targetLength = totalLength / n;
  const resampled: Point[] = [];
  
  let currentLength = 0;
  let segmentIndex = 0;
  let segmentProgress = 0;
  
  for (let i = 0; i < n; i++) {
    const targetPosition = i * targetLength;
    
    // Find the segment containing this position
    while (currentLength + segmentLengths[segmentIndex] - segmentProgress < targetPosition && 
           segmentIndex < polygon.length) {
      currentLength += segmentLengths[segmentIndex] - segmentProgress;
      segmentIndex++;
      segmentProgress = 0;
      
      if (segmentIndex >= polygon.length) {
        segmentIndex = 0;
      }
    }
    
    // Interpolate within the segment
    const remainingDistance = targetPosition - currentLength;
    const segmentRatio = (segmentProgress + remainingDistance) / segmentLengths[segmentIndex];
    
    const current = polygon[segmentIndex];
    const next = polygon[(segmentIndex + 1) % polygon.length];
    
    const point: Point = [
      current[0] + (next[0] - current[0]) * segmentRatio,
      current[1] + (next[1] - current[1]) * segmentRatio
    ];
    
    resampled.push(point);
    segmentProgress += remainingDistance;
  }
  
  return resampled;
}

export function polygonSimplifyDouglasPeucker(polygon: Polygon, epsilon: number = 1.0): Polygon {
  if (polygon.length <= 2) return polygon;
  
  // Find the point with maximum distance from the line segment
  let maxDistance = 0;
  let maxIndex = 0;
  
  const start = polygon[0];
  const end = polygon[polygon.length - 1];
  
  for (let i = 1; i < polygon.length - 1; i++) {
    const dist = pointToLineDistance(polygon[i], start, end);
    if (dist > maxDistance) {
      maxDistance = dist;
      maxIndex = i;
    }
  }
  
  // If the maximum distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const left = polygonSimplifyDouglasPeucker(polygon.slice(0, maxIndex + 1), epsilon);
    const right = polygonSimplifyDouglasPeucker(polygon.slice(maxIndex), epsilon);
    
    // Combine results (remove duplicate middle point)
    return [...left.slice(0, -1), ...right];
  } else {
    // All points can be discarded except the endpoints
    return [start, end];
  }
}

export function polygonComplexityIndex(polygon: Polygon): number {
  if (polygon.length < 3) return 0;
  
  // Calculate various complexity measures
  const area = calculatePolygonArea(polygon);
  const perimeter = calculatePolygonPerimeter(polygon);
  const convexHullArea = calculatePolygonArea(convexHull(polygon));
  
  // Compactness (isoperimetric ratio)
  const compactness = (4 * Math.PI * area) / (perimeter * perimeter);
  
  // Convexity ratio
  const convexityRatio = area / (convexHullArea || 1);
  
  // Turning angle variance
  const turningAngles = calculateTurningAngles(polygon);
  const angleVariance = variance(turningAngles);
  
  // Edge length variance
  const edgeLengths = calculateEdgeLengths(polygon);
  const lengthVariance = variance(edgeLengths);
  
  // Combine into single complexity index
  return (1 - compactness) * 0.3 + 
         (1 - convexityRatio) * 0.3 + 
         (angleVariance / (Math.PI * Math.PI)) * 0.2 + 
         (lengthVariance / (perimeter / polygon.length)) * 0.2;
}

export function polygonSelfIntersectFix(polygon: Polygon): Polygon {
  if (polygon.length < 4) return polygon;
  
  // Simple self-intersection removal using sweep line algorithm (simplified)
  const fixed: Point[] = [];
  const used = new Set<number>();
  
  // Start from a point that's definitely on the hull
  let start = 0;
  for (let i = 1; i < polygon.length; i++) {
    if (polygon[i][0] < polygon[start][0] || 
        (polygon[i][0] === polygon[start][0] && polygon[i][1] < polygon[start][1])) {
      start = i;
    }
  }
  
  let current = start;
  
  do {
    if (!used.has(current)) {
      fixed.push(polygon[current]);
      used.add(current);
    }
    
    // Find next point that doesn't create intersection
    let next = (current + 1) % polygon.length;
    while (used.has(next) && fixed.length < polygon.length) {
      next = (next + 1) % polygon.length;
    }
    
    // Check for intersections with existing edges
    let foundIntersection = false;
    if (fixed.length >= 2) {
      const newEdge = [polygon[current], polygon[next]];
      
      for (let i = 0; i < fixed.length - 1; i++) {
        const existingEdge = [fixed[i], fixed[i + 1]];
        if (edgesIntersect(newEdge[0], newEdge[1], existingEdge[0], existingEdge[1])) {
          foundIntersection = true;
          break;
        }
      }
    }
    
    if (foundIntersection) {
      // Skip this point and try the next one
      next = (next + 1) % polygon.length;
    }
    
    current = next;
  } while (current !== start && fixed.length < polygon.length);
  
  return fixed;
}

export function multiPolygonUnion(polygons: Polygon[]): Polygon {
  if (polygons.length === 0) return [];
  if (polygons.length === 1) return polygons[0];
  
  // Simplified union using convex hull of all points
  const allPoints: Point[] = [];
  for (const polygon of polygons) {
    allPoints.push(...polygon);
  }
  
  return convexHull(allPoints);
}

export function multiPolygonIntersect(polygons: Polygon[]): Polygon {
  if (polygons.length === 0) return [];
  if (polygons.length === 1) return polygons[0];
  
  // Simplified intersection - find overlapping region
  let result = polygons[0];
  
  for (let i = 1; i < polygons.length; i++) {
    result = clipPolygon(result, polygons[i]);
    if (result.length === 0) break;
  }
  
  return result;
}

export function polygonEnvelope(polygon: Polygon): Polygon {
  if (polygon.length === 0) return [];
  
  // Calculate bounding box
  const xs = polygon.map(p => p[0]);
  const ys = polygon.map(p => p[1]);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY]
  ];
}

// Helper functions
function distance(p1: Point, p2: Point): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateTurnAngle(prev: Point, current: Point, next: Point): number {
  const v1 = [current[0] - prev[0], current[1] - prev[1]];
  const v2 = [next[0] - current[0], next[1] - current[1]];
  
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const det = v1[0] * v2[1] - v1[1] * v2[0];
  
  return Math.atan2(det, dot);
}

function delaunayTriangulation(points: Point[]): Point[][] {
  // Simplified triangulation - return some reasonable triangles
  if (points.length < 3) return [];
  
  const triangles: Point[][] = [];
  
  // Use fan triangulation from first point (not optimal but simple)
  for (let i = 1; i < points.length - 1; i++) {
    triangles.push([points[0], points[i], points[i + 1]]);
  }
  
  return triangles;
}

function calculateCircumRadius(triangle: Point[]): number {
  const [a, b, c] = triangle;
  const ab = distance(a, b);
  const bc = distance(b, c);
  const ca = distance(c, a);
  
  const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  
  return (ab * bc * ca) / (4 * area + 1e-10);
}

function edgeKey(p1: Point, p2: Point): string {
  const [minP, maxP] = p1[0] < p2[0] || (p1[0] === p2[0] && p1[1] < p2[1]) ? [p1, p2] : [p2, p1];
  return `${minP[0]},${minP[1]}-${maxP[0]},${maxP[1]}`;
}

function buildPolygonsFromEdges(edges: Point[][]): Polygon[] {
  // Simplified polygon building from edges
  if (edges.length === 0) return [];
  
  // Return the first polygon we can build
  const polygon: Point[] = [];
  if (edges.length > 0) {
    polygon.push(edges[0][0], edges[0][1]);
    
    // Try to connect edges
    for (let i = 1; i < edges.length && polygon.length < 20; i++) {
      const lastPoint = polygon[polygon.length - 1];
      const edge = edges[i];
      
      if (distance(lastPoint, edge[0]) < 0.01) {
        polygon.push(edge[1]);
      } else if (distance(lastPoint, edge[1]) < 0.01) {
        polygon.push(edge[0]);
      }
    }
  }
  
  return polygon.length >= 3 ? [polygon] : [];
}

function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point[0] - lineStart[0];
  const B = point[1] - lineStart[1];
  const C = lineEnd[0] - lineStart[0];
  const D = lineEnd[1] - lineStart[1];
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return distance(point, lineStart);
  
  const param = dot / lenSq;
  
  let xx: number, yy: number;
  
  if (param < 0) {
    xx = lineStart[0];
    yy = lineStart[1];
  } else if (param > 1) {
    xx = lineEnd[0];
    yy = lineEnd[1];
  } else {
    xx = lineStart[0] + param * C;
    yy = lineStart[1] + param * D;
  }
  
  const dx = point[0] - xx;
  const dy = point[1] - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}

function calculatePolygonArea(polygon: Polygon): number {
  if (polygon.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i][0] * polygon[j][1];
    area -= polygon[j][0] * polygon[i][1];
  }
  
  return Math.abs(area) / 2;
}

function calculatePolygonPerimeter(polygon: Polygon): number {
  if (polygon.length < 2) return 0;
  
  let perimeter = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    perimeter += distance(polygon[i], polygon[j]);
  }
  
  return perimeter;
}

function convexHull(points: Point[]): Polygon {
  if (points.length <= 1) return points;
  
  // Sort points lexicographically
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  
  // Build lower hull
  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  
  // Build upper hull
  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  
  // Remove duplicate points
  upper.pop();
  lower.pop();
  
  return lower.concat(upper);
}

function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function calculateTurningAngles(polygon: Polygon): number[] {
  const angles: number[] = [];
  
  for (let i = 0; i < polygon.length; i++) {
    const prev = polygon[(i - 1 + polygon.length) % polygon.length];
    const curr = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    
    angles.push(calculateTurnAngle(prev, curr, next));
  }
  
  return angles;
}

function calculateEdgeLengths(polygon: Polygon): number[] {
  const lengths: number[] = [];
  
  for (let i = 0; i < polygon.length; i++) {
    const curr = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    lengths.push(distance(curr, next));
  }
  
  return lengths;
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => (val - mean) ** 2);
  
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}

function clipPolygon(subject: Polygon, clip: Polygon): Polygon {
  // Sutherland-Hodgman clipping algorithm (simplified)
  let output = subject;
  
  for (let i = 0; i < clip.length; i++) {
    const clipVertex1 = clip[i];
    const clipVertex2 = clip[(i + 1) % clip.length];
    const input = output;
    output = [];
    
    if (input.length === 0) break;
    
    let s = input[input.length - 1];
    
    for (const e of input) {
      if (isInside(e, clipVertex1, clipVertex2)) {
        if (!isInside(s, clipVertex1, clipVertex2)) {
          const intersection = getIntersection(s, e, clipVertex1, clipVertex2);
          if (intersection) output.push(intersection);
        }
        output.push(e);
      } else if (isInside(s, clipVertex1, clipVertex2)) {
        const intersection = getIntersection(s, e, clipVertex1, clipVertex2);
        if (intersection) output.push(intersection);
      }
      s = e;
    }
  }
  
  return output;
}

function isInside(point: Point, lineStart: Point, lineEnd: Point): boolean {
  // Check if point is on the inside (left) side of the line
  return (lineEnd[0] - lineStart[0]) * (point[1] - lineStart[1]) - 
         (lineEnd[1] - lineStart[1]) * (point[0] - lineStart[0]) >= 0;
}

function getIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const x1 = p1[0], y1 = p1[1];
  const x2 = p2[0], y2 = p2[1];
  const x3 = p3[0], y3 = p3[1];
  const x4 = p4[0], y4 = p4[1];
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  
  return [
    x1 + t * (x2 - x1),
    y1 + t * (y2 - y1)
  ];
}

function edgesIntersect(p1: Point, q1: Point, p2: Point, q2: Point): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);
  
  // General case
  if (o1 !== o2 && o3 !== o4) return true;
  
  // Special cases (collinear points)
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  
  return false;
}

function orientation(p: Point, q: Point, r: Point): number {
  const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
  if (Math.abs(val) < 1e-10) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(p: Point, q: Point, r: Point): boolean {
  return q[0] <= Math.max(p[0], r[0]) && q[0] >= Math.min(p[0], r[0]) &&
         q[1] <= Math.max(p[1], r[1]) && q[1] >= Math.min(p[1], r[1]);
}