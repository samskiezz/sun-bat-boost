import { useQueryPoa } from "@/hooks/useQueryPoa";
import PoaCard from "@/components/roi/PoaCard";
import { WaitingFor } from "@/diagnostics/WaitingFor";
import { emitSignal } from "@/diagnostics/signals";
import { useEffect } from "react";
import { toAEST } from "@/utils/timeAEST";

export default function SamplePoaIntegration() {
  // Sample location: Sydney
  const sydneyLat = -33.8688;
  const sydneyLng = 151.2093;
  
  const startDate = toAEST(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const endDate = toAEST(new Date());
  
  const { data, error, isLoading } = useQueryPoa({
    lat: sydneyLat,
    lng: sydneyLng,
    tilt: 20,
    azimuth: 0,
    start: startDate.toISOString().split("T")[0],
    end: endDate.toISOString().split("T")[0]
  });

  // Emit signal when POA data loads
  useEffect(() => {
    if (data?.daily) {
      const daily = data.daily;
      const avg = daily.length ? daily.reduce((s, d) => s + d.poa_kwh, 0) / daily.length : 0;
      
      emitSignal({
        key: "nasa.poa",
        status: daily.length ? "ok" : "warn",
        message: daily.length ? `Loaded ${daily.length} days of POA data` : "No POA data available",
        details: { days: daily.length, avg_poa_kwh: avg, source: data.meta.source },
        impact: [{
          field: "annualSavings",
          delta: Math.round(avg * 365),
          unit: "kWh",
          explanation: "POA physics replacing solar estimate"
        }]
      });
    }
    
    if (error) {
      emitSignal({
        key: "nasa.poa",
        status: "error",
        message: error.message
      });
    }
  }, [data, error]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium">NASA POA Integration</div>
        <WaitingFor deps={["nasa.poa"]} />
        <div className="animate-pulse bg-muted h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">NASA POA Integration</div>
      <WaitingFor deps={["nasa.poa", "roof.polygon"]} />
      <PoaCard daily={data?.daily} />
      
      {error && (
        <div className="p-3 bg-rose-50 text-rose-900 rounded-xl border border-rose-200 text-sm">
          Error loading POA data: {error.message}
        </div>
      )}
    </div>
  );
}