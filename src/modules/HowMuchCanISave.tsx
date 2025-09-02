import { Glass } from "@/components/Glass";
import { SavingsWizard } from "@/components/SavingsWizard";
import SamplePoaIntegration from "@/components/SamplePoaIntegration";
import SampleOptimizerIntegration from "@/components/SampleOptimizerIntegration";
import featureFlags, { type AppMode } from "@/config/featureFlags";
import { useState } from "react";

export default function HowMuchCanISave() {
  const [appMode] = useState<AppMode>(() => (localStorage.getItem("appMode") as AppMode) || "lite");
  const flags = featureFlags(appMode);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Glass className="h-full">
          <SavingsWizard />
        </Glass>
      </div>
      
      <div className="space-y-6">
        {flags.poaPhysics && (
          <Glass>
            <SamplePoaIntegration />
          </Glass>
        )}
        
        {flags.dispatchOptimizer && (
          <Glass>
            <SampleOptimizerIntegration />
          </Glass>
        )}
        
        <Glass>
          <div className="text-sm font-medium mb-3">Quick Stats</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="opacity-80">Mode</span>
              <span className="font-medium">{appMode.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">POA Physics</span>
              <span className={flags.poaPhysics ? "text-emerald-600" : "opacity-60"}>
                {flags.poaPhysics ? "Enabled" : "Lite Mode"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Diagnostics</span>
              <span className={flags.diagnostics ? "text-emerald-600" : "opacity-60"}>
                {flags.diagnostics ? "Active" : "Hidden"}
              </span>
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
}