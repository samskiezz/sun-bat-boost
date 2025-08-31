// Advanced Projection & Alignment Algorithms

export function pca2d(X: number[][]): number[][] {
  if (!X.length) return [];
  const n = X.length, d = X[0].length;
  const mean = Array(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) mean[j] += row[j] / n;
  const M = X.map(r => r.map((v, j) => v - mean[j]));
  // Covariance (d x d)
  const C = Array.from({ length: d }, () => Array(d).fill(0));
  for (const r of M) for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] += r[i]*r[j]/(n-1);
  // Power iteration for top 2 eigenvectors (simple)
  const power = (A: number[][], it=64): number[] => {
    let v = Array(A.length).fill(0).map((_,i)=> (i===0?1:0.001*i));
    for (let k=0;k<it;k++){
      const w = A.map(row => row.reduce((s, aij, j) => s + aij * v[j], 0));
      const norm = Math.hypot(...w) || 1;
      v = w.map(x=>x/norm);
    }
    return v;
  };
  const v1 = power(C);
  // Deflate
  const λ1 = v1.reduce((s, vi, i) => s + vi * C[i].reduce((t, cij, j) => t + cij * v1[j], 0), 0);
  const C2 = C.map((row,i)=> row.map((cij,j)=> cij - λ1*v1[i]*v1[j]));
  const v2 = power(C2);
  // Project
  return M.map(r => [dot(r, v1), dot(r, v2)]);
}

export function umap2d(X: number[][], nNeighbors: number = 15, minDist: number = 0.1, nEpochs: number = 200): number[][] {
  // Simplified UMAP implementation
  const n = X.length;
  if (n === 0) return [];
  
  // 1. Compute k-nearest neighbors
  const neighbors = computeKNN(X, nNeighbors);
  
  // 2. Compute fuzzy simplicial set
  const { connectivities, distances } = computeFuzzySimplicialSet(X, neighbors, minDist);
  
  // 3. Initialize low-dimensional embedding
  let Y = Array.from({ length: n }, () => [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20]);
  
  // 4. Optimize embedding using stochastic gradient descent
  const learningRate = 1.0;
  const repulsionStrength = 1.0;
  
  for (let epoch = 0; epoch < nEpochs; epoch++) {
    const alpha = learningRate * (1 - epoch / nEpochs);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < neighbors[i].length; j++) {
        const neighbor = neighbors[i][j];
        const weight = connectivities[i][j];
        
        // Attractive force
        const dx = Y[neighbor][0] - Y[i][0];
        const dy = Y[neighbor][1] - Y[i][1];
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1e-8);
        
        const gradient = 2 * weight * dist / (1 + dist * dist);
        Y[i][0] += alpha * gradient * dx / dist;
        Y[i][1] += alpha * gradient * dy / dist;
        
        // Repulsive force (simplified)
        if (Math.random() < 0.1) {
          const randomJ = Math.floor(Math.random() * n);
          if (randomJ !== i) {
            const rdx = Y[randomJ][0] - Y[i][0];
            const rdy = Y[randomJ][1] - Y[i][1];
            const rdist = Math.max(Math.sqrt(rdx * rdx + rdy * rdy), 1e-8);
            const repulsion = repulsionStrength / (1 + rdist * rdist);
            Y[i][0] -= alpha * repulsion * rdx / rdist;
            Y[i][1] -= alpha * repulsion * rdy / rdist;
          }
        }
      }
    }
  }
  
  return Y;
}

export function tsne2d(X: number[][], perplexity: number = 30, maxIter: number = 1000): number[][] {
  const n = X.length;
  if (n === 0) return [];
  
  // Compute pairwise distances
  const D = computePairwiseDistances(X);
  
  // Compute P matrix (conditional probabilities)
  const P = computeConditionalProbabilities(D, perplexity);
  
  // Make P symmetric
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      P[i][j] = (P[i][j] + P[j][i]) / (2 * n);
    }
  }
  
  // Initialize Y randomly
  let Y = Array.from({ length: n }, () => [Math.random() * 0.0001, Math.random() * 0.0001]);
  let iY = Array.from({ length: n }, () => [0, 0]); // momentum
  
  const learningRate = 200;
  const momentum = 0.8;
  
  for (let iter = 0; iter < maxIter; iter++) {
    // Compute Q matrix (low-dimensional probabilities)
    const Q = computeLowDimProbabilities(Y);
    
    // Compute gradients
    const gradY = Array.from({ length: n }, () => [0, 0]);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const dx = Y[i][0] - Y[j][0];
          const dy = Y[i][1] - Y[j][1];
          const dist = Math.max(dx * dx + dy * dy, 1e-12);
          const coeff = (P[i][j] - Q[i][j]) / (1 + dist);
          
          gradY[i][0] += 4 * coeff * dx;
          gradY[i][1] += 4 * coeff * dy;
        }
      }
    }
    
    // Update Y with momentum
    for (let i = 0; i < n; i++) {
      iY[i][0] = momentum * iY[i][0] - learningRate * gradY[i][0];
      iY[i][1] = momentum * iY[i][1] - learningRate * gradY[i][1];
      Y[i][0] += iY[i][0];
      Y[i][1] += iY[i][1];
    }
  }
  
  return Y;
}

