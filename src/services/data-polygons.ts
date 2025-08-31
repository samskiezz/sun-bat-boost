import { pca2d } from "@/lib/data-polygons/projection";
import { convexHull, area, iou, jaccard, Polygon } from "@/lib/data-polygons/core";
import { publish } from "@/lib/orch/data-bus";
import { recordEdge, recordMsg } from "@/lib/orch/trace";

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

export async function buildDataPolygons(sources: string[]) {
  const sets = await fetchEmbeddings(sources);
  const hulls: Record<string, Polygon> = {};
  
  for (const s of sets) {
    const pts2d = s.items[0].length > 2 ? pca2d(s.items) : s.items.map(v=>[v[0], v[1]]);
    const hull = convexHull(pts2d as any);
    hulls[s.source] = hull;
    recordEdge(s.source, "PolygonBuilder", "convex hull", { area: area(hull) });
    recordMsg({ from: s.source, to: "PolygonBuilder", topic: "BUILD", content: { count: s.items.length } });
  }
  
  publish({ type: "POLY.DATA.BUILT", payload: { sources, hulls } });
  return hulls;
}

export function comparePolygons(hulls: Record<string, Polygon>) {
  const keys = Object.keys(hulls);
  const pairs: Array<{ a: string; b: string; iou: number; jaccard: number }> = [];
  
  for (let i=0; i<keys.length; i++){
    for (let j=i+1; j<keys.length; j++){
      const a = keys[i], b = keys[j];
      const iouVal = iou(hulls[a], hulls[b]);
      pairs.push({ a, b, iou: iouVal, jaccard: iouVal });
      recordEdge(a, b, "overlap", { iou: iouVal });
      recordMsg({ from: a, to: b, topic: "OVERLAP", content: { iou: iouVal }, confidence: 0.9 });
    }
  }
  
  publish({ type: "MATCH.DONE", payload: { pairs } });
  return pairs;
}