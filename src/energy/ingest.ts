// AER PRD Data Ingestion Service
// Orchestrates fetching, normalizing, and storing energy plan data

import { fetchAllGenericPlans } from "./aerClient";
import { planToRetailPlan } from "./aerNormalize";
import { supabase } from "@/integrations/supabase/client";
import type { RetailPlan } from "@/ai/orchestrator/contracts";

export interface IngestOptions {
  state?: string;
  postcode?: string;
  forceRefresh?: boolean;
  batchSize?: number;
}

export interface IngestResult {
  success: boolean;
  totalFetched: number;
  totalNormalized: number;
  totalUpserted: number;
  errors: string[];
  duration: number;
}

export async function refreshEnergyPlans(options: IngestOptions = {}): Promise<IngestResult> {
  const startTime = Date.now();
  let totalCount = 0;
  let successCount = 0;
  const errors: string[] = [];

  try {
    console.log('Starting energy plans refresh...', options);

    // Clean up old data if force refresh
    if (options.forceRefresh) {
      console.log('Force refresh - cleaning old data...');
      const { error: deleteError } = await supabase
        .from('energy_plans')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except impossible match
      
      if (deleteError) {
        console.warn('Error cleaning old data:', deleteError);
        errors.push(`Cleanup error: ${deleteError.message}`);
      }
    }

    // Fetch raw data from AER PRD
    console.log('Fetching data from AER PRD...');
    const rawPlans = await fetchAllGenericPlans({
      state: options.state,
      postcode: options.postcode,
      fuelType: "ELECTRICITY",
      type: "ALL",
      effective: "CURRENT"
    });

    console.log(`Fetched ${rawPlans.length} raw plans from AER`);
    totalCount = rawPlans.length;

    // Normalize plans
    console.log('Normalizing plans...');
    const normalizedPlans: RetailPlan[] = [];
    
    for (const rawPlan of rawPlans) {
      try {
        const normalized = planToRetailPlan(rawPlan);
        if (normalized) {
          normalizedPlans.push(normalized);
        }
      } catch (error) {
        errors.push(`Normalization error for plan ${rawPlan.id || 'unknown'}: ${error}`);
      }
    }

    console.log(`Normalized ${normalizedPlans.length} plans`);

    // Batch upsert to database
    const batchSize = options.batchSize || 100;
    let processedCount = 0;

    for (let i = 0; i < normalizedPlans.length; i += batchSize) {
      const batch = normalizedPlans.slice(i, i + batchSize);
      
      try {
        // Convert to database format
        const dbPlans = batch.map(plan => ({
          id: plan.id,
          retailer: plan.retailer,
          plan_name: plan.plan_name,
          state: plan.state,
          network: plan.network,
          meter_type: plan.meter_type,
          supply_c_per_day: plan.supply_c_per_day,
          usage_c_per_kwh_peak: plan.usage_c_per_kwh_peak,
          usage_c_per_kwh_shoulder: plan.usage_c_per_kwh_shoulder,
          usage_c_per_kwh_offpeak: plan.usage_c_per_kwh_offpeak,
          fit_c_per_kwh: plan.fit_c_per_kwh || 0,
          demand_c_per_kw: plan.demand_c_per_kw,
          controlled_c_per_kwh: plan.controlled_c_per_kwh,
          tou_windows: plan.tou_windows || [],
          effective_from: plan.effective_from || new Date().toISOString(),
          effective_to: plan.effective_to,
          source: plan.source || "AER_PRD",
          hash: plan.hash || `${plan.id}-${Date.now()}`,
          last_refreshed: new Date().toISOString()
        }));

        const { error: upsertError } = await supabase
          .from('energy_plans')
          .upsert(dbPlans, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          throw upsertError;
        }

        processedCount += batch.length;
        successCount += batch.length;
        
        console.log(`Processed batch ${Math.ceil((i + batchSize) / batchSize)} of ${Math.ceil(normalizedPlans.length / batchSize)}`);
        
      } catch (error) {
        console.error(`Batch upsert error for batch starting at ${i}:`, error);
        errors.push(`Batch ${i}-${i + batchSize}: ${error}`);
      }
    }

    const duration = Date.now() - startTime;
    const result: IngestResult = {
      success: errors.length === 0,
      totalFetched: totalCount,
      totalNormalized: normalizedPlans.length,
      totalUpserted: successCount,
      errors,
      duration: Math.round(duration / 1000)
    };

    console.log('Energy plans refresh completed:', result);
    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Energy plans refresh failed:', error);
    
    return {
      success: false,
      totalFetched: totalCount,
      totalNormalized: 0,
      totalUpserted: successCount,
      errors: [...errors, `Fatal error: ${error}`],
      duration: Math.round(duration / 1000)
    };
  }
}

// Get fresh plans for a specific context (used by calculators)
export async function getFreshPlans(state: string, network?: string, meterType?: string, postcode?: string) {
  // First, refresh data for this specific context
  const refreshResult = await refreshEnergyPlans({ state, postcode });
  
  if (!refreshResult.success) {
    console.warn("Plan refresh failed, using cached data:", refreshResult.errors);
  }

  // Then query the local database
  let query = supabase
    .from("energy_plans")
    .select("*")
    .eq("state", state)
    .eq("source", "AER_PRD")
    .is("effective_to", null)
    .order("last_refreshed", { ascending: false });

  if (meterType) {
    query = query.eq("meter_type", meterType);
  }

  // Note: Network filtering may not be available from AER PRD
  // We'll match networks using a separate DNSP lookup if needed

  const { data: plans, error } = await query.limit(100);

  if (error) {
    console.error("Failed to fetch plans from database:", error);
    throw new Error(`Database query failed: ${error.message}`);
  }

  return plans || [];
}