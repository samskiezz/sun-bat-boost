import { fmtAEST } from "@/utils/timeAEST";

export type SignalKey =
  | "nasa.poa" | "shading.horizon" | "roof.polygon" | "roof.fit"
  | "tariff.load" | "tariff.selected" | "ocr.bill" | "catalog.cec"
  | "dnsp.lookup" | "export.cap" | "sizing.pv" | "sizing.battery"
  | "rebates.calc" | "compliance.checks" | "roi.summary" | "optimizer.dispatch";

export type Signal = {
  key: SignalKey;
  status: "ok" | "warn" | "error" | "missing";
  message?: string;
  details?: Record<string, unknown>;
  impact?: { field: string; delta: number; unit?: string; explanation?: string }[];
  atAEST: string;
};

const _signals = new Map<SignalKey, Signal>();
const _calls = new Map<SignalKey, number>();

// Add reactive subscriptions
type SignalListener = (signal: Signal) => void;
const _listeners = new Set<SignalListener>();

export function emitSignal(s: Omit<Signal, "atAEST">) {
  const rec: Signal = { ...s, atAEST: fmtAEST(new Date()) };
  _signals.set(s.key, rec);
  _calls.set(s.key, (_calls.get(s.key) || 0) + 1);
  
  // Notify all listeners
  _listeners.forEach(listener => {
    try {
      listener(rec);
    } catch (e) {
      console.error('Signal listener error:', e);
    }
  });
}

export function subscribeToSignals(listener: SignalListener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function getSignals() { 
  return Array.from(_signals.values()).sort((a, b) => a.key.localeCompare(b.key)); 
}

export function getMissing(required: SignalKey[]) { 
  return required.filter(k => !_signals.has(k)); 
}

export function getCallCounts() { 
  return Array.from(_calls.entries()).map(([key, count]) => ({ key, count })); 
}