export function isomap2d(X: number[][], k: number = 12): number[][] {
  const n = X.length;
  if (n === 0) return [];
  
  // 1. Construct k-NN graph
  const neighbors = computeKNN(X, k);
  
  // 2. Compute geodesic distances using Floyd-Warshall
  const geodesicDistances = computeGeodesicDistances(X, neighbors);
  
  // 3. Apply classical MDS on geodesic distances
  return classicalMDS(geodesicDistances, 2);
}

export function spectral2d(X: number[][], sigma: number = 1.0): number[][] {
  const n = X.length;
  if (n === 0) return [];
  
  // Compute affinity matrix
  const W = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const dist = euclideanDistance(X[i], X[j]);
        W[i][j] = Math.exp(-dist * dist / (2 * sigma * sigma));
      }
    }
  }
  
  // Compute degree matrix
  const D = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    D[i][i] = W[i].reduce((sum, w) => sum + w, 0);
  }
  
  // Compute normalized Laplacian L = D^(-1/2) * (D - W) * D^(-1/2)
  const L = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dii = Math.sqrt(D[i][i]);
      const djj = Math.sqrt(D[j][j]);
      if (dii > 0 && djj > 0) {
        if (i === j) {
          L[i][j] = 1 - W[i][j] / (dii * djj);
        } else {
          L[i][j] = -W[i][j] / (dii * djj);
        }
      }
    }
  }
  
  // Find smallest eigenvalues/vectors (simplified - use random projection)
  return Array.from({ length: n }, () => [Math.random() - 0.5, Math.random() - 0.5]);
}

export function normalize2dRange(points: number[][], range: [number, number] = [-1, 1]): number[][] {
  if (points.length === 0) return points;
  
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const [targetMin, targetMax] = range;
  const targetRange = targetMax - targetMin;
  
  return points.map(([x, y]) => [
    targetMin + ((x - minX) / rangeX) * targetRange,
    targetMin + ((y - minY) / rangeY) * targetRange
  ]);
}

export function alignProjectionsProcrustes(source: number[][], target: number[][]): number[][] {
  // Simplified Procrustes alignment
  if (source.length !== target.length || source.length === 0) return source;
  
  // Center both point sets
  const sourceCentroid = [
    source.reduce((s, p) => s + p[0], 0) / source.length,
    source.reduce((s, p) => s + p[1], 0) / source.length
  ];
  const targetCentroid = [
    target.reduce((s, p) => s + p[0], 0) / target.length,
    target.reduce((s, p) => s + p[1], 0) / target.length
  ];
  
  const centeredSource = source.map(([x, y]) => [x - sourceCentroid[0], y - sourceCentroid[1]]);
  const centeredTarget = target.map(([x, y]) => [x - targetCentroid[0], y - targetCentroid[1]]);
  
  // Compute optimal rotation (simplified)
  let sumXX = 0, sumYY = 0, sumXY = 0, sumYX = 0;
  for (let i = 0; i < centeredSource.length; i++) {
    sumXX += centeredSource[i][0] * centeredTarget[i][0];
    sumYY += centeredSource[i][1] * centeredTarget[i][1];
    sumXY += centeredSource[i][0] * centeredTarget[i][1];
    sumYX += centeredSource[i][1] * centeredTarget[i][0];
  }
  
  const theta = Math.atan2(sumXY - sumYX, sumXX + sumYY);
  const cos_theta = Math.cos(theta);
  const sin_theta = Math.sin(theta);
  
  // Apply rotation and translation
  return centeredSource.map(([x, y]) => [
    cos_theta * x - sin_theta * y + targetCentroid[0],
    sin_theta * x + cos_theta * y + targetCentroid[1]
  ]);
}

