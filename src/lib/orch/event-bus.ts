export type OrchestratorEvent =
  | { type: "POLY.FINISHED"; payload: { siteId?: string; points: [number, number][] } }
  | { type: "EMBED.DONE"; payload: { signature: string; dim: number; meta?: any } }
  | { type: "MATCH.DONE"; payload: { matches: Array<{ id: string; score: number; label?: string }> } }
  | { type: "TARIFF.MATCHED"; payload: { planId: string; provider: string } }
  | { type: "VPP.MATCHED"; payload: { planId: string; provider: string } }
  | { type: "ROI.CALC.DONE"; payload: { paybackYears: number; annualSavings: number } }
  | { type: "ERROR"; payload: { where: string; message: string } };

type Handler = (e: OrchestratorEvent) => void;

const subs = new Set<Handler>();
let lastPolygon: [number, number][] | null = null;

export function publish(e: OrchestratorEvent) {
  for (const h of subs) try { h(e); } catch {}
}

export function subscribe(h: Handler) {
  subs.add(h);
  return () => { subs.delete(h); };
}

export function setLastPolygon(points: [number, number][]) {
  lastPolygon = points;
  publish({ type: "POLY.FINISHED", payload: { points } });
}

export function getLastPolygon() {
  return lastPolygon;
}