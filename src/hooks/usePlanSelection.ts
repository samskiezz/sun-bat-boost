// Hook for handling plan selection across components
import { useEffect, useState } from "react";
import { subscribe } from "@/ai/orchestrator/bus";
import type { RetailPlan } from "@/ai/orchestrator/contracts";

export function usePlanSelection() {
  const [selectedPlan, setSelectedPlan] = useState<RetailPlan | null>(null);

  useEffect(() => {
    subscribe("plan.selected", (event: any) => {
      if (event.plan) {
        setSelectedPlan(event.plan);
      }
    });
  }, []);

  return { selectedPlan };
}