import { subscribe } from "@/ai/orchestrator/bus";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

export default function BatteryRoi() {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  
  useEffect(() => { 
    (subscribe as any)("plan.selected", (e: any) => {
      setSelectedPlan(e.plan);
      // Re-simulate ROI with new plan rates
      console.log("Plan selected for ROI analysis:", e.plan);
    }); 
  }, []);
  
  return (
    <div className="grid gap-6">
      <h2 className="text-2xl font-bold">Battery ROI Calculator</h2>
      
      <Card className="p-6 border border-white/20 bg-white/10 backdrop-blur-xl">
        <div className="grid gap-4">
          <div>
            <h3 className="font-semibold mb-2">Selected Retail Plan</h3>
            <div className="text-sm">
              {selectedPlan ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-white/20 bg-white/10">
                  <div>
                    <div className="font-medium">{selectedPlan.retailer} — {selectedPlan.plan_name}</div>
                    <div className="text-xs opacity-80">
                      Supply {selectedPlan.supply_c_per_day}c/day • FIT {selectedPlan.fit_c_per_kwh}c/kWh
                    </div>
                  </div>
                  <div className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">
                    Selected
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-white/20 bg-white/5 text-center opacity-60">
                  No plan selected. Choose from "How much can I save?" tab above.
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Battery System Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl border border-white/20 bg-white/5">
                <div className="text-sm font-medium">Battery Capacity</div>
                <div className="text-xs opacity-80">AI-optimized sizing based on selected plan</div>
              </div>
              <div className="p-3 rounded-xl border border-white/20 bg-white/5">
                <div className="text-sm font-medium">Expected ROI</div>
                <div className="text-xs opacity-80">Analysis includes plan-specific rates</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}