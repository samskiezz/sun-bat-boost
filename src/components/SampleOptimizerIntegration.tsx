import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitSignal } from "@/diagnostics/signals";
import { Button } from "@/components/ui/button";
import { WaitingFor } from "@/diagnostics/WaitingFor";

export default function SampleOptimizerIntegration() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runOptimizer = async (solver: "milp" | "qaoa" | "anneal") => {
    setLoading(true);
    try {
      // Sample data for 24 hours
      const prices = Array.from({ length: 24 }, (_, i) => 0.25 + Math.sin(i / 4) * 0.1);
      const pv = Array.from({ length: 24 }, (_, i) => Math.max(0, Math.sin((i - 6) / 6 * Math.PI) * 5));
      const load = Array.from({ length: 24 }, () => 2 + Math.random());
      
      const { data, error } = await supabase.functions.invoke('quantum-dispatch', {
        body: {
          prices,
          pv,
          load,
          constraints: {
            battery_capacity_kwh: 10,
            battery_power_kw: 5,
            initial_soc: 0.5
          },
          solver
        }
      });

      if (error) throw error;

      setResult(data);
      
      // Calculate cost savings
      const baselineCost = prices.reduce((sum, price, i) => sum + price * Math.max(0, load[i] - pv[i]), 0);
      const optimizedCost = data.metadata?.objective || baselineCost;
      
      emitSignal({
        key: "optimizer.dispatch",
        status: "ok",
        message: `${solver.toUpperCase()} optimization completed`,
        details: { 
          solver, 
          horizon: prices.length, 
          baseline_cost: baselineCost,
          optimized_cost: optimizedCost,
          execution_time_ms: data.metadata?.execution_time
        },
        impact: [{
          field: "dailyCost",
          delta: -(baselineCost - optimizedCost),
          unit: "$",
          explanation: `${solver.toUpperCase()} dispatch vs baseline`
        }]
      });
      
    } catch (error: any) {
      emitSignal({
        key: "optimizer.dispatch",
        status: "error",
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Quantum Optimizer Integration</div>
      <WaitingFor deps={["optimizer.dispatch", "sizing.battery"]} />
      
      <div className="flex gap-2">
        <Button 
          onClick={() => runOptimizer("milp")} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          Run MILP
        </Button>
        <Button 
          onClick={() => runOptimizer("qaoa")} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          Run QAOA
        </Button>
        <Button 
          onClick={() => runOptimizer("anneal")} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          Run Annealing
        </Button>
      </div>

      {loading && (
        <div className="animate-pulse bg-muted h-32 rounded-xl" />
      )}

      {result && (
        <div className="p-4 bg-white/70 rounded-xl border">
          <div className="text-sm font-medium mb-2">Optimization Result</div>
          <pre className="text-xs bg-black/5 p-2 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}