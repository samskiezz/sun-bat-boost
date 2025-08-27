import type { WithMeta } from "./contracts";

export function chooseBest<T extends object>(cands: Array<WithMeta<T>>): T {
  if (!cands || !cands.length) throw new Error("no_candidates");
  const sorted = [...cands].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  return sorted[0] as unknown as T;
}