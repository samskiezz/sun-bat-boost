export type Pt = [number, number];
export type Poly = Pt[];

// Fast kNN concave hull (small k gives more concavity)
export function concaveHullKNN(points: Pt[], k=8): Poly {
  if ((points?.length||0) < 3) return points || [];
  k = Math.max(3, Math.min(k, points.length-1));
  // pick left-most point
  let current = points.reduce((a,b)=> a[0]===b[0]? (a[1]<b[1]?a:b) : (a[0]<b[0]?a:b));
  const hull: Pt[] = [current];
  let prevAngle = 0;
  const used = new Set<string>([key(current)]);

  while (true) {
    const neigh = kNearest(points, current, k).filter(p=>!used.has(key(p)));
    let best = null as Pt|null;
    let bestAng = Infinity;
    for (const p of neigh) {
      const ang = angleDelta(prevAngle, angle(current, p));
      if (ang < bestAng) { bestAng = ang; best = p; }
    }
    if (!best) break;
    current = best; hull.push(current); used.add(key(current));
    prevAngle = angle(hull[hull.length-2], current);
    if (equals(current, hull[0])) break;
    if (hull.length > 3*points.length) break; // safety
  }
  return uniqRing(hull);
}

export function polygonArea(poly: Poly): number {
  let s = 0; for (let i=0;i<poly.length;i++){ const [x1,y1]=poly[i], [x2,y2]=poly[(i+1)%poly.length]; s+=x1*y2-x2*y1; }
  return Math.abs(s)/2;
}

export function iouRaster(A: Poly, B: Poly, res=256): number {
  const bb = bounds([A,B]);
  if (!bb) return 0;
  const [minX,minY,maxX,maxY] = bb;
  const w = res, h = res;
  const gx = (x:number)=> Math.min(w-1, Math.max(0, Math.floor((x-minX)/(maxX-minX+1e-9)*w)));
  const gy = (y:number)=> Math.min(h-1, Math.max(0, Math.floor((y-minY)/(maxY-minY+1e-9)*h)));
  const fill = (poly:Poly)=>{
    const grid = new Uint8Array(w*h);
    // scanline fill
    for (let j=0;j<h;j++){
      const y = minY + (j+0.5)*(maxY-minY)/h;
      const xs:number[] = [];
      for (let i=0;i<poly.length;i++){
        const [x1,y1]=poly[i], [x2,y2]=poly[(i+1)%poly.length];
        if ((y1>y)!==(y2>y)){
          const x = x1 + (y-y1)*(x2-x1)/((y2-y1)||1e-9);
          xs.push(x);
        }
      }
      xs.sort((a,b)=>a-b);
      for (let t=0;t<xs.length; t+=2){
        const xL = gx(xs[t]), xR = gx(xs[t+1] ?? xs[t]);
        for (let i=xL;i<=xR;i++){ grid[j*w+i]=1; }
      }
    }
    return grid;
  };
  const gA = fill(A), gB = fill(B);
  let inter=0, uni=0;
  for (let i=0;i<gA.length;i++){ const a=gA[i], b=gB[i]; if (a|b) uni++; if (a&b) inter++; }
  return uni? inter/uni : 0;
}

function kNearest(pts:Pt[], p:Pt, k:number){
  return [...pts].sort((a,b)=>dist2(a,p)-dist2(b,p)).slice(1,k+1);
}
const dist2=(a:Pt,b:Pt)=> (a[0]-b[0])**2 + (a[1]-b[1])**2;
const angle=(a:Pt,b:Pt)=> Math.atan2(b[1]-a[1], b[0]-a[0]);
const angleDelta=(prev:number,next:number)=> ((next - prev + Math.PI*2)%(Math.PI*2));
const equals=(a:Pt,b:Pt)=> Math.abs(a[0]-b[0])<1e-9 && Math.abs(a[1]-b[1])<1e-9;
const key=(p:Pt)=> `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
function uniqRing(poly:Pt[]){ const seen=new Set<string>(); return poly.filter(p=>{const k=key(p); if(seen.has(k)) return false; seen.add(k); return true;}); }
function bounds(list:Poly[]){ const pts=list.flat(); if(!pts.length) return null; const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]); return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)] as [number,number,number,number]; }