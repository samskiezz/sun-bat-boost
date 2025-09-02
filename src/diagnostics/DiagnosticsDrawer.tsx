import { getSignals, getMissing, getCallCounts } from "./signals";
import { useEffect, useState } from "react";
import type { SignalKey } from "./signals";

const REQUIRED: SignalKey[] = [
  "nasa.poa", "roof.polygon", "shading.horizon", "tariff.selected",
  "dnsp.lookup", "export.cap", "sizing.pv", "sizing.battery", "rebates.calc",
  "compliance.checks", "roi.summary"
];

export default function DiagnosticsDrawer() {
  const [open, setOpen] = useState(false);
  const [signals, setSignals] = useState(getSignals());
  const [calls, setCalls] = useState(getCallCounts());
  
  useEffect(() => {
    const t = setInterval(() => { 
      setSignals(getSignals()); 
      setCalls(getCallCounts()); 
    }, 600);
    return () => clearInterval(t);
  }, []);
  
  const missing = getMissing(REQUIRED);

  return (
    <div className="fixed bottom-3 right-3">
      <button 
        onClick={() => setOpen(v => !v)} 
        className="px-3 py-2 rounded-xl bg-black text-white text-xs hover:bg-black/80 transition-colors"
      >
        {open ? "Close" : "Diagnostics"} • {signals.length} signals • {missing.length} missing
      </button>
      {open && (
        <div className="mt-2 w-[380px] max-h-[70vh] overflow-auto rounded-2xl border bg-white/90 backdrop-blur p-3 text-xs shadow-lg">
          <div className="font-medium mb-2">Model Signals</div>
          {signals.map(s => (
            <div key={s.key} className="border rounded-xl p-2 mb-2">
              <div className="flex justify-between">
                <div className="font-mono">{s.key}</div>
                <span className={{
                  ok: "text-emerald-700",
                  warn: "text-amber-700",
                  error: "text-rose-700",
                  missing: "text-zinc-500"
                }[s.status]}>
                  {s.status.toUpperCase()}
                </span>
              </div>
              {s.message && <div className="mt-1 text-zinc-600">{s.message}</div>}
              {s.details && (
                <pre className="mt-1 bg-black/5 rounded p-2 overflow-auto text-[10px]">
                  {JSON.stringify(s.details, null, 2)}
                </pre>
              )}
              {s.impact?.length ? (
                <ul className="mt-1 list-disc pl-4 text-zinc-700">
                  {s.impact.map((i, idx) => (
                    <li key={idx}>
                      {i.field}: {i.delta > 0 ? "+" : ""}{i.delta}{i.unit ? ` ${i.unit}` : ""} — {i.explanation}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-1 opacity-60 text-[10px]">at {s.atAEST}</div>
            </div>
          ))}
          {missing.length > 0 && (
            <>
              <div className="font-medium mt-2 mb-1">Missing</div>
              <ul className="list-disc pl-4 text-zinc-600">
                {missing.map(k => <li key={k} className="font-mono">{k}</li>)}
              </ul>
            </>
          )}
          <div className="font-medium mt-2 mb-1">Call-rate</div>
          <ul className="list-disc pl-4 text-zinc-600">
            {calls.map(c => <li key={c.key} className="font-mono">{c.key}: {c.count}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}