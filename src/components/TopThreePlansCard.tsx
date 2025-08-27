import { useEffect, useState } from "react";
import { RefreshCw, Download } from "lucide-react";
import { publish } from "@/ai/orchestrator/bus";
import type { RetailPlan } from "@/ai/orchestrator/contracts";
import { fetchPlans, exportCSV } from "@/energy/db";
import { rankPlans, type RankContext } from "@/energy/rankPlans";
import { Button } from "@/components/ui/button";

export default function TopThreePlansCard({ context }: { context: RankContext }) {
  const [loading, setLoading] = useState(true);
  const [top, setTop] = useState<any[]>([]);
  
  async function refresh() {
    setLoading(true);
    const list = await fetchPlans(context.state, context.network, context.meter_type);
    const ranked = rankPlans(list, context);
    setTop(ranked);
    setLoading(false);
    publish({ topic:"plan.top3", top: ranked, baseline_cost: context.baseline_cost_aud } as any);
  }
  
  useEffect(() => { 
    refresh(); 
  }, [JSON.stringify(context)]);
  
  if (loading) return (
    <div className="p-4 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl animate-pulse h-40" />
  );
  
  return (
    <div className="p-4 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Top 3 Cheapest Plans</h3>
        <div className="flex items-center gap-2">
          <Button 
            onClick={refresh} 
            variant="ghost" 
            size="sm"
            className="border border-white/20 bg-white/10 hover:bg-white/20"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" 
            size="sm"
            className="border border-white/20 bg-white/10 hover:bg-white/20"
            onClick={() => window.open(`/functions/v1/plan-comparison?ctx=demo`, '_blank')}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid gap-3">
        {top.map((t: any, index) => (
          <div key={t.plan.id} className="p-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-emerald-500' : index === 1 ? 'bg-amber-500' : 'bg-orange-500'
                }`}>
                  {index + 1}
                </div>
                <div className="font-medium">{t.plan.retailer} — {t.plan.plan_name}</div>
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                t.confidence >= 0.8 ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
              }`}>
                {Math.round(t.confidence * 100)}% conf
              </div>
            </div>
            
            <div className="text-sm opacity-80 mb-3">
              Supply {t.plan.supply_c_per_day.toFixed(1)}c/day • FIT {t.plan.fit_c_per_kwh.toFixed(1)}c/kWh
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm">
                Est. annual: <span className="font-semibold text-lg">${t.annual_cost_aud.toFixed(0)}</span>
                <span className={`ml-2 ${
                  t.delta_vs_baseline_aud <= 0 ? "text-emerald-300" : "text-rose-300"
                }`}>
                  ({t.delta_vs_baseline_aud <= 0 ? "save" : "+"}${Math.abs(t.delta_vs_baseline_aud).toFixed(0)}/yr)
                </span>
              </div>
              <Button 
                onClick={() => publish({ topic:"plan.selected", plan: t.plan } as any)} 
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                size="sm"
              >
                Use this plan
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs opacity-70 mt-4 text-center">
        Gov data from Energy Made Easy; estimates based on your usage/PV/battery profile
      </div>
    </div>
  );
}