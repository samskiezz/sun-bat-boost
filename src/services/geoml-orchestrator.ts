import { publish } from "@/lib/orch/event-bus";
import { recordEdge, recordMessage } from "@/lib/orch/trace";
import { embedPolygon, matchPolygon } from "@/services/geoml-client";

type LatLng = [number, number];

export async function runPolygonIntercoordination(params: {
  siteId?: string;
  points: LatLng[];
  postcode?: string;
}) {
  const { siteId, points, postcode } = params;

  // 1) Embed polygon → publish + trace
  const embedRes = await embedPolygon({ points }).catch((e) => ({ error: e?.message }));
  if ("error" in embedRes) {
    publish({ type: "ERROR", payload: { where: "EMBED", message: embedRes.error } });
    recordEdge("Polygon", "Embedder", "Embed failed", { error: embedRes.error });
    return;
  }
  publish({ type: "EMBED.DONE", payload: { signature: embedRes.signature, dim: (embedRes.embedding?.length ?? 0), meta: embedRes.features } });
  recordEdge("Polygon", "Embedder", "Polygon embedded", { signature: embedRes.signature });
  recordMessage({ from: "Embedder", to: "VectorIndex", topic: "UPSERT", content: { signature: embedRes.signature } });

  // 2) Match polygon against vector index/catalog
  const matchRes = await matchPolygon({ points }).catch((e) => ({ matches: [] as any[] }));
  publish({ type: "MATCH.DONE", payload: { matches: matchRes.matches || [] } });
  recordEdge("VectorIndex", "CatalogMatcher", "Top-K matches", { k: matchRes.matches?.length || 0 });
  recordMessage({ from: "CatalogMatcher", to: "DesignValidator", topic: "CANDIDATES", content: matchRes.matches, confidence: 0.9 });

  // 3) Tariff/VPP lookups (use postcode if provided)
  let tariff: { planId: string; provider: string } | null = null;
  if (postcode) {
    const t = await fetchTariffsByPostcode(postcode).catch(() => null);
    if (t) {
      tariff = { planId: t.planId, provider: t.provider };
      publish({ type: "TARIFF.MATCHED", payload: tariff });
      recordEdge("TariffRecommender", "ROIEngine", "Tariff selected", tariff);
      recordMessage({ from: "TariffRecommender", to: "ROIEngine", topic: "PLAN", content: tariff });
    }
  }

  // 4) Rebates + ROI (stub summary)
  const rebates = await applyAllRebates({ postcode }).catch(() => ({ total: 0 }));
  const roi = { paybackYears: 5.8, annualSavings: 2100 }; // stubbed; replace with real
  publish({ type: "ROI.CALC.DONE", payload: roi });
  recordEdge("RebateEngine", "ROIEngine", "Rebates applied", rebates);
  recordEdge("ROIEngine", "SystemManager", "ROI summary", roi);
  recordMessage({ from: "ROIEngine", to: "SystemManager", topic: "SUMMARY", content: { tariff, rebates, roi }, confidence: 0.95 });

  return { matches: matchRes.matches, tariff, rebates, roi };
}

// Light stubs if clients are missing
export async function fetchTariffsByPostcode(postcode: string) {
  return { planId: `plan-${postcode}`, provider: "Demo Energy" };
}
export async function applyAllRebates(_ctx: any) {
  return { total: 1500, programs: ["NSW-VPP", "STC"] };
}