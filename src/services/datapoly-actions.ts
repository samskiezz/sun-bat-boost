import { Poly, pointInPolygon, polygonCentroid } from "@/lib/data-polygons/predicates";
import { comparePolygons } from "@/services/data-polygons";
import { recordEdge, recordMsg } from "@/lib/orch/trace";

export type HullMap = Record<string, Poly>;
export type Item = { id: string; vec2d: [number,number]; source: string }; // 2D point + source
export type Link = { a: string; b: string; score: number; reason: "IoU"|"Containment" };
export type Gap = { source: string; region: [number,number]; note: string };
export type Conflict = { a: string; b: string; note: string };
export type Drift = { source: string; fromVer: string; toVer: string; iou: number };

export const actionPolicy = {
  IouLinkMin: 0.35,         // polygons with IoU ≥ create link suggestions
  IouConflictMax: 0.05,     // previously linked but now low overlap → conflict
  ContainmentBoost: 0.15,   // if A mostly inside B, boost link score
};

export function suggestLinks(hulls: HullMap) {
  const pairs = comparePolygons(hulls);
  const links: Link[] = [];
  for (const p of pairs) {
    if (p.iou >= actionPolicy.IouLinkMin) {
      links.push({ a: p.a, b: p.b, score: p.iou, reason: "IoU" });
      recordEdge(p.a, p.b, "link-suggest", { iou: p.iou });
      recordMsg({ from: p.a, to: p.b, topic: "LINK_SUGGEST", content: { iou: p.iou } });
    }
  }
  // containment boost
  const keys = Object.keys(hulls);
  for (const A of keys) for (const B of keys) if (A!==B) {
    const c = polygonCentroid(hulls[A]);
    if (pointInPolygon(c, hulls[B])) {
      const existing = links.find(l => (l.a===A && l.b===B) || (l.a===B && l.b===A));
      if (existing) existing.score = Math.min(1, existing.score + actionPolicy.ContainmentBoost);
      else links.push({ a:A, b:B, score: actionPolicy.ContainmentBoost, reason: "Containment" });
    }
  }
  // sort by score desc
  return links.sort((x,y)=>y.score-x.score);
}

export function findGaps(items: Item[], hulls: HullMap): Gap[] {
  const gaps: Gap[] = [];
  const bySource = new Map<string, Poly>(Object.entries(hulls));
  for (const s of bySource.keys()) {
    const pts = items.filter(i=>i.source===s).map(i=>i.vec2d);
    if (!pts.length) continue;
    // naive: find points outside own hull
    for (const p of pts) {
      if (!pointInPolygon(p, bySource.get(s)!)) {
        gaps.push({ source: s, region: p, note: "Point outside polygon — extend training or re-index" });
      }
    }
  }
  return gaps.slice(0, 200);
}

export function detectConflicts(existingLinks: Link[], newHulls: HullMap, previousHulls: HullMap): Conflict[] {
  const out: Conflict[] = [];
  for (const l of existingLinks) {
    const A = newHulls[l.a], B = newHulls[l.b];
    const PA = previousHulls?.[l.a], PB = previousHulls?.[l.b];
    if (!A || !B || !PA || !PB) continue;
    // very rough: if overlap collapsed between versions, flag
    const now = comparePolygons({[l.a]:A,[l.b]:B})[0]?.iou ?? 0;
    const was = comparePolygons({[l.a]:PA,[l.b]:PB})[0]?.iou ?? 0;
    if (was >= actionPolicy.IouLinkMin && now <= actionPolicy.IouConflictMax) {
      out.push({ a:l.a, b:l.b, note:`Link drifted from ${was.toFixed(2)} → ${now.toFixed(2)}` });
    }
  }
  return out;
}

export function summarizeActions(links: Link[], gaps: Gap[], conflicts: Conflict[]) {
  return {
    createLinks: links.map(l=>({from:l.a, to:l.b, score:+l.score.toFixed(3), reason:l.reason})),
    gaps: gaps.map(g=>({source:g.source, at:g.region})),
    conflicts,
    counts: { links: links.length, gaps: gaps.length, conflicts: conflicts.length }
  };
}