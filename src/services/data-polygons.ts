import { pca2d } from "@/lib/data-polygons/projection";
import { concaveHullKNN, polygonArea, iouRaster, Poly } from "@/lib/data-polygons/shape";
import { publish } from "@/lib/orch/data-bus";
import { recordEdge, recordMsg } from "@/lib/orch/trace";
import { l2Normalize, zWhiten, procrustesAlign } from "@/lib/data-polygons/alignment";

export type EmbeddingSet = { source: string; items: number[][]; labels?: string[] };

export async function fetchEmbeddings(sources: string[]): Promise<EmbeddingSet[]> {
  console.log("🔄 DEBUG: fetchEmbeddings called with:", sources);
  
  // Try Supabase edge function first
  try {
    console.log("🌐 Attempting Supabase edge function...");
    const r1 = await fetch("https://mkgcacuhdwpsfkbguddk.supabase.co/functions/v1/data-polygon-embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sources })
    });
    
    console.log("📡 Supabase response status:", r1.status, r1.statusText);
    
    if (r1.ok) {
      const data = await r1.json();
      console.log("📊 Supabase response data:", data);
      if (Array.isArray(data) && data.every((d:any)=>Array.isArray(d.items) && d.items.length)) {
        console.log("✅ Using real embeddings from Supabase function");
        return data as EmbeddingSet[];
      }
    }
  } catch (error) {
    console.warn("⚠️ Supabase edge function failed:", error);
  }
  
  // Try local API fallback
  try {
    console.log("🏠 Attempting local API fallback...");
    const r2 = await fetch("/api/datapoly/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sources })
    });
    
    console.log("📡 Local API response status:", r2.status, r2.statusText);
    
    if (r2.ok) {
      const result = await r2.json();
      console.log("✅ Using local API synthetic embeddings:", result.length, "sets");
      return result;
    }
  } catch (error) {
    console.warn("⚠️ Local API fallback failed:", error);
  }
  
  // Direct synthetic fallback - no API calls needed
  console.log("🔧 Using direct synthetic fallback...");
  return generateDirectSyntheticEmbeddings(sources);
}

function generateDirectSyntheticEmbeddings(sources: string[]): EmbeddingSet[] {
  function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  function makeBlob(seed: number) {
    const rnd = mulberry32(seed + 4242);
    const center = Array.from({length:5}, (_,i)=> (i+1)*(seed+1)*1.2);
    const n = 160;
    const arr:number[][] = [];
    for (let k=0;k<n;k++){
      const r = center.map(c => c + (rnd()-0.5)*0.9);
      arr.push(r);
    }
    return arr;
  }

  const result = sources.map((source: string, idx: number) => ({
    source,
    items: makeBlob(idx),
    labels: Array.from({length: 160}, (_, i) => `${source}_item_${i}`)
  }));

  console.log("✅ Generated direct synthetic embeddings:", result.length, "sets");
  return result;
}

export async function buildDataPolygons(sources: string[], opts?: { k?: number }) {
  console.log("🔧 buildDataPolygons called with:", sources, "opts:", opts);
  
  const sets = await fetchEmbeddings(sources);
  console.log("📊 Embeddings received:", sets.length, "sets");

  // 1) normalize each source
  const normalized = sets.map(s => ({ ...s, items: l2Normalize(zWhiten(s.items)) }));
  recordEdge("Normalizer","Projection","L2+Z", { sources: normalized.length });
  console.log("🔄 Normalized", normalized.length, "embedding sets");

  // 2) choose reference (first) and Procrustes-align others on anchor pairs (first N shared indices)
  const ref = normalized[0];
  const anchors = Math.min(50, Math.min(...normalized.map(s=>s.items.length)));
  const aligned = normalized.map((s, idx) => {
    if (idx===0) return s;
    const { map } = procrustesAlign(s.items.slice(0,anchors), ref.items.slice(0,anchors));
    const items = s.items.map(map);
    recordEdge(s.source, ref.source, "Procrustes align", { anchors });
    recordMsg({ from: s.source, to: ref.source, topic: "ALIGN", content: { anchors } });
    return { ...s, items };
  });
  console.log("🎯 Aligned", aligned.length, "sets to reference");

  // 3) project to 2D (PCA; swap to UMAP/TSNE if you add APIs)
  const projected = aligned.map(s => ({ source: s.source, pts2d: (s.items[0].length>2 ? pca2d(s.items) : s.items).map(v=>[v[0],v[1]] as [number,number]) }));
  recordEdge("Projection","PolygonBuilder","PCA→2D", { d: aligned[0].items[0].length });
  console.log("📐 Projected to 2D:", projected.length, "sets");

  // 4) concave hulls
  const k = opts?.k ?? 8;
  const hulls: Record<string, Poly> = {};
  for (const s of projected) {
    const hull = concaveHullKNN(s.pts2d, k);
    hulls[s.source] = hull;
    recordEdge(s.source, "PolygonBuilder", "concave hull", { k, area: polygonArea(hull) });
    recordMsg({ from: s.source, to: "PolygonBuilder", topic: "BUILD", content: { k } });
  }
  console.log("🔺 Built concave hulls:", Object.keys(hulls));

  publish({ type: "POLY.DATA.BUILT", payload: { sources, hulls } });
  return hulls;
}

export function comparePolygons(hulls: Record<string, Poly>) {
  const keys = Object.keys(hulls);
  const pairs: Array<{ a:string; b:string; iou:number; jaccard:number }> = [];
  for (let i=0;i<keys.length;i++){
    for (let j=i+1;j<keys.length;j++){
      const a = keys[i], b = keys[j];
      const iou = iouRaster(hulls[a], hulls[b], 512);
      pairs.push({ a, b, iou, jaccard: iou }); // jaccard ≈ iou for this implementation
      recordEdge(a, b, "overlap", { iou });
      recordMsg({ from: a, to: b, topic: "OVERLAP", content: { iou }, confidence: iou });
    }
  }
  publish({ type: "MATCH.DONE", payload: { pairs } });
  return pairs;
}