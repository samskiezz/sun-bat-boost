import { emitSignal } from "./signals";
import type { SignalKey } from "./signals";

export function track<T extends (...args: any) => any>(key: SignalKey, fn: T): T {
  return ((...args: any[]) => {
    const t0 = performance.now();
    try {
      const out = fn(...args);
      const done = (ms: number) => emitSignal({ key, status: "ok", details: { ms } });
      return out instanceof Promise 
        ? out.then(r => { done(performance.now() - t0); return r; })
        : (done(performance.now() - t0), out);
    } catch (e: any) { 
      emitSignal({ key, status: "error", message: e?.message }); 
      throw e; 
    }
  }) as T;
}