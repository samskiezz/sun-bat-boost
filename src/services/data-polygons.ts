import { pca2d } from "@/lib/data-polygons/projection";
import { concaveHullKNN, polygonArea, iouRaster, Poly } from "@/lib/data-polygons/shape";
import { publish } from "@/lib/orch/data-bus";
import { recordEdge, recordMsg } from "@/lib/orch/trace";
import { l2Normalize, zWhiten, procrustesAlign } from "@/lib/data-polygons/alignment";

export type EmbeddingSet = { source: string; items: number[][]; labels?: string[] };

export async function fetchEmbeddings(sources: string[]): Promise<EmbeddingSet[]> {
  console.log("🔄 Fetching REAL embeddings from production database for:", sources);
  
  const res = await fetch("https://mkgcacuhdwpsfkbguddk.supabase.co/functions/v1/data-polygon-embeddings", {
    method: "POST", 
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rZ2NhY3VoZHdwc2ZrYmd1ZGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjIwNzcsImV4cCI6MjA3MTY5ODA3N30.rtp0L8COz3XcmEzGqElLs-d08qHnZDbPr0ZWmyqq8Ms`,
      "Cache-Control": "no-cache"
    },
    body: JSON.stringify({ sources })
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${await res.text()}`);
  
  const result = await res.json();
  console.log("✅ Real embeddings fetched:", result.length, "sets with real data from ml_vectors table");
  return result;
}

export async function buildDataPolygons(sources: string[], opts?: { k?: number }) {
  const sets = await fetchEmbeddings(sources);

  // 1) normalize each source
  const normalized = sets.map(s => ({ ...s, items: l2Normalize(zWhiten(s.items)) }));
  recordEdge("Normalizer","Projection","L2+Z", { sources: normalized.length });

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

  // 3) project to 2D (PCA; swap to UMAP/TSNE if you add APIs)
  const projected = aligned.map(s => ({ source: s.source, pts2d: (s.items[0].length>2 ? pca2d(s.items) : s.items).map(v=>[v[0],v[1]] as [number,number]) }));
  recordEdge("Projection","PolygonBuilder","PCA→2D", { d: aligned[0].items[0].length });

  // 4) concave hulls
  const k = opts?.k ?? 8;
  const hulls: Record<string, Poly> = {};
  for (const s of projected) {
    const hull = concaveHullKNN(s.pts2d, k);
    hulls[s.source] = hull;
    recordEdge(s.source, "PolygonBuilder", "concave hull", { k, area: polygonArea(hull) });
    recordMsg({ from: s.source, to: "PolygonBuilder", topic: "BUILD", content: { k } });
  }

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