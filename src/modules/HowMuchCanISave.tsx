import TopThreePlansCard from "@/components/TopThreePlansCard";
import AccuracyToggle from "@/components/AccuracyToggle";

export default function HowMuchCanISave() {
  const context = { 
    postcode: 2211, 
    state: "NSW", 
    network: "Ausgrid", 
    meter_type: "TOU" as const, 
    baseline_cost_aud: 2500 
  };
  
  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">How much can I save?</h2>
        <AccuracyToggle />
      </div>
      
      <TopThreePlansCard context={context} />
      
      <div className="p-4 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl">
        <h3 className="font-semibold mb-3">Quick Savings Calculator</h3>
        <div className="text-sm opacity-80">
          Enter your current electricity bill details above to see personalized savings estimates with solar and battery systems.
        </div>
      </div>
    </div>
  );
}