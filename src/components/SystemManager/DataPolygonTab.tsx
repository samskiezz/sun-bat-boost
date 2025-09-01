import * as React from "react";
import { buildDataPolygons, comparePolygons } from "@/services/data-polygons";
import { subscribe } from "@/lib/orch/data-bus";
import { getEdges, getMsgs } from "@/lib/orch/trace";
import { DataPolygonActionsPanel } from "./DataPolygonActionsPanel";

type Poly = [number, number][];
type Hulls = Record<string, Poly>;

const DEFAULT_SOURCES = ["ProductCatalog", "TariffPlans", "VPPPrograms", "TrainingData"];

export function DataPolygonTab() {
  const [sources, setSources] = React.useState<string[]>(DEFAULT_SOURCES);
  const [hulls, setHulls] = React.useState<Hulls>({});
  const [pairs, setPairs] = React.useState<Array<{ a:string; b:string; iou:number }>>([]);
  const [busy, setBusy] = React.useState(false);
  const [k, setK] = React.useState(8);
  const [edges, setEdges] = React.useState(getEdges());
  const [msgs, setMsgs] = React.useState(getMsgs());

  React.useEffect(()=> {
    console.log("🎯 DataPolygonTab subscribing to events...");
    const unsub = subscribe((e) => {
      console.log("🎯 Event received:", e.type, e.payload);
      if (e.type === "POLY.DATA.BUILT") {
        console.log("📊 Setting hulls from event:", Object.keys(e.payload.hulls || {}));
        setHulls(e.payload.hulls as Hulls);
      }
      if (e.type === "MATCH.DONE") {
        console.log("🔗 Setting pairs from event:", e.payload.pairs?.length);
        setPairs(e.payload.pairs as any);
      }
      setEdges(getEdges());
      setMsgs(getMsgs());
    });
    return unsub;
  }, []);

  // Auto-run when component mounts with default sources
  React.useEffect(() => {
    console.log("🚀 Auto-starting polygon build...");
    const autoSources = ["ProductCatalog", "TariffPlans", "VPPPrograms", "TrainingData"];
    setSources(autoSources);
    
    // Auto-run after a short delay to ensure everything is initialized
    setTimeout(() => {
      run(autoSources);
    }, 1000);
  }, []);

  const run = async (runSources?: string[]) => {
    const sourcesToUse = runSources || sources;
    console.log("=== BUTTON CLICKED ===");
    console.log("run function called at:", new Date().toISOString());
    console.log("sources:", sourcesToUse);
    console.log("k:", k);
    console.log("busy:", busy);
    
    setBusy(true);
    console.log("setBusy(true) called");
    
    // Store previous hulls for drift detection
    (window as any).__prevHulls = hulls;
    
    try{
      console.log("Entering try block...");
      
      // Test if imports work
      console.log("Testing imports...");
      console.log("buildDataPolygons type:", typeof buildDataPolygons);
      console.log("comparePolygons type:", typeof comparePolygons);
      
      console.log("About to call buildDataPolygons...");
      const built = await buildDataPolygons(sourcesToUse, { k });
      console.log("buildDataPolygons completed, result:", built);
      
      // Directly update hulls state (don't rely only on events)
      setHulls(built);
      console.log("setHulls called with built result");
      
      console.log("About to call comparePolygons...");
      const results = comparePolygons(built);
      console.log("comparePolygons completed, results:", results);
      
      setPairs(results as any);
      console.log("setPairs called with results");
      
    } catch (error) {
      console.error("=== ERROR IN RUN FUNCTION ===");
      console.error("Error:", error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack available');
      
      // Also show error in UI
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
      
    } finally { 
      console.log("Finally block - setting busy to false");
      setBusy(false); 
    }
    
    console.log("=== RUN FUNCTION COMPLETE ===");
  };

  const toggleSource = (s: string) => {
    setSources(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev, s]);
  };

  const colors: Record<string, string> = {};
  const palette = ["#2563eb","#16a34a","#ea580c","#9333ea","#0ea5e9","#f59e0b","#ef4444"];
  Object.keys(hulls).forEach((k, i)=> colors[k] = palette[i % palette.length]);

  // compute bounds for viewport
  const allPts = Object.values(hulls).flat();
  const minX = Math.min(...allPts.map(p=>p[0]), 0), maxX = Math.max(...allPts.map(p=>p[0]), 1);
  const minY = Math.min(...allPts.map(p=>p[1]), 0), maxY = Math.max(...allPts.map(p=>p[1]), 1);
  const pad = 20;
  const W = 820, H = 480;
  const sx = (x:number)=> pad + (x - minX) * (W - 2*pad) / Math.max(1e-6, (maxX - minX));
  const sy = (y:number)=> H - (pad + (y - minY) * (H - 2*pad) / Math.max(1e-6, (maxY - minY)));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-3">
        <div className="rounded-2xl border p-3 flex flex-wrap gap-2 items-center">
          {DEFAULT_SOURCES.map(s => (
            <label key={s} className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={sources.includes(s)} onChange={()=>toggleSource(s)} />
              {s}
            </label>
          ))}
          <label className="text-sm flex items-center gap-2">
            Concavity k
            <input type="number" min={3} max={25} value={k} onChange={e=>setK(parseInt(e.target.value||"8"))}
                   className="w-16 border rounded px-1 py-0.5" />
          </label>
          <button 
            disabled={busy} 
            onClick={() => {
              console.log("=== BUTTON ONCLICK FIRED ===");
              run();
            }} 
            className="ml-auto px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
          >
            {busy ? "🔄 Processing..." : "🚀 Build Real Polygons"}
          </button>
        </div>

        <div className="rounded-2xl border p-3">
          <div className="text-sm font-medium mb-2">🔄 Real-Time Data Polygons — Production Mode</div>
          <div className="text-xs text-gray-600 mb-2">Using real ML vectors from database • {Object.keys(hulls).length} active models</div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[480px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border">
            {Object.entries(hulls).map(([k, poly]) => (
              <polygon key={k}
                points={poly.map(p=>`${sx(p[0])},${sy(p[1])}`).join(" ")}
                fill={colors[k] + "33"} stroke={colors[k]} strokeWidth={2} />
            ))}
            {Object.keys(hulls).map((k, i)=>(
              <g key={k}>
                <rect x={20} y={20+i*18} width={12} height={12} fill={colors[k]} />
                <text x={38} y={30+i*18} fontSize="12">{k}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="xl:col-span-1 space-y-3">
        <div className="rounded-2xl border p-3">
          <div className="font-semibold mb-2">Overlap Metrics</div>
          <div className="space-y-1 text-sm">
            {pairs.length === 0 ? <div className="text-gray-500 text-sm">Run to compute IoU/Jaccard.</div> :
              pairs.map(p=>(
                <div key={`${p.a}-${p.b}`} className="flex justify-between">
                  <span>{p.a} ↔ {p.b}</span>
                  <span>IoU {p.iou.toFixed(3)}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div className="rounded-2xl border p-3">
          <div className="font-semibold mb-2">Proof: Interconnections</div>
          <div className="text-xs text-gray-600 mb-1">Recent Edges</div>
          <div className="max-h-28 overflow-auto text-xs font-mono">
            {[...edges].sort((a,b)=> a.seq - b.seq).slice(-20).map(e=>(
              <div key={e.id} className="font-mono">{e.seq.toString().padStart(3,"0")} {e.from} → {e.to} :: {e.summary}</div>
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-2 mb-1">Recent Messages</div>
          <div className="max-h-28 overflow-auto text-xs font-mono">
            {[...msgs].sort((a,b)=> a.seq - b.seq).slice(-20).map(m=>(
              <div key={m.id} className="font-mono">{m.seq.toString().padStart(3,"0")} {m.from} ⇒ {m.to} [{m.topic}]</div>
            ))}
          </div>
        </div>

        {/* Actions Panel */}
        <DataPolygonActionsPanel getPayload={async () => ({
          hulls,                               // current hull map
          items: [],                           // (optional) pass 2D items if available
          previousHulls: (window as any).__prevHulls || {},   // stash last run
          existingLinks: (window as any).__existingLinks || [] // preload from DB if you have it
        })} />
      </div>
    </div>
  );
}