import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Cpu, Atom } from "lucide-react";
import featureFlags from "@/config/featureFlags";
import type { AppMode } from "@/config/featureFlags";

interface DispatchOptimizerProps {
  mode: AppMode;
}

export default function DispatchOptimizer({ mode }: DispatchOptimizerProps) {
  const f = featureFlags(mode);
  const [solver, setSolver] = useState<"milp" | "qaoa" | "anneal">("milp");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  if (!f.dispatchOptimizer) return null;

  const run = async () => {
    setLoading(true);
    try {
      const body = {
        prices: [0.3, 0.25, 0.5, 0.6, 0.25, 0.2],
        pv: [0, 0.5, 1.2, 0.9, 0.2, 0],
        load: [0.6, 0.7, 0.8, 0.9, 0.6, 0.5],
        constraints: {
          P_ch_max: 5,
          P_dis_max: 5,
          soc_min: 0.1,
          soc_max: 1,
          eta_ch: 0.95,
          eta_dis: 0.95,
          export_cap: 5
        },
        solver
      };

      const r = await fetch("/api/quantum/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await r.json();
      setResult(data);
    } catch (error) {
      console.error("Optimization failed:", error);
      setResult({ error: "Optimization failed" });
    } finally {
      setLoading(false);
    }
  };

  const getSolverIcon = () => {
    switch (solver) {
      case "milp": return <Zap className="w-4 h-4" />;
      case "qaoa": return <Atom className="w-4 h-4" />;
      case "anneal": return <Cpu className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          {getSolverIcon()}
          Dispatch Optimizer
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Optimize battery dispatch using {solver === "milp" ? "classical" : "quantum"} methods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Select value={solver} onValueChange={(value: any) => setSolver(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="milp">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Classical (MILP)
                </div>
              </SelectItem>
              {f.quantumQAOA && (
                <SelectItem value="qaoa">
                  <div className="flex items-center gap-2">
                    <Atom className="w-4 h-4" />
                    Quantum (QAOA)
                  </div>
                </SelectItem>
              )}
              {f.quantumAnneal && (
                <SelectItem value="anneal">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    Annealing
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          
          <Button onClick={run} disabled={loading} className="px-6">
            {loading ? "Running..." : "Optimize"}
          </Button>
        </div>

        {result && (
          <div className="mt-4 p-3 rounded-lg bg-black/20 text-sm">
            <div className="font-medium mb-2 text-foreground">Results:</div>
            <pre className="text-xs text-muted-foreground overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}