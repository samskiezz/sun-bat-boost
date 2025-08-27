import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AER Retailers configuration (from AER CDR registry)
const AER_RETAILERS = [
  { brand: "agl", displayName: "AGL Energy", baseUri: "https://cdr.energymadeeasy.gov.au/agl" },
  { brand: "origin", displayName: "Origin Energy", baseUri: "https://cdr.energymadeeasy.gov.au/origin" },
  { brand: "energyaustralia", displayName: "EnergyAustralia", baseUri: "https://cdr.energymadeeasy.gov.au/energyaustralia" },
  { brand: "red-energy", displayName: "Red Energy", baseUri: "https://cdr.energymadeeasy.gov.au/red-energy" },
  { brand: "alinta-energy", displayName: "Alinta Energy", baseUri: "https://cdr.energymadeeasy.gov.au/alinta-energy" },
  { brand: "simply-energy", displayName: "Simply Energy", baseUri: "https://cdr.energymadeeasy.gov.au/simply-energy" }
];

const CDR_HEADERS = { 
  "x-v": "1", 
  "x-min-v": "1", 
  "accept": "application/json"
};

// Fetch all plans from AER retailers
async function fetchAllGenericPlans(state?: string): Promise<any[]> {
  const allPlans: any[] = [];
  
  console.log(`Fetching plans from ${AER_RETAILERS.length} retailers for state: ${state || 'ALL'}...`);
  
  for (const retailer of AER_RETAILERS) {
    try {
      let page = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const queryParams = new URLSearchParams({
          fuelType: "ELECTRICITY",
          type: "ALL",
          effective: "CURRENT",
          page: String(page),
          "page-size": "1000",
          ...(state && { state: state })
        });
        
        const url = `${retailer.baseUri}/cds-au/v1/energy/plans?${queryParams}`;
        console.log(`Fetching: ${retailer.displayName} - Page ${page}`);
        
        const response = await fetch(url, { 
          headers: CDR_HEADERS,
          signal: AbortSignal.timeout(30000)
        });
        
        if (!response.ok) {
          console.warn(`AER error ${response.status} for ${retailer.brand}: ${response.statusText}`);
          break;
        }
        
        const data = await response.json();
        const plans = data?.data?.plans || data?.data || data?.plans || [];
        
        if (plans.length > 0) {
          const plansWithMeta = plans.map((plan: any) => ({
            ...plan,
            _retailer_brand: retailer.brand,
            _retailer_display_name: retailer.displayName,
            _fetch_timestamp: new Date().toISOString()
          }));
          
          allPlans.push(...plansWithMeta);
          console.log(`  → Found ${plans.length} plans`);
        }
        
        const meta = data?.meta || {};
        const totalPages = Number(meta?.totalPages || 1);
        const currentPage = Number(meta?.page || page);
        
        hasMorePages = currentPage < totalPages && plans.length > 0;
        page++;
        
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error(`Failed to fetch plans from ${retailer.brand}:`, error);
    }
  }
  
  console.log(`Total plans fetched: ${allPlans.length}`);
  return allPlans;
}

