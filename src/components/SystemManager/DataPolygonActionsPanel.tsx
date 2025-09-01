import * as React from "react";
import { toast } from "@/hooks/use-toast";

export function DataPolygonActionsPanel({ getPayload }: { getPayload: () => Promise<any> }) {
  const [preview, setPreview] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const runPreview = async () => {
    setBusy(true); setMsg("");
    try {
      const payload = await getPayload();
      const res = await fetch("/api/datapoly-actions-preview", { 
        method:"POST", 
        headers:{ "Content-Type":"application/json" }, 
        body: JSON.stringify(payload) 
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setPreview(result);
      
      // Auto-apply if there are links to create
      if (result.createLinks?.length > 0) {
        await runApply(result);
      }
    } catch (error) {
      toast({
        title: "Preview Error",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setBusy(false);
    }
  };

  const runApply = async (previewData?: any) => {
    const dataToApply = previewData || preview;
    if (!dataToApply) return;
    
    try {
      const res = await fetch("/api/datapoly-actions-apply", { 
        method:"POST", 
        headers:{ "Content-Type":"application/json" }, 
        body: JSON.stringify(dataToApply) 
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      
      setMsg(`✅ Applied ${json.applied} links automatically`);
      toast({
        title: "Links Applied",
        description: `Successfully applied ${json.applied} data links`,
      });
    } catch (error) {
      toast({
        title: "Apply Error", 
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  };

  // Auto-run preview when component receives new data
  React.useEffect(() => {
    const autoRun = async () => {
      const payload = await getPayload();
      if (Object.keys(payload.hulls || {}).length > 0) {
        runPreview();
      }
    };
    autoRun();
  }, [getPayload]);

  return (
    <div className="rounded-2xl border border-border p-3 space-y-2 bg-card">
      <div className="font-semibold text-foreground flex items-center justify-between">
        <span>🤖 Automatic Actions</span>
        {busy && <span className="text-xs text-muted-foreground">Processing...</span>}
      </div>
      {msg && <div className="text-xs text-green-600 font-medium">{msg}</div>}
      
      {preview && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="font-medium mb-1 text-foreground">Created Links ({preview.counts.links})</div>
            <ul className="space-y-1 max-h-40 overflow-auto">
              {preview.createLinks.map((l:any, i:number)=>(
                <li key={i} className="text-foreground">{l.from} ↔ {l.to} — {l.score} <span className="text-xs text-muted-foreground">({l.reason})</span></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium mb-1 text-foreground">Gaps ({preview.counts.gaps})</div>
            <ul className="space-y-1 max-h-40 overflow-auto">
              {preview.gaps.map((g:any, i:number)=>(<li key={i} className="text-foreground">{g.source} @ [{g.at[0].toFixed(2)}, {g.at[1].toFixed(2)}]</li>))}
            </ul>
          </div>
          <div>
            <div className="font-medium mb-1 text-foreground">Conflicts ({preview.counts.conflicts})</div>
            <ul className="space-y-1 max-h-40 overflow-auto">
              {preview.conflicts.map((c:any, i:number)=>(<li key={i} className="text-foreground">{c.a} ↔ {c.b} — {c.note}</li>))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}