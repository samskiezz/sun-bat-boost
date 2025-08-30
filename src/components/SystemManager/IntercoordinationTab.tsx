import * as React from "react";
import { subscribe, getLastPolygon } from "@/lib/orch/event-bus";
import { runPolygonIntercoordination } from "@/services/geoml-orchestrator";

type Node = { id: string; x: number; y: number };
type Edge = { from: string; to: string; label?: string; ts?: number };

const NODES: Node[] = [
  { id: "Polygon", x: 60, y: 120 },
  { id: "Embedder", x: 240, y: 60 },
  { id: "VectorIndex", x: 420, y: 60 },
  { id: "CatalogMatcher", x: 600, y: 60 },
  { id: "TariffRecommender", x: 240, y: 180 },
  { id: "RebateEngine", x: 420, y: 180 },
  { id: "ROIEngine", x: 600, y: 180 },
  { id: "SystemManager", x: 780, y: 120 }
];

export function IntercoordinationTab() {
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [timeline, setTimeline] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [postcode, setPostcode] = React.useState("");

  React.useEffect(() => {
    const unsub = subscribe((e) => {
      const ts = new Date().toLocaleTimeString();
      if (e.type === "EMBED.DONE") {
        setEdges((eds) => [...eds, { from: "Polygon", to: "Embedder", label: "embed", ts: Date.now() }, { from: "Embedder", to: "VectorIndex", label: "upsert", ts: Date.now() }]);
        setTimeline((t) => [`${ts} ▶ Embedder: signature=${(e as any).payload?.signature}`, ...t]);
      }
      if (e.type === "MATCH.DONE") {
        setEdges((eds) => [...eds, { from: "VectorIndex", to: "CatalogMatcher", label: "top-k", ts: Date.now() }]);
        setTimeline((t) => [`${ts} ▶ CatalogMatcher: matches=${(e as any).payload?.matches?.length ?? 0}`, ...t]);
      }
      if (e.type === "TARIFF.MATCHED") {
        setEdges((eds) => [...eds, { from: "TariffRecommender", to: "ROIEngine", label: "plan", ts: Date.now() }]);
        setTimeline((t) => [`${ts} ▶ TariffRecommender: ${(e as any).payload?.provider}`, ...t]);
      }
      if (e.type === "ROI.CALC.DONE") {
        setEdges((eds) => [...eds, { from: "RebateEngine", to: "ROIEngine", label: "rebates", ts: Date.now() }, { from: "ROIEngine", to: "SystemManager", label: "summary", ts: Date.now() }]);
        setTimeline((t) => [`${ts} ▶ ROIEngine: payback=${(e as any).payload?.paybackYears}`, ...t]);
      }
      if (e.type === "ERROR") {
        setTimeline((t) => [`${ts} ✖ ${e.payload.where}: ${e.payload.message}`, ...t]);
      }
    });
    return unsub;
  }, []);

  const run = async () => {
    const poly = getLastPolygon();
    if (!poly) {
      alert("No polygon available. Finish a polygon in the Geo/ML (Polygons) tab first.");
      return;
    }
    setBusy(true);
    try {
      await runPolygonIntercoordination({ points: poly, postcode });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Graph proof */}
      <div className="col-span-2 rounded-2xl border p-3">
        <div className="flex items-center gap-2 mb-3">
          <input placeholder="Postcode (optional)" className="border rounded px-2 py-1" value={postcode} onChange={(e)=>setPostcode(e.target.value)} />
          <button onClick={run} disabled={busy} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Run Intercoordination</button>
          <span className="text-xs text-gray-500">Uses last polygon from Geo/ML (Polygons)</span>
        </div>
        <svg viewBox="0 0 860 240" className="w-full h-[240px] bg-white rounded-lg border">
          {/* edges */}
          {edges.map((e, i) => {
            const from = NODES.find(n => n.id === e.from)!;
            const to = NODES.find(n => n.id === e.to)!;
            return (
              <g key={i}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#4f46e5" strokeWidth="2" markerEnd="url(#arrow)" />
                {e.label && <text x={(from.x+to.x)/2} y={(from.y+to.y)/2 - 6} fontSize="10" fill="#111">{e.label}</text>}
              </g>
            );
          })}
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#4f46e5" />
            </marker>
          </defs>
          {/* nodes */}
          {NODES.map((n) => (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r="18" fill="#111827" />
              <text x={n.x} y={n.y+32} textAnchor="middle" fontSize="11" fill="#111">{n.id}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Timeline & messages */}
      <div className="col-span-1 space-y-3">
        <div className="rounded-2xl border p-3">
          <div className="font-semibold mb-2">Live Timeline</div>
          <ul className="text-xs space-y-1 max-h-[220px] overflow-auto">
            {timeline.map((t, i) => (<li key={i} className="font-mono">{t}</li>))}
          </ul>
        </div>
        <div className="rounded-2xl border p-3">
          <div className="font-semibold mb-2">Model Messages (proof)</div>
          <button
            className="text-xs underline mb-2"
            onClick={async () => {
              const res = await fetch("/api/orch/traces");
              const json = await res.json();
              alert(JSON.stringify(json.messages.slice(-10), null, 2));
            }}
          >View last 10 messages</button>
          <div className="text-xs text-gray-500">Messages show data sharing between models (sender → receiver, topic, content).</div>
        </div>
      </div>
    </div>
  );
}