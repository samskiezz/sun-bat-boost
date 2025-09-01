// Procrustes alignment and data normalization functions

export function procrustesAlign(X: number[][], Y: number[][]) {
  if (!X.length || !Y.length || X.length !== Y.length) {
    throw new Error("X and Y must have same length and be non-empty");
  }

  const n = X.length;
  const d = X[0].length;

  // Center both point sets
  const meanX = centroid(X);
  const meanY = centroid(Y);
  
  const Xc = X.map(p => p.map((v, i) => v - meanX[i]));
  const Yc = Y.map(p => p.map((v, i) => v - meanY[i]));

  // Compute cross-covariance matrix H = Xc^T * Yc
  const H = Array.from({ length: d }, () => Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      for (let k = 0; k < n; k++) {
        H[i][j] += Xc[k][i] * Yc[k][j];
      }
    }
  }

  // Simple 2D rotation matrix (for higher dimensions, would need proper SVD)
  let R: number[][];
  if (d === 2) {
    // 2D case - compute optimal rotation angle
    const angle = Math.atan2(H[0][1] - H[1][0], H[0][0] + H[1][1]);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    R = [[cos, -sin], [sin, cos]];
  } else {
    // For higher dimensions, use identity (simplified)
    R = Array.from({ length: d }, (_, i) => 
      Array.from({ length: d }, (_, j) => i === j ? 1 : 0)
    );
  }

  // Compute scale
  const numX = Xc.reduce((sum, p) => sum + p.reduce((s, v) => s + v * v, 0), 0);
  const numY = Yc.reduce((sum, p) => sum + p.reduce((s, v) => s + v * v, 0), 0);
  const scale = numY > 0 ? Math.sqrt(numX / numY) : 1;

  // Return transformation function
  const map = (point: number[]): number[] => {
    // Center
    const centered = point.map((v, i) => v - meanX[i]);
    // Rotate and scale
    const transformed = centered.map((_, i) => 
      R[i].reduce((sum, rij, j) => sum + rij * centered[j], 0) * scale
    );
    // Translate
    return transformed.map((v, i) => v + meanY[i]);
  };

  return { map, rotation: R, scale, translation: meanY };
}

export function l2Normalize(X: number[][]): number[][] {
  return X.map(row => {
    const norm = Math.sqrt(row.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? row.map(val => val / norm) : row;
  });
}

export function zWhiten(X: number[][]): number[][] {
  if (!X.length) return X;
  
  const n = X.length;
  const d = X[0].length;
  
  // Compute mean for each dimension
  const mean = Array(d).fill(0);
  for (const row of X) {
    for (let j = 0; j < d; j++) {
      mean[j] += row[j] / n;
    }
  }
  
  // Compute standard deviation for each dimension
  const std = Array(d).fill(0);
  for (const row of X) {
    for (let j = 0; j < d; j++) {
      const diff = row[j] - mean[j];
      std[j] += diff * diff / n;
    }
  }
  for (let j = 0; j < d; j++) {
    std[j] = Math.sqrt(std[j]);
  }
  
  // Center and scale
  return X.map(row => 
    row.map((val, j) => std[j] > 0 ? (val - mean[j]) / std[j] : val - mean[j])
  );
}

// Helper functions
function centroid(points: number[][]): number[] {
  if (!points.length) return [];
  const d = points[0].length;
  const mean = Array(d).fill(0);
  for (const point of points) {
    for (let i = 0; i < d; i++) {
      mean[i] += point[i] / points.length;
    }
  }
  return mean;
}