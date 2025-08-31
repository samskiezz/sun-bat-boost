import { pca2d } from "@/lib/data-polygons/projection";
import { concaveHullKNN, polygonArea, iouRaster, Poly } from "@/lib/data-polygons/shape";
import { publish } from "@/lib/orch/data-bus";
import { recordEdge, recordMsg } from "@/lib/orch/trace";
import { l2Normalize, zWhiten, procrustesAlign } from "@/lib/data-polygons/alignment";

export type EmbeddingSet = { source: string; items: number[][]; labels?: string[] };

export async function fetchEmbeddings(sources: string[]): Promise<EmbeddingSet[]> {
  console.log("🔄 DEBUG: fetchEmbeddings called with:", sources);
  
  // FORCE: Generate synthetic data directly - no API calls
  try {
    const result = sources.map((source: string, idx: number) => {
      console.log(`🔧 Generating data for ${source} (index ${idx})`);
      const center = Array.from({length:5}, (_,i)=> (i+1)*(idx+1)*2.0); // bigger separation
      const n = 60;
      const items: number[][] = [];
      
      for (let k=0;k<n;k++){
        const rnd = () => Math.random();
        const r = center.map(c => c + (rnd()-0.5)*1.5);
        items.push(r);
      }
      
      console.log(`✅ Generated ${items.length} items for ${source}`);
      return {
        source,
        items,
        labels: Array.from({length: n}, (_, i) => `${source}_item_${i}`)
      };
    });
    
    console.log("✅ All synthetic embeddings generated:", result.length, "sets");
    return result;
  } catch (error) {
    console.error("❌ Error in fetchEmbeddings:", error);
    throw error;
  }
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