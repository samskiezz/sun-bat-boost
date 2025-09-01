import * as React from "react";

export function DataPolygonActionsPanel({ getPayload }: { getPayload: () => Promise<any> }) {
  const [preview, setPreview] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const onPreview = async () => {
    setBusy(true); setMsg("");
    const payload = await getPayload();
    const res = await fetch("/api/datapoly/actions/preview", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
    setPreview(await res.json()); setBusy(false);
  };
  const onApply = async () => {
    if (!preview) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/datapoly/actions/apply", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(preview) });
    const json = await res.json(); setMsg(`Applied ${json.applied} links`); setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-border p-3 space-y-2 bg-card">
      <div className="font-semibold text-foreground">Actions</div>
      <div className="flex gap-2">
        <button onClick={onPreview} disabled={busy} className="px-3 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50">Preview</button>
        <button onClick={onApply} disabled={busy || !preview} className="px-3 py-2 rounded bg-secondary text-secondary-foreground disabled:opacity-50">Apply</button>
        {msg && <span className="text-xs text-green-600">{msg}</span>}
      </div>
      {preview && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="font-medium mb-1 text-foreground">Create Links ({preview.counts.links})</div>
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