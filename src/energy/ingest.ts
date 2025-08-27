// AER PRD Data Ingestion Service
// Orchestrates fetching, normalizing, and storing energy plan data

import { fetchAllGenericPlans } from "./aerClient";
import { planToRetailPlan } from "./aerNormalize";
import { supabase } from "@/integrations/supabase/client";

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
  const result: IngestResult = {
    success: false,
    totalFetched: 0,
    totalNormalized: 0,
    totalUpserted: 0,
    errors: [],
    duration: 0
  };

  try {
    console.log("Starting AER PRD data refresh...", options);

    // Step 1: Fetch raw plan data from AER
    const rawPlans = await fetchAllGenericPlans({
      state: options.state,
      postcode: options.postcode,
      fuelType: "ELECTRICITY",
      type: "RESIDENTIAL",
      effective: "CURRENT"
    });

    result.totalFetched = rawPlans.length;
    console.log(`Fetched ${result.totalFetched} raw plans from AER PRD`);

    if (rawPlans.length === 0) {
      result.errors.push("No plans fetched from AER PRD");
      return result;
    }

    // Step 2: Normalize to our RetailPlan schema
    const normalizedPlans = rawPlans
      .map(planToRetailPlan)
      .filter(Boolean); // Remove null results

    result.totalNormalized = normalizedPlans.length;
    console.log(`Normalized ${result.totalNormalized} plans`);

    if (normalizedPlans.length === 0) {
      result.errors.push("No plans could be normalized");
      return result;
    }

    // Step 3: Batch upsert to database
    const batchSize = options.batchSize || 50;
    let upsertCount = 0;

    for (let i = 0; i < normalizedPlans.length; i += batchSize) {
      const batch = normalizedPlans.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase
          .from("energy_plans")
          .upsert(batch as any[], {
            onConflict: "hash",
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`Batch upsert error (batch ${Math.floor(i/batchSize) + 1}):`, error);
          result.errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
        } else {
          upsertCount += batch.length;
          console.log(`Upserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(normalizedPlans.length/batchSize)} (${batch.length} plans)`);
        }
      } catch (batchError) {
        console.error("Batch processing error:", batchError);
        result.errors.push(`Batch processing failed: ${batchError}`);
      }
    }

    result.totalUpserted = upsertCount;

    // Step 4: Cleanup old plans (optional)
    if (options.forceRefresh) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - 24); // Remove plans older than 24h

        const { error: deleteError } = await supabase
          .from("energy_plans")
          .delete()
          .lt("last_refreshed", cutoffDate.toISOString())
          .eq("source", "AER_PRD");

        if (deleteError) {
          console.warn("Failed to cleanup old plans:", deleteError);
          result.errors.push(`Cleanup warning: ${deleteError.message}`);
        }
      } catch (cleanupError) {
        console.warn("Cleanup error:", cleanupError);
        result.errors.push(`Cleanup error: ${cleanupError}`);
      }
    }

    result.success = result.totalUpserted > 0;
    result.duration = Date.now() - startTime;

    console.log("AER PRD refresh completed:", {
      success: result.success,
      fetched: result.totalFetched,
      normalized: result.totalNormalized,
      upserted: result.totalUpserted,
      duration: `${result.duration}ms`,
      errors: result.errors.length
    });

    return result;

  } catch (error) {
    console.error("Critical error during energy plans refresh:", error);
    result.success = false;
    result.errors.push(`Critical error: ${error}`);
    result.duration = Date.now() - startTime;
    return result;
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