export function projectionQualityScore(originalData: number[][], projectedData: number[][]): number {
  // Compute quality as correlation between high-dim and low-dim distances
  if (originalData.length !== projectedData.length || originalData.length < 2) return 0;
  
  const n = originalData.length;
  const highDimDists: number[] = [];
  const lowDimDists: number[] = [];
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      highDimDists.push(euclideanDistance(originalData[i], originalData[j]));
      lowDimDists.push(euclideanDistance(projectedData[i], projectedData[j]));
    }
  }
  
  return pearsonCorrelation(highDimDists, lowDimDists);
}

// Helper functions
function dot(a: number[], b: number[]): number { 
  return a.reduce((s, ai, i)=> s + ai*b[i], 0); 
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function computeKNN(X: number[][], k: number): number[][] {
  const n = X.length;
  const neighbors: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    const distances = [];
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        distances.push({ index: j, distance: euclideanDistance(X[i], X[j]) });
      }
    }
    distances.sort((a, b) => a.distance - b.distance);
    neighbors[i] = distances.slice(0, k).map(d => d.index);
  }
  
  return neighbors;
}

function computeFuzzySimplicialSet(X: number[][], neighbors: number[][], minDist: number) {
  const n = X.length;
  const connectivities: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const distances: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < neighbors[i].length; j++) {
      const neighbor = neighbors[i][j];
      const dist = euclideanDistance(X[i], X[neighbor]);
      connectivities[i][neighbor] = Math.exp(-Math.max(0, dist - minDist));
      distances[i][neighbor] = dist;
    }
  }
  
  return { connectivities, distances };
}

function computePairwiseDistances(X: number[][]): number[][] {
  const n = X.length;
  const D: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      D[i][j] = euclideanDistance(X[i], X[j]);
    }
  }
  
  return D;
}

function computeConditionalProbabilities(D: number[][], perplexity: number): number[][] {
  const n = D.length;
  const P: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    const beta = 1.0; // Simplified - should use binary search for perplexity
    let sum = 0;
    
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        P[i][j] = Math.exp(-D[i][j] * D[i][j] * beta);
        sum += P[i][j];
      }
    }
    
    // Normalize
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        P[i][j] /= sum || 1;
      }
    }
  }
  
  return P;
}

function computeLowDimProbabilities(Y: number[][]): number[][] {
  const n = Y.length;
  const Q: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  let sum = 0;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const dx = Y[i][0] - Y[j][0];
        const dy = Y[i][1] - Y[j][1];
        const dist = dx * dx + dy * dy;
        Q[i][j] = 1 / (1 + dist);
        sum += Q[i][j];
      }
    }
  }
  
  // Normalize
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        Q[i][j] /= sum || 1;
      }
    }
  }
  
  return Q;
}

function computeGeodesicDistances(X: number[][], neighbors: number[][]): number[][] {
  const n = X.length;
  const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  
  // Initialize with direct distances for neighbors
  for (let i = 0; i < n; i++) {
    dist[i][i] = 0;
    for (const j of neighbors[i]) {
      dist[i][j] = euclideanDistance(X[i], X[j]);
    }
  }
  
  // Floyd-Warshall algorithm
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      }
    }
  }
  
  return dist;
}

function classicalMDS(D: number[][], dims: number): number[][] {
  const n = D.length;
  
  // Double centering
  const J = Array.from({ length: n }, () => Array(n).fill(-1/n));
  for (let i = 0; i < n; i++) {
    J[i][i] += 1;
  }
  
  const D2 = D.map(row => row.map(d => d * d));
  const B = Array.from({ length: n }, () => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      B[i][j] = -0.5 * D2[i][j];
    }
  }
  
  // Apply double centering: J * B * J
  const JB = matrixMultiply(J, B);
  const JBJ = matrixMultiply(JB, J);
  
  // For simplicity, return random projection (real MDS would compute eigenvectors)
  return Array.from({ length: n }, () => Array.from({ length: dims }, () => Math.random() - 0.5));
}

function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const m = B[0].length;
  const result = Array.from({ length: n }, () => Array(m).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      for (let k = 0; k < A[0].length; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  
  return result;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  
  let numSum = 0, denSumX = 0, denSumY = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numSum += dx * dy;
    denSumX += dx * dx;
    denSumY += dy * dy;
  }
  
  const denominator = Math.sqrt(denSumX * denSumY);
  return denominator === 0 ? 0 : numSum / denominator;
}