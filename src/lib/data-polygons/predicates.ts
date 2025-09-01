export type Pt = [number, number];
export type Poly = Pt[];

export function pointInPolygon(p: Pt, poly: Poly): boolean {
  // ray-casting
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    const intersect = ((yi > p[1]) !== (yj > p[1])) &&
      (p[0] < (xj - xi) * (p[1] - yi) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonCentroid(poly: Poly): Pt {
  let x=0,y=0, a=0;
  for (let i=0;i<poly.length;i++){
    const [x1,y1]=poly[i], [x2,y2]=poly[(i+1)%poly.length];
    const cross = x1*y2 - x2*y1; a += cross; x += (x1+x2)*cross; y += (y1+y2)*cross;
  }
  a = a || 1; return [x/(3*a), y/(3*a)];
}