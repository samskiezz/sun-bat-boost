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

function dot(a: number[], b: number[]): number { 
  return a.reduce((s, ai, i)=> s + ai*b[i], 0); 
}