export type Point = [number, number];
export type Polygon = Point[];

export function centroid(points: Point[]): Point {
  const n = points.length || 1;
  const sx = points.reduce((s, p) => s + p[0], 0);
  const sy = points.reduce((s, p) => s + p[1], 0);
  return [sx / n, sy / n];
}

export function area(poly: Polygon): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

// Monotone chain convex hull (O(n log n))
export function convexHull(pts: Point[]): Polygon {
  const P = [...pts].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  if (P.length <= 1) return P;
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [];
  for (const p of P) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

// Sutherland–Hodgman polygon clipping (convex clipper recommended)
export function clip(subject: Polygon, clipper: Polygon): Polygon {
  let output = subject;
  for (let i = 0; i < clipper.length; i++) {
    const A = clipper[i];
    const B = clipper[(i + 1) % clipper.length];
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const P = input[j];
      const Q = input[(j + 1) % input.length];
      const inside = (p: Point) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]) >= 0;
      const intersection = (): Point => {
        const [x1, y1] = P, [x2, y2] = Q, [x3, y3] = A, [x4, y4] = B;
        const den = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);
        if (!den) return P;
        const xi = ((x1*y2 - y1*x2)*(x3-x4) - (x1-x2)*(x3*y4 - y3*x4)) / den;
        const yi = ((x1*y2 - y1*x2)*(y3-y4) - (y1-y2)*(x3*y4 - y3*x4)) / den;
        return [xi, yi];
      };
      const Pin = inside(P), Qin = inside(Q);
      if (Pin && Qin) output.push(Q);
      else if (Pin && !Qin) output.push(intersection());
      else if (!Pin && Qin) { output.push(intersection()); output.push(Q); }
    }
  }
  return output;
}

export function intersectArea(a: Polygon, b: Polygon): number {
  if (!a.length || !b.length) return 0;
  const inter = clip(a, b);
  return inter.length ? area(inter) : 0;
}

export function unionArea(a: Polygon, b: Polygon): number {
  // Approx for simple convex sets: A ∪ B = A + B − A∩B
  return area(a) + area(b) - intersectArea(a, b);
}

export function iou(a: Polygon, b: Polygon): number {
  const inter = intersectArea(a, b);
  const uni = unionArea(a, b);
  return uni ? inter / uni : 0;
}

export function jaccard(a: Polygon, b: Polygon): number {
  return iou(a, b);
}