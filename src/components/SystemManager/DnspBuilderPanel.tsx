import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function DnspBuilderPanel() {
  const [version, setVersion] = useState("v1");
  const [status, setStatus] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const { toast } = useToast();

  async function runBuild() {
    setRunning(true);
    setStatus("Building… this computes intersections for all POAs.");
    setProgress("");
    
    try {
      console.log(`Starting DNSP build for version ${version}`);
      
      const { data, error } = await supabase.functions.invoke('dnsps-build-all', {
        body: { version }
      });

      if (error) throw error;

      const result = JSON.stringify(data, null, 2);
      setStatus(result);
      
      if (data?.ok) {
        toast({
          title: "DNSP Build Complete",
          description: `Mapped ${data.mapped} postcodes successfully`,
        });
      } else {
        toast({
          title: "Build Failed",
          description: data?.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      const errorMsg = "Error: " + (e.message || String(e));
      setStatus(errorMsg);
      toast({
        title: "Build Error",
        description: e.message || "Build failed",
        variant: "destructive",
      });
    }
    
    setRunning(false);
  }

  async function checkCoverage() {
    try {
      const { data, error } = await supabase
        .from('dnsps_static')
        .select('version, postcode, dnsp_code')
        .eq('version', version);

      if (error) throw error;

      const totalCount = data?.length || 0;
      const uniquePostcodes = new Set(data?.map(d => d.postcode)).size;
      const dnspBreakdown = data?.reduce((acc: any, d) => {
        acc[d.dnsp_code] = (acc[d.dnsp_code] || 0) + 1;
        return acc;
      }, {});

      setStatus(`Coverage Report for ${version}:
Total records: ${totalCount}
Unique postcodes: ${uniquePostcodes}

DNSP Breakdown:
${Object.entries(dnspBreakdown).map(([dnsp, count]) => `${dnsp}: ${count}`).join('\n')}`);

    } catch (e: any) {
      setStatus("Error checking coverage: " + (e.message || String(e)));
    }
  }

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg">DNSP Builder (ABS POA → DNSP)</CardTitle>
        <CardDescription>
          Upload DNSP GeoJSONs to storage at <code className="bg-muted px-1 rounded">gis/dnsp/*.geojson</code> then run the spatial intersection builder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-sm font-medium">Version</label>
            <Input
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="v1"
              className="mt-1"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            disabled={running} 
            onClick={runBuild}
            variant="default"
            className="flex-1"
          >
            {running ? "Building…" : "Build DNSP Map"}
          </Button>
          <Button 
            onClick={checkCoverage}
            variant="outline"
          >
            Check Coverage
          </Button>
        </div>

        {status && (
          <div className="mt-4">
            <label className="text-sm font-medium">Build Results</label>
            <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded-lg mt-1 max-h-64 overflow-auto">
              {status}
            </pre>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Required DNSP Files:</strong></p>
          <div className="grid grid-cols-2 gap-1 font-mono text-xs">
            <div>AUSGRID.geojson</div>
            <div>ENDEAVOUR.geojson</div>
            <div>ESSENTIAL.geojson</div>
            <div>EVOENERGY.geojson</div>
            <div>ENERGEX.geojson</div>
            <div>ERGON.geojson</div>
            <div>SAPN.geojson</div>
            <div>CITIPOWER.geojson</div>
            <div>POWERCOR.geojson</div>
            <div>UNITED.geojson</div>
            <div>AUSNET.geojson</div>
            <div>TASNETWORKS.geojson</div>
            <div>WESTERN_POWER.geojson</div>
            <div>POWERWATER.geojson</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}