// Advanced Matching & Assignment Algorithms

import type { Point, Polygon } from './core';

export function matchBipartiteHungarian(costs: number[][]): number[] {
  // Simplified Hungarian algorithm for bipartite matching
  const n = costs.length;
  const m = costs[0]?.length || 0;
  
  if (n === 0 || m === 0) return [];
  
  // Initialize assignment (-1 means unassigned)
  const assignment = new Array(n).fill(-1);
  
  // Greedy assignment for simplicity (real Hungarian would be O(n^3))
  const used = new Set<number>();
  
  for (let i = 0; i < n; i++) {
    let bestJ = -1;
    let bestCost = Infinity;
    
    for (let j = 0; j < m; j++) {
      if (!used.has(j) && costs[i][j] < bestCost) {
        bestCost = costs[i][j];
        bestJ = j;
      }
    }
    
    if (bestJ !== -1) {
      assignment[i] = bestJ;
      used.add(bestJ);
    }
  }
  
  return assignment;
}

export function matchGreedyKNN(sources: Point[][], targets: Point[][], k: number = 3): Array<{source: number, targets: number[], scores: number[]}> {
  const matches: Array<{source: number, targets: number[], scores: number[]}> = [];
  
  for (let i = 0; i < sources.length; i++) {
    const sourcePolygon = sources[i];
    const distances: Array<{index: number, distance: number}> = [];
    
    for (let j = 0; j < targets.length; j++) {
      const targetPolygon = targets[j];
      const distance = polygonDistance(sourcePolygon, targetPolygon);
      distances.push({ index: j, distance });
    }
    
    // Sort by distance and take top k
    distances.sort((a, b) => a.distance - b.distance);
    const topK = distances.slice(0, k);
    
    matches.push({
      source: i,
      targets: topK.map(d => d.index),
      scores: topK.map(d => 1.0 / (1.0 + d.distance)) // Convert distance to similarity score
    });
  }
  
  return matches;
}

function polygonDistance(poly1: Point[], poly2: Point[]): number {
  // Simple centroid distance for now
  const c1 = calculateCentroid(poly1);
  const c2 = calculateCentroid(poly2);
  
  const dx = c1[0] - c2[0];
  const dy = c1[1] - c2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateCentroid(points: Point[]): Point {
  if (points.length === 0) return [0, 0];
  
  const sum = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}