// Normalize plan data
function planToRetailPlan(rawPlan: any) {
  // Extract basic info
  const planId = rawPlan.planId || rawPlan.id || crypto.randomUUID();
  const retailer = rawPlan._retailer_display_name || rawPlan.brand || "Unknown";
  const planName = rawPlan.displayName || rawPlan.planName || rawPlan.description || "Unknown Plan";
  
  // Extract pricing from tariffs
  const electricityContract = rawPlan.electricityContract || {};
  const tariffs = electricityContract.tariffs || [];
  
  let supply_c_per_day = 0;
  let usage_c_per_kwh_peak = 0;
  let usage_c_per_kwh_shoulder: number | null = null;
  let usage_c_per_kwh_offpeak: number | null = null;
  let fit_c_per_kwh = 0;
  
  // Parse tariffs for rates
  for (const tariff of tariffs) {
    const rates = tariff.rates || [];
    
    for (const rate of rates) {
      const unitPrice = Number(rate.unitPrice) || 0;
      
      if (rate.rateBlockUType === "singleRate") {
        usage_c_per_kwh_peak = Math.max(usage_c_per_kwh_peak, unitPrice);
      } else if (rate.rateBlockUType === "timeOfUseRates") {
        const timeOfUse = rate.timeOfUse || [];
        for (const tou of timeOfUse) {
          const touRate = Number(tou.rate) || 0;
          if (tou.type === "peak") {
            usage_c_per_kwh_peak = Math.max(usage_c_per_kwh_peak, touRate);
          } else if (tou.type === "shoulder") {
            usage_c_per_kwh_shoulder = touRate;
          } else if (tou.type === "offPeak") {
            usage_c_per_kwh_offpeak = touRate;
          }
        }
      }
      
      // Daily supply charge
      if (rate.rateBlockUType === "dailySupplyCharges") {
        supply_c_per_day = Math.max(supply_c_per_day, unitPrice);
      }
    }
  }
  
  // Feed-in tariff
  const feedInTariff = electricityContract.feedInTariff || {};
  if (feedInTariff.singleTariff) {
    fit_c_per_kwh = Number(feedInTariff.singleTariff.rate) || 0;
  }
  
  return {
    id: planId,
    retailer,
    plan_name: planName,
    state: rawPlan.geography?.distributors?.[0]?.distributorId || "NSW",
    network: rawPlan.geography?.distributors?.[0]?.distributorName || "Unknown",
    meter_type: "TOU", // Default for now
    supply_c_per_day,
    usage_c_per_kwh_peak,
    usage_c_per_kwh_shoulder,
    usage_c_per_kwh_offpeak,
    fit_c_per_kwh,
    demand_c_per_kw: null,
    controlled_c_per_kwh: null,
    tou_windows: [],
    effective_from: rawPlan.effectiveFrom || new Date().toISOString(),
    effective_to: rawPlan.effectiveTo || null,
    source: "AER_PRD",
    hash: `${planId}-${Date.now()}`,
    last_refreshed: new Date().toISOString()
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const states = ["NSW", "VIC", "QLD", "SA", "TAS", "ACT"];
  let inserted = 0, total = 0;
  
  console.log("🚀 Starting comprehensive energy plans refresh...");
  
  // Clear old data for fresh start
  console.log("🧹 Clearing existing plans...");
  await supabase.from("energy_plans").delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  for (const state of states) {
    console.log(`\n📍 Processing state: ${state}`);
    
    try {
      // Fetch all plans for this state from all retailers
      const rawPlans = await fetchAllGenericPlans(state);
      console.log(`Found ${rawPlans.length} raw plans for ${state}`);
      
      // Normalize and insert in batches
      const batchSize = 50;
      for (let i = 0; i < rawPlans.length; i += batchSize) {
        const batch = rawPlans.slice(i, i + batchSize);
        const normalizedPlans = batch
          .map(plan => {
            try {
              return planToRetailPlan(plan);
            } catch (error) {
              console.warn(`Failed to normalize plan:`, error);
              return null;
            }
          })
          .filter(Boolean);
        
        if (normalizedPlans.length > 0) {
          const { error } = await supabase
            .from("energy_plans")
            .upsert(normalizedPlans, { onConflict: 'hash' });
          
          if (error) {
            console.error(`Batch insert error:`, error);
          } else {
            inserted += normalizedPlans.length;
            console.log(`  ✅ Batch ${Math.ceil((i + batchSize) / batchSize)}: ${normalizedPlans.length} plans`);
          }
        }
        
        total += batch.length;
        
        // Small delay between batches
        if (i + batchSize < rawPlans.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error(`Error processing state ${state}:`, error);
    }
  }
  
  console.log(`\n🎉 Refresh complete! Inserted ${inserted} plans out of ${total} found`);
  
  return new Response(JSON.stringify({ 
    success: true,
    inserted, 
    total,
    message: `Successfully refreshed ${inserted} energy plans from ${states.length} states`
  }), { 
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
});