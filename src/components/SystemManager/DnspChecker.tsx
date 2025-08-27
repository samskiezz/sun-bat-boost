import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { publish } from "@/ai/orchestrator/bus";

interface DnspResult {
  state: string;
  postcode: number;
  dnsp_code: string;
  dnsp_name: string;
  overlap_pct: number;
  export_cap_kw: number;
  supports_flexible_export: boolean;
  phase_limit: string;
}

async function resolve(postcode: string, version = "v1"): Promise<DnspResult[]> {
  const { data, error } = await supabase.functions.invoke('dnsps-resolve', {
    body: { postcode: Number(postcode), version }
  });

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "resolve_failed");
  return data.results;
}

export default function DnspChecker() {
  const [postcode, setPostcode] = useState("");
  const [rows, setRows] = useState<DnspResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [version] = useState("v1");
  const { toast } = useToast();

  async function onCheck() {
    setErr("");
    setRows([]);
    setLoading(true);
    
    try {
      const res = await resolve(postcode, version);
      setRows(res);
      
      if (res.length) {
        toast({
          title: "DNSP Found",
          description: `${res[0].dnsp_name} serves postcode ${postcode}`,
        });
        
        publish({
          topic: "plans.lookup",
          filters: { postcode: Number(postcode), meter_type: "TOU" }
        } as any);
      } else {
        toast({
          title: "No DNSP Found",
          description: `No distribution network found for postcode ${postcode}`,
          variant: "destructive",
        });
      }
    } catch (e: any) {
      const errorMsg = e.message || "Error";
      setErr(errorMsg);
      toast({
        title: "Lookup Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
    
    setLoading(false);
  }

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg">DNSP Checker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-sm font-medium">Postcode</label>
            <Input
              value={postcode}
              onChange={e => setPostcode(e.target.value)}
              placeholder="e.g. 2211"
              className="mt-1"
            />
          </div>
          <Button onClick={onCheck} disabled={loading}>
            {loading ? "Checking…" : "Check DNSP"}
          </Button>
        </div>
        
        {err && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-lg">
            {err}
          </div>
        )}
        
        {!!rows.length && (
          <div className="space-y-3">
            {rows.map((r, i) => (
              <Card key={i} className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{r.dnsp_name}</h4>
                      <div className="text-sm text-muted-foreground">
                        {r.dnsp_code} • {r.state}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {(r.overlap_pct * 100).toFixed(1)}% overlap
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Export cap:</span> {r.export_cap_kw} kW
                    </div>
                    <div>
                      <span className="text-muted-foreground">Flexible export:</span> {r.supports_flexible_export ? "Yes" : "No"}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Phase limits:</span> {r.phase_limit}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => publish({
                        topic: "plans.lookup",
                        filters: { postcode: Number(postcode), meter_type: "TOU" }
                      } as any)}
                    >
                      Fetch Plans
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => publish({
                        topic: "rec.sizing",
                        sizing: {
                          export_cap_kw: r.export_cap_kw,
                          flex: r.supports_flexible_export,
                          phase: r.phase_limit
                        }
                      } as any)}
                    >
                      Apply Constraints
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}