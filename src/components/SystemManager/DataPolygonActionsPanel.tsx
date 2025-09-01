import * as React from "react";
import { suggestLinks, findGaps, detectConflicts, summarizeActions } from "@/services/datapoly-actions";

export function DataPolygonActionsPanel({ getPayload }: { getPayload: () => Promise<any> }) {
  const [preview, setPreview] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const runPreview = async () => {
    setBusy(true); setMsg("");
    try {
      const payload = await getPayload();
      const links = suggestLinks(payload.hulls);
      const gaps = findGaps(payload.items || [], payload.hulls);
      const conflicts = detectConflicts(payload.existingLinks || [], payload.hulls, payload.previousHulls || {});
      const result = summarizeActions(links, gaps, conflicts);
      setPreview(result);
      
      // Auto-apply if there are links to create
      if (result.createLinks?.length > 0) {
        console.log("🚀 Auto-applying", result.createLinks.length, "links");
        await runApply(result);
      }
    } catch (error) {
      setMsg(`❌ Preview Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const runApply = async (previewData?: any) => {
    const dataToApply = previewData || preview;
    if (!dataToApply) return;
    
    console.log("🚀 runApply called with:", dataToApply);
    
    try {
      // Try API route first
      console.log("📡 Attempting API route for apply...");
      const res = await fetch("/api/datapoly-actions-apply", {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(dataToApply)
      });
      
      console.log("📡 Apply API response status:", res.status, res.statusText);
      
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("application/json")) {
        const result = await res.json();
        const applied = result.applied || 0;
        
        setMsg(`✅ Applied ${applied} links to database`);
        return;
      } else {
        console.warn("⚠️ Apply API failed, trying direct Supabase...");
      }
    } catch (error) {
      console.warn("⚠️ Apply API route failed:", error);
    }
    
    // Direct Supabase fallback
    try {
      console.log("🔗 Attempting direct Supabase insert...");
      const links = dataToApply?.createLinks || [];
      
      if (links.length > 0) {
        const { supabase } = await import("@/integrations/supabase/client");
        
        const rows = links.map((l: any) => ({ 
          source_a: l.from, 
          source_b: l.to, 
          score: l.score, 
          reason: l.reason 
        }));
        
        console.log("💾 Inserting rows to Supabase:", rows);
        const { error } = await supabase.from("links").insert(rows);
        
        if (error) {
          console.error("❌ Supabase insert error:", error);
          throw error;
        }
        
        console.log("✅ Direct Supabase insert successful");
        setMsg(`✅ Applied ${links.length} links to database`);
      } else {
        console.log("ℹ️ No links to apply");
        setMsg("ℹ️ No links to apply");
      }
    } catch (error) {
      console.error("❌ Direct Supabase apply failed:", error);
      setMsg(`❌ Apply failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Auto-run when the component mounts or data changes
  React.useEffect(() => {
    const autoRun = async () => {
      try {
        const payload = await getPayload();
        if (Object.keys(payload.hulls || {}).length > 0) {
          console.log("🎯 Auto-running preview with hulls:", Object.keys(payload.hulls));
          runPreview();
        }
      } catch (error) {
        console.warn("Auto-run failed:", error);
      }
    };
    autoRun();
  }, [getPayload]);

  return (
    <div className="rounded-2xl border border-border p-3 space-y-2 bg-card">
      <div className="font-semibold text-foreground flex items-center justify-between">
        <span>🤖 Automatic Actions</span>
        <div className="flex items-center gap-2">
          {busy && <span className="text-xs text-muted-foreground">⏳ Processing...</span>}
          {msg && <span className="text-xs font-medium">{msg}</span>}
        </div>
      </div>
      
      {preview && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="font-medium mb-1 text-foreground">Created Links ({preview.counts?.links || 0})</div>
            <ul className="space-y-1 max-h-40 overflow-auto">
              {(preview.createLinks || []).map((l:any, i:number)=>(
                <li key={i} className="text-foreground">{l.from} ↔ {l.to} — {l.score} <span className="text-xs text-muted-foreground">({l.reason})</span></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium mb-1 text-foreground">
              Gaps ({preview.counts?.gaps ?? (preview.gaps?.length ?? 0)})
            </div>
            <ul className="space-y-1 max-h-40 overflow-auto">
              {(preview.gaps || []).map((g: any, i: number) => (
                <li key={i} className="text-foreground">
                  {String(g.source)} @ [
                  {Array.isArray(g.at) && g.at.length >= 2
                    ? `${Number(g.at[0]).toFixed(2)}, ${Number(g.at[1]).toFixed(2)}`
                    : "?, ?"}
                  ]
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium mb-1 text-foreground">
              Conflicts ({preview.counts?.conflicts ?? (preview.conflicts?.length ?? 0)})
            </div>
            <ul className="space-y-1 max-h-40 overflow-auto">
              {(preview.conflicts || []).map((c: any, i: number) => (
                <li key={i} className="text-foreground">
                  {String(c.a)} ↔ {String(c.b)} — {String(c.note ?? "")}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}