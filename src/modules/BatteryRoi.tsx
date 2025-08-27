import { subscribe } from "@/ai/orchestrator/bus";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Battery, DollarSign, TrendingUp, Zap } from "lucide-react";

export default function BatteryRoi() {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [scenario, setScenario] = useState<any>(null);
  
  useEffect(() => { 
    // Listen for plan selections
    const unsubscribePlan = (subscribe as any)("plan.selected", (e: any) => setSelectedPlan(e.plan)); 
    
    // Listen for savings scenarios
    const unsubscribeScenario = (subscribe as any)("savings.scenario", (e: any) => setScenario(e.scenario));
    
    return () => {
      unsubscribePlan?.();
      unsubscribeScenario?.();
    };
  }, []);
  
  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3">
        <Battery className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Battery ROI Calculator</h2>
          <p className="text-sm opacity-80">Analyze battery investment returns based on your savings scenario</p>
        </div>
      </div>

      {/* Scenario Summary */}
      {scenario && (
        <Card className="p-6 border border-white/20 bg-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Applied Scenario
            </h3>
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300">
              From Savings Wizard
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-xl border border-white/20 bg-white/10">
              <div className="text-sm font-medium">Recommended Solar</div>
              <div className="text-lg font-bold text-primary">{scenario.recommendations?.pvSize || 'N/A'} kW</div>
            </div>
            <div className="p-3 rounded-xl border border-white/20 bg-white/10">
              <div className="text-sm font-medium">Recommended Battery</div>
              <div className="text-lg font-bold text-primary">{scenario.recommendations?.batterySize || 'N/A'} kWh</div>
            </div>
            <div className="p-3 rounded-xl border border-white/20 bg-white/10">
              <div className="text-sm font-medium">Annual Savings</div>
              <div className="text-lg font-bold text-emerald-400">${scenario.results?.annualSavings || 'N/A'}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Selected Plan */}
      <Card className="p-6 border border-white/20 bg-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold">Selected Retail Plan</h3>
        </div>
        
        {selectedPlan ? (
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/20 bg-white/10">
            <div>
              <div className="font-medium">{selectedPlan.retailer} — {selectedPlan.plan_name}</div>
              <div className="text-sm opacity-80">
                Supply {selectedPlan.supply_c_per_day}c/day • FIT {selectedPlan.fit_c_per_kwh}c/kWh
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300">
              Selected
            </Badge>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-white/20 bg-white/5 text-center opacity-60">
            <p>No plan selected. Choose from "How much can I save?" tab above.</p>
          </div>
        )}
      </Card>

      {/* ROI Analysis */}
      <Card className="p-6 border border-white/20 bg-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold">Battery ROI Analysis</h3>
        </div>

        {scenario ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-white/20 bg-white/10">
              <div className="text-sm font-medium text-muted-foreground">Payback Period</div>
              <div className="text-2xl font-bold text-primary">{scenario.results?.paybackYears || 'N/A'} years</div>
            </div>
            <div className="p-4 rounded-xl border border-white/20 bg-white/10">
              <div className="text-sm font-medium text-muted-foreground">Net Present Value</div>
              <div className="text-2xl font-bold text-emerald-400">${scenario.results?.npv?.toLocaleString() || 'N/A'}</div>
            </div>
            <div className="p-4 rounded-xl border border-white/20 bg-white/10">
              <div className="text-sm font-medium text-muted-foreground">Internal Rate of Return</div>
              <div className="text-2xl font-bold text-amber-400">{scenario.results?.irr || 'N/A'}%</div>
            </div>
            <div className="p-4 rounded-xl border border-white/20 bg-white/10">
              <div className="text-sm font-medium text-muted-foreground">Battery Cycles/Year</div>
              <div className="text-2xl font-bold text-purple-400">{scenario.results?.batteryCycles || 'N/A'}</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 opacity-60">
            <Battery className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Complete the savings wizard to see detailed ROI analysis</p>
            <Button 
              variant="outline" 
              className="mt-3 border-white/20 bg-white/10 hover:bg-white/20"
              onClick={() => {
                // This would switch back to savings tab - parent component would handle
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'savings' } }));
              }}
            >
              Go to Savings Wizard
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}