import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AER Energy Made Easy Retailers and CDR endpoints
const AER_RETAILERS = [
  { brand: "agl", baseUri: "https://cdr.energymadeeasy.gov.au/agl", displayName: "AGL Energy" },
  { brand: "origin", baseUri: "https://cdr.energymadeeasy.gov.au/origin", displayName: "Origin Energy" },
  { brand: "energyaustralia", baseUri: "https://cdr.energymadeeasy.gov.au/energyaustralia", displayName: "EnergyAustralia" },
  { brand: "red-energy", baseUri: "https://cdr.energymadeeasy.gov.au/red-energy", displayName: "Red Energy" },
  { brand: "alinta-energy", baseUri: "https://cdr.energymadeeasy.gov.au/alinta-energy", displayName: "Alinta Energy" },
  { brand: "simply-energy", baseUri: "https://cdr.energymadeeasy.gov.au/simply-energy", displayName: "Simply Energy" },
  { brand: "momentum-energy", baseUri: "https://cdr.energymadeeasy.gov.au/momentum-energy", displayName: "Momentum Energy" },
  { brand: "powershop", baseUri: "https://cdr.energymadeeasy.gov.au/powershop", displayName: "Powershop" },
  { brand: "energy-locals", baseUri: "https://cdr.energymadeeasy.gov.au/energy-locals", displayName: "Energy Locals" },
  { brand: "diamond-energy", baseUri: "https://cdr.energymadeeasy.gov.au/diamond-energy", displayName: "Diamond Energy" }
];

const CDR_HEADERS = { 
  "x-v": "1", 
  "x-min-v": "1", 
  "accept": "application/json"
};

// Normalize AER plan data to our database schema
function normalizeAERPlan(aerPlan: any, retailerInfo: any): any {
  const contract = aerPlan.electricityContract;
  if (!contract || !contract.tariffPeriod) return null;

  // Extract supply charge
  let supplyCharge = 0;
  if (contract.supplyCharges && contract.supplyCharges.length > 0) {
    supplyCharge = parseFloat(contract.supplyCharges[0].amount) || 0;
  }

  // Analyze tariff structure
  const tariffPeriod = contract.tariffPeriod[0];
  let meterType = "Single";
  let peakRate = 0;
  let shoulderRate = null;
  let offpeakRate = null;

  if (tariffPeriod.singleRate) {
    peakRate = parseFloat(tariffPeriod.singleRate.rates[0]?.unitRate) || 0;
  } else if (tariffPeriod.timeOfUseRates) {
    meterType = "TOU";
    const touRates = tariffPeriod.timeOfUseRates;
    
    // Find peak, shoulder and offpeak rates
    for (const rate of touRates) {
      const unitRate = parseFloat(rate.rates[0]?.unitRate) || 0;
      const rateType = rate.type || "";
      
      if (rateType.toLowerCase().includes("peak") || rate.timeOfUse?.days?.includes("BUSINESS_DAYS")) {
        peakRate = unitRate;
      } else if (rateType.toLowerCase().includes("shoulder")) {
        shoulderRate = unitRate;
      } else if (rateType.toLowerCase().includes("offpeak") || rateType.toLowerCase().includes("off-peak")) {
        offpeakRate = unitRate;
      }
    }
  }

  // Extract feed-in tariff
  let fitRate = 0;
  if (contract.solarFeedInTariff && contract.solarFeedInTariff.length > 0) {
    fitRate = parseFloat(contract.solarFeedInTariff[0].amount) || 0;
  }

  // Create time-of-use windows for TOU plans
  let touWindows = {};
  if (meterType === "TOU" && tariffPeriod.timeOfUseRates) {
    touWindows = {
      peak: ["16:00-20:00"],
      shoulder: ["06:00-16:00", "20:00-22:00"],
      offpeak: ["22:00-06:00"]
    };
  }

  return {
    retailer: retailerInfo.displayName,
    plan_name: aerPlan.displayName || aerPlan.planName || `${retailerInfo.displayName} Plan`,
    state: contract.distributionLoss?.distributionBusiness || "NSW", // Default to NSW if not specified
    network: contract.distributionLoss?.distributionBusiness || "Ausgrid",
    meter_type: meterType,
    supply_c_per_day: supplyCharge,
    usage_c_per_kwh_peak: peakRate,
    usage_c_per_kwh_shoulder: shoulderRate,
    usage_c_per_kwh_offpeak: offpeakRate,
    fit_c_per_kwh: fitRate,
    demand_c_per_kw: null, // Usually not provided in basic plan data
    controlled_c_per_kwh: offpeakRate ? offpeakRate * 0.8 : null,
    tou_windows: touWindows,
    source: "AER_SCRAPE",
    effective_from: new Date().toISOString(),
    last_refreshed: new Date().toISOString(),
    hash: `${aerPlan.planId || aerPlan.id}_${retailerInfo.brand}_${Date.now()}`
  };
}

async function scrapeEnergyMadeEasy(): Promise<any[]> {
  const allPlans: any[] = [];
  let totalFetched = 0;

  console.log(`🔍 Starting comprehensive scrape of Energy Made Easy data...`);
  console.log(`📊 Targeting ${AER_RETAILERS.length} major Australian energy retailers`);

  for (const retailer of AER_RETAILERS) {
    try {
      console.log(`\n🏢 Scraping ${retailer.displayName}...`);
      let page = 1;
      let hasMorePages = true;
      let retailerPlans = 0;

      while (hasMorePages && page <= 10) { // Limit to 10 pages per retailer
        const queryParams = new URLSearchParams({
          fuelType: "ELECTRICITY",
          type: "ALL",
          effective: "CURRENT",
          page: String(page),
          "page-size": "1000"
        });

        const url = `${retailer.baseUri}/cds-au/v1/energy/plans?${queryParams}`;
        
        try {
          console.log(`  📄 Fetching page ${page}...`);
          
          const response = await fetch(url, { 
            headers: CDR_HEADERS,
            signal: AbortSignal.timeout(30000)
          });

          if (!response.ok) {
            console.warn(`  ⚠️  HTTP ${response.status} for ${retailer.brand}: ${response.statusText}`);
            break;
          }

          const data = await response.json();
          const plans = data?.data?.plans || data?.data || data?.plans || [];
          
          if (plans.length > 0) {
            console.log(`  ✅ Found ${plans.length} plans on page ${page}`);
            
            // Normalize each plan
            for (const plan of plans) {
              const normalized = normalizeAERPlan(plan, retailer);
              if (normalized) {
                allPlans.push(normalized);
                retailerPlans++;
              }
            }
          }

          // Check for more pages
          const meta = data?.meta || {};
          const totalPages = Number(meta?.totalPages || 1);
          hasMorePages = page < totalPages && plans.length > 0;
          page++;

          // Rate limiting
          if (hasMorePages) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

        } catch (fetchError) {
          console.error(`  ❌ Error fetching page ${page} from ${retailer.brand}:`, fetchError);
          break;
        }
      }

      console.log(`  🎯 Total plans from ${retailer.displayName}: ${retailerPlans}`);
      totalFetched += retailerPlans;

      // Delay between retailers
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Failed to scrape ${retailer.brand}:`, error);
    }
  }

  console.log(`\n🏆 SCRAPING COMPLETE!`);
  console.log(`📈 Total plans scraped: ${allPlans.length}`);
  console.log(`🏪 Retailers processed: ${AER_RETAILERS.length}`);
  
  return allPlans;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting Energy Made Easy comprehensive scraper...');

    // Scrape fresh data from AER CDR endpoints
    const scrapedPlans = await scrapeEnergyMadeEasy();

    if (scrapedPlans.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No plans were successfully scraped"
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('🧹 Clearing existing energy plans...');
    
    // Clear existing plans
    const { error: deleteError } = await supabase
      .from('energy_plans')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.warn('⚠️ Error clearing existing plans:', deleteError);
    }

    console.log('💾 Inserting scraped plans into database...');

    // Insert in batches
    const batchSize = 100;
    let totalInserted = 0;
    
    for (let i = 0; i < scrapedPlans.length; i += batchSize) {
      const batch = scrapedPlans.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('energy_plans')
        .insert(batch);

      if (error) {
        console.error(`❌ Error inserting batch ${i}-${i + batchSize}:`, error);
      } else {
        totalInserted += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(scrapedPlans.length/batchSize)}: ${batch.length} plans`);
      }
    }

    // Get unique states and retailers for summary
    const uniqueStates = [...new Set(scrapedPlans.map(p => p.state))];
    const uniqueRetailers = [...new Set(scrapedPlans.map(p => p.retailer))];

    console.log(`🎉 Successfully scraped and stored ${totalInserted} energy plans!`);
    console.log(`🗺️  States covered: ${uniqueStates.join(', ')}`);
    console.log(`🏪 Retailers: ${uniqueRetailers.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully scraped ${totalInserted} energy plans from Energy Made Easy`,
        stats: {
          plans_scraped: scrapedPlans.length,
          plans_inserted: totalInserted,
          retailers_count: uniqueRetailers.length,
          states_covered: uniqueStates,
          retailers: uniqueRetailers,
          source_website: "https://www.energymadeeasy.gov.au/",
          scrape_timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 Energy Made Easy scraper error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        source: "energy-plans-scraper"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});