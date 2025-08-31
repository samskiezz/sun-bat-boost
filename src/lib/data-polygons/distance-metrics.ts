// Advanced Distance & Similarity Metrics for Polygons

import type { Point, Polygon } from './core';

export function hausdorffDistance(poly1: Polygon, poly2: Polygon): number {
  if (poly1.length === 0 || poly2.length === 0) return Infinity;
  
  const directed1 = directedHausdorffDistance(poly1, poly2);
  const directed2 = directedHausdorffDistance(poly2, poly1);
  
  return Math.max(directed1, directed2);
}

export function chamferDistance(poly1: Polygon, poly2: Polygon): number {
  if (poly1.length === 0 || poly2.length === 0) return Infinity;
  
  const directed1 = directedChamferDistance(poly1, poly2);
  const directed2 = directedChamferDistance(poly2, poly1);
  
  return Math.max(directed1, directed2);
}

export function diceCoefficient(poly1: Polygon, poly2: Polygon): number {
  const area1 = calculateArea(poly1);
  const area2 = calculateArea(poly2);
  const intersectionArea = calculateIntersectionArea(poly1, poly2);
  
  if (area1 + area2 === 0) return 1.0; // Both empty
  
  return (2 * intersectionArea) / (area1 + area2);
}

export function overlapMatrixIoU(polygons: Polygon[]): number[][] {
  const n = polygons.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0; // Self-overlap is 1
    
    for (let j = i + 1; j < n; j++) {
      const iou = calculateIoU(polygons[i], polygons[j]);
      matrix[i][j] = iou;
      matrix[j][i] = iou; // Symmetric
    }
  }
  
  return matrix;
}

export function containmentScoreDirected(container: Polygon, contained: Polygon): number {
  if (contained.length === 0) return 1.0; // Empty polygon is contained
  if (container.length === 0) return 0.0; // Nothing can be contained in empty
  
  const containedArea = calculateArea(contained);
  const intersectionArea = calculateIntersectionArea(container, contained);
  
  if (containedArea === 0) return 1.0;
  
  return intersectionArea / containedArea;
}

export function surfaceDifference(poly1: Polygon, poly2: Polygon): number {
  const area1 = calculateArea(poly1);
  const area2 = calculateArea(poly2);
  const intersectionArea = calculateIntersectionArea(poly1, poly2);
  const unionArea = area1 + area2 - intersectionArea;
  
  if (unionArea === 0) return 0.0;
  
  return (unionArea - intersectionArea) / unionArea;
}

export function centroidDistance(poly1: Polygon, poly2: Polygon): number {
  const centroid1 = calculateCentroid(poly1);
  const centroid2 = calculateCentroid(poly2);
  
  return euclideanDistance(centroid1, centroid2);
}

export function boundaryFractalScore(polygon: Polygon): number {
  if (polygon.length < 4) return 1.0; // Simple shapes have low fractal dimension
  
  // Simplified fractal dimension calculation using box-counting method
  const boxSizes = [1, 0.5, 0.25, 0.125, 0.0625];
  const counts: number[] = [];
  
  for (const boxSize of boxSizes) {
    counts.push(countBoxesCoveringBoundary(polygon, boxSize));
  }
  
  // Calculate fractal dimension using linear regression on log-log plot
  let sumLogSize = 0, sumLogCount = 0, sumLogSizeLogCount = 0, sumLogSizeSquared = 0;
  
  for (let i = 0; i < boxSizes.length; i++) {
    const logSize = Math.log(boxSizes[i]);
    const logCount = Math.log(counts[i] + 1); // +1 to avoid log(0)
    
    sumLogSize += logSize;
    sumLogCount += logCount;
    sumLogSizeLogCount += logSize * logCount;
    sumLogSizeSquared += logSize * logSize;
  }
  
  const n = boxSizes.length;
  const slope = (n * sumLogSizeLogCount - sumLogSize * sumLogCount) / 
                (n * sumLogSizeSquared - sumLogSize * sumLogSize);
  
  return Math.abs(slope); // Fractal dimension is negative slope
}

export function polygonSimilarityComposite(poly1: Polygon, poly2: Polygon): number {
  // Composite similarity combining multiple metrics
  const iou = calculateIoU(poly1, poly2);
  const dice = diceCoefficient(poly1, poly2);
  const normalizedHausdorff = 1.0 / (1.0 + hausdorffDistance(poly1, poly2));
  const shapeSimilarity = calculateShapeSimilarity(poly1, poly2);
  
  // Weighted combination
  return 0.3 * iou + 
         0.2 * dice + 
         0.2 * normalizedHausdorff + 
         0.3 * shapeSimilarity;
}

export function pairwiseMetricMatrix(polygons: Polygon[], metric: string = 'iou'): number[][] {
  const n = polygons.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  
  const metricFunction = getMetricFunction(metric);
  
  for (let i = 0; i < n; i++) {
    matrix[i][i] = metric === 'distance' ? 0.0 : 1.0; // Distance vs similarity
    
    for (let j = i + 1; j < n; j++) {
      const value = metricFunction(polygons[i], polygons[j]);
      matrix[i][j] = value;
      matrix[j][i] = value;
    }
  }
  
  return matrix;
}

// Helper functions

function directedHausdorffDistance(poly1: Polygon, poly2: Polygon): number {
  let maxMinDistance = 0;
  
  for (const point1 of poly1) {
    let minDistance = Infinity;
    
    for (const point2 of poly2) {
      const dist = euclideanDistance(point1, point2);
      minDistance = Math.min(minDistance, dist);
    }
    
    maxMinDistance = Math.max(maxMinDistance, minDistance);
  }
  
  return maxMinDistance;
}

function directedChamferDistance(poly1: Polygon, poly2: Polygon): number {
  let totalDistance = 0;
  
  for (const point1 of poly1) {
    let minDistance = Infinity;
    
    for (const point2 of poly2) {
      const dist = euclideanDistance(point1, point2);
      minDistance = Math.min(minDistance, dist);
    }
    
    totalDistance += minDistance;
  }
  
  return totalDistance / poly1.length;
}

function calculateArea(polygon: Polygon): number {
  if (polygon.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i][0] * polygon[j][1];
    area -= polygon[j][0] * polygon[i][1];
  }
  
  return Math.abs(area) / 2;
}

function calculateIntersectionArea(poly1: Polygon, poly2: Polygon): number {
  // Simplified intersection using Sutherland-Hodgman clipping
  const clipped = clipPolygon(poly1, poly2);
  return calculateArea(clipped);
}

function calculateIoU(poly1: Polygon, poly2: Polygon): number {
  const area1 = calculateArea(poly1);
  const area2 = calculateArea(poly2);
  const intersectionArea = calculateIntersectionArea(poly1, poly2);
  const unionArea = area1 + area2 - intersectionArea;
  
  if (unionArea === 0) return poly1.length === 0 && poly2.length === 0 ? 1.0 : 0.0;
  
  return intersectionArea / unionArea;
}

function calculateCentroid(polygon: Polygon): Point {
  if (polygon.length === 0) return [0, 0];
  
  let cx = 0, cy = 0;
  for (const point of polygon) {
    cx += point[0];
    cy += point[1];
  }
  
  return [cx / polygon.length, cy / polygon.length];
}

function euclideanDistance(p1: Point, p2: Point): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function countBoxesCoveringBoundary(polygon: Polygon, boxSize: number): number {
  if (polygon.length < 2) return 0;
  
  const boxes = new Set<string>();
  
  // Sample points along the boundary
  for (let i = 0; i < polygon.length; i++) {
    const start = polygon[i];
    const end = polygon[(i + 1) % polygon.length];
    
    // Sample points along this edge
    const edgeLength = euclideanDistance(start, end);
    const numSamples = Math.max(1, Math.ceil(edgeLength / (boxSize / 4)));
    
    for (let j = 0; j <= numSamples; j++) {
      const t = j / numSamples;
      const point: Point = [
        start[0] + t * (end[0] - start[0]),
        start[1] + t * (end[1] - start[1])
      ];
      
      // Determine which box this point falls into
      const boxX = Math.floor(point[0] / boxSize);
      const boxY = Math.floor(point[1] / boxSize);
      boxes.add(`${boxX},${boxY}`);
    }
  }
  
  return boxes.size;
}

function calculateShapeSimilarity(poly1: Polygon, poly2: Polygon): number {
  // Compare shape descriptors
  const desc1 = calculateShapeDescriptors(poly1);
  const desc2 = calculateShapeDescriptors(poly2);
  
  // Calculate similarity using cosine similarity
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  const minLength = Math.min(desc1.length, desc2.length);
  
  for (let i = 0; i < minLength; i++) {
    dotProduct += desc1[i] * desc2[i];
    norm1 += desc1[i] * desc1[i];
    norm2 += desc2[i] * desc2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

function calculateShapeDescriptors(polygon: Polygon): number[] {
  if (polygon.length < 3) return [0, 0, 0, 0, 0];
  
  const area = calculateArea(polygon);
  const perimeter = calculatePerimeter(polygon);
  const compactness = (4 * Math.PI * area) / (perimeter * perimeter);
  const convexity = calculateConvexity(polygon);
  const roughness = calculateRoughness(polygon);
  
  return [area, perimeter, compactness, convexity, roughness];
}

function calculatePerimeter(polygon: Polygon): number {
  let perimeter = 0;
  
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    perimeter += euclideanDistance(current, next);
  }
  
  return perimeter;
}

function calculateConvexity(polygon: Polygon): number {
  const area = calculateArea(polygon);
  const convexHullArea = calculateArea(computeConvexHull(polygon));
  
  if (convexHullArea === 0) return 1.0;
  
  return area / convexHullArea;
}

function calculateRoughness(polygon: Polygon): number {
  if (polygon.length < 3) return 0;
  
  const edgeLengths: number[] = [];
  
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    edgeLengths.push(euclideanDistance(current, next));
  }
  
  const meanLength = edgeLengths.reduce((sum, len) => sum + len, 0) / edgeLengths.length;
  const variance = edgeLengths.reduce((sum, len) => sum + (len - meanLength) ** 2, 0) / edgeLengths.length;
  
  return variance / (meanLength * meanLength + 1e-8);
}

function computeConvexHull(points: Point[]): Polygon {
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

function clipPolygon(subject: Polygon, clip: Polygon): Polygon {
  // Sutherland-Hodgman clipping algorithm
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

function getMetricFunction(metric: string): (p1: Polygon, p2: Polygon) => number {
  switch (metric.toLowerCase()) {
    case 'iou': return calculateIoU;
    case 'dice': return diceCoefficient;
    case 'hausdorff': return hausdorffDistance;
    case 'chamfer': return chamferDistance;
    case 'centroid': return centroidDistance;
    case 'composite': return polygonSimilarityComposite;
    default: return calculateIoU;
  }
}