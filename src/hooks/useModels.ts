// Single source of truth hooks for model predictions
import { useQuery } from "@tanstack/react-query";
import { predict, type ROIInput, type BatteryROIInput, type ForecastInput } from "@/lib/modelClient";
import { useMemo } from "react";

// Debounced input processing
function useStableInput<T>(input: T, delay: number = 500): T {
  return useMemo(() => input, [JSON.stringify(input)]);
}

// Solar ROI prediction hook
export function useSolarROI(input: ROIInput) {
  const stableInput = useStableInput(input);
  
  return useQuery({
    queryKey: ["solar_roi", stableInput],
    queryFn: () => predict("solar_roi", stableInput),
    staleTime: 60_000, // 1 minute cache
    refetchOnWindowFocus: false,
    enabled: Boolean(
      stableInput.usage_30min?.length > 0 && 
      stableInput.tariff?.import?.length > 0
    ),
  });
}

// Battery ROI prediction hook  
export function useBatteryROI(input: BatteryROIInput) {
  const stableInput = useStableInput(input);
  
  return useQuery({
    queryKey: ["battery_roi", stableInput],
    queryFn: () => predict("battery_roi", stableInput),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: Boolean(
      stableInput.usage_30min?.length > 0 &&
      stableInput.battery_params?.capacity > 0 &&
      stableInput.tariff?.import?.length > 0
    ),
  });
}

// Forecast prediction hook
export function useForecast(input: ForecastInput) {
  const stableInput = useStableInput(input);
  
  return useQuery({
    queryKey: ["forecast", stableInput],
    queryFn: () => predict("forecast", stableInput),
    staleTime: 10 * 60_000, // 10 minute cache for forecasts
    refetchOnWindowFocus: false,
    enabled: Boolean(stableInput.usage_30min?.length > 0),
  });
}

// Combined predictions for comprehensive analysis
export function useComprehensiveAnalysis(
  roiInput: ROIInput,
  batteryInput: BatteryROIInput,
  forecastInput: ForecastInput
) {
  const solarROI = useSolarROI(roiInput);
  const batteryROI = useBatteryROI(batteryInput);
  const forecast = useForecast(forecastInput);
  
  const isLoading = solarROI.isLoading || batteryROI.isLoading || forecast.isLoading;
  const hasError = solarROI.isError || batteryROI.isError || forecast.isError;
  
  const combinedData = useMemo(() => {
    if (!solarROI.data || !batteryROI.data || !forecast.data) return null;
    
    return {
      solar: solarROI.data,
      battery: batteryROI.data,
      forecast: forecast.data,
      combined: {
        total_savings: 
          (solarROI.data.value.annual_savings_AUD || 0) + 
          (batteryROI.data.value.annual_savings_AUD || 0),
        confidence_score: Math.min(
          solarROI.data.conf.p50,
          batteryROI.data.conf.p50,
          forecast.data.conf.p50
        ),
        model_versions: {
          solar: solarROI.data.version,
          battery: batteryROI.data.version,
          forecast: forecast.data.version
        }
      }
    };
  }, [solarROI.data, batteryROI.data, forecast.data]);
  
  return {
    data: combinedData,
    isLoading,
    hasError,
    refetch: () => {
      solarROI.refetch();
      batteryROI.refetch(); 
      forecast.refetch();
    }
  };
}

// Utility hook for model health and telemetry
export function useModelTelemetry() {
  return useQuery({
    queryKey: ["model_telemetry"],
    queryFn: async () => {
      const { getServiceStatus } = await import("@/lib/modelClient");
      return getServiceStatus();
    },
    refetchInterval: 30_000, // Check every 30 seconds
    staleTime: 15_000,
  });
}