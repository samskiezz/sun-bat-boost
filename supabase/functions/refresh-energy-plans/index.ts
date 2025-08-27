import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sample Australian energy plans data
const SAMPLE_ENERGY_PLANS = [
  // NSW Plans
  {
    plan_name: "Simply Energy Simply Flexible",
    retailer: "Simply Energy",
    state: "NSW", 
    network: "Ausgrid",
    meter_type: "Smart",
    supply_c_per_day: 89.1,
    usage_c_per_kwh_peak: 28.5,
    usage_c_per_kwh_offpeak: 16.2,
    usage_c_per_kwh_shoulder: 22.1,
    fit_c_per_kwh: 8.0,
    demand_c_per_kw: 15.5,
    controlled_c_per_kwh: 14.8,
    tou_windows: {
      peak: ["16:00-20:00"],
      offpeak: ["22:00-06:00"], 
      shoulder: ["06:00-16:00", "20:00-22:00"]
    },
    source: "AER_API",
    effective_from: new Date('2025-01-01'),
    last_refreshed: new Date()
  },
  {
    plan_name: "Origin Energy Fair Go",
    retailer: "Origin Energy", 
    state: "NSW",
    network: "Ausgrid",
    meter_type: "Smart",
    supply_c_per_day: 95.7,
    usage_c_per_kwh_peak: 29.2,
    usage_c_per_kwh_offpeak: 17.1,
    usage_c_per_kwh_shoulder: 23.8,
    fit_c_per_kwh: 7.5,
    demand_c_per_kw: 16.2,
    controlled_c_per_kwh: 15.2,
    tou_windows: {
      peak: ["16:00-20:00"],
      offpeak: ["22:00-06:00"],
      shoulder: ["06:00-16:00", "20:00-22:00"]
    },
    source: "AER_API",
    effective_from: new Date('2025-01-01'),
    last_refreshed: new Date()
  },
  {
    plan_name: "AGL Essentials",
    retailer: "AGL Energy",
    state: "NSW", 
    network: "Ausgrid",
    meter_type: "Smart",
    supply_c_per_day: 92.4,
    usage_c_per_kwh_peak: 27.8,
    usage_c_per_kwh_offpeak: 15.9,
    usage_c_per_kwh_shoulder: 21.7,
    fit_c_per_kwh: 8.2,
    demand_c_per_kw: 14.8,
    controlled_c_per_kwh: 14.5,
    tou_windows: {
      peak: ["16:00-20:00"],
      offpeak: ["22:00-06:00"],
      shoulder: ["06:00-16:00", "20:00-22:00"]
    },
    source: "AER_API", 
    effective_from: new Date('2025-01-01'),
    last_refreshed: new Date()
  },
  // VIC Plans
  {
    plan_name: "Red Energy Living Energy Saver",
    retailer: "Red Energy",
    state: "VIC",
    network: "CitiPower",
    meter_type: "Smart",
    supply_c_per_day: 85.3,
    usage_c_per_kwh_peak: 26.1,
    usage_c_per_kwh_offpeak: 15.2,
    usage_c_per_kwh_shoulder: 20.8,
    fit_c_per_kwh: 6.7,
    demand_c_per_kw: null,
    controlled_c_per_kwh: 13.9,
    tou_windows: {
      peak: ["15:00-21:00"],
      offpeak: ["22:00-07:00"],
      shoulder: ["07:00-15:00", "21:00-22:00"]
    },
    source: "AER_API",
    effective_from: new Date('2025-01-01'),
    last_refreshed: new Date()
  },
  {
    plan_name: "Energy Australia Go Variable",
    retailer: "EnergyAustralia",
    state: "VIC",
    network: "CitiPower", 
    meter_type: "Smart",
    supply_c_per_day: 88.6,
    usage_c_per_kwh_peak: 27.3,
    usage_c_per_kwh_offpeak: 16.1,
    usage_c_per_kwh_shoulder: 21.5,
    fit_c_per_kwh: 6.2,
    demand_c_per_kw: null,
    controlled_c_per_kwh: 14.7,
    tou_windows: {
      peak: ["15:00-21:00"],
      offpeak: ["22:00-07:00"],
      shoulder: ["07:00-15:00", "21:00-22:00"]
    },
    source: "AER_API",
    effective_from: new Date('2025-01-01'), 
    last_refreshed: new Date()
  },
  // QLD Plans
  {
    plan_name: "Alinta Energy Home Deal",
    retailer: "Alinta Energy",
    state: "QLD",
    network: "Energex", 
    meter_type: "Smart",
    supply_c_per_day: 91.2,
    usage_c_per_kwh_peak: 28.7,
    usage_c_per_kwh_offpeak: null,
    usage_c_per_kwh_shoulder: null,
    fit_c_per_kwh: 7.8,
    demand_c_per_kw: null,
    controlled_c_per_kwh: 16.3,
    tou_windows: {
      peak: ["16:00-20:00"],
      offpeak: null,
      shoulder: null
    },
    source: "AER_API",
    effective_from: new Date('2025-01-01'),
    last_refreshed: new Date()
  },
  // SA Plans  
  {
    plan_name: "Momentum Energy Movers & Savers",
    retailer: "Momentum Energy",
    state: "SA",
    network: "SA Power Networks",
    meter_type: "Smart", 
    supply_c_per_day: 96.8,
    usage_c_per_kwh_peak: 31.2,
    usage_c_per_kwh_offpeak: 18.7,
    usage_c_per_kwh_shoulder: null,
    fit_c_per_kwh: 5.5,
    demand_c_per_kw: null,
    controlled_c_per_kwh: 17.8,
    tou_windows: {
      peak: ["16:00-21:00"], 
      offpeak: ["22:00-06:00", "10:00-15:00"],
      shoulder: null
    },
    source: "AER_API",
    effective_from: new Date('2025-01-01'),
    last_refreshed: new Date()
  },
  // WA Plans
  {
    plan_name: "Synergy Residential A1",
    retailer: "Synergy",
    state: "WA", 
    network: "Western Power",
    meter_type: "Smart",
    supply_c_per_day: 45.2,
    usage_c_per_kwh_peak: 29.8,
    usage_c_per_kwh_offpeak: null,
    usage_c_per_kwh_shoulder: null,
    fit_c_per_kwh: 2.5,
    demand_c_per_kw: null,
    controlled_c_per_kwh: null,
    tou_windows: {
      peak: null,
      offpeak: null,
      shoulder: null
    },
    source: "RETAILER_API",
    effective_from: new Date('2025-01-01'),
    last_refreshed: new Date()
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Starting energy plans refresh...');

    // Clear existing plans
    const { error: deleteError } = await supabase
      .from('energy_plans')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error clearing existing plans:', deleteError);
    }

    // Insert new plans
    const { data, error } = await supabase
      .from('energy_plans')
      .insert(SAMPLE_ENERGY_PLANS);

    if (error) {
      console.error('Error inserting energy plans:', error);
      throw error;
    }

    // Update tracking
    await supabase.rpc('update_data_tracking', {
      table_name_param: 'energy_plans',
      count_param: SAMPLE_ENERGY_PLANS.length,
      status_param: 'completed',
      notes_param: 'Sample Australian energy plans populated'
    });

    console.log(`✅ Successfully refreshed ${SAMPLE_ENERGY_PLANS.length} energy plans`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully refreshed ${SAMPLE_ENERGY_PLANS.length} energy plans`,
        plans_count: SAMPLE_ENERGY_PLANS.length,
        states_covered: ['NSW', 'VIC', 'QLD', 'SA', 'WA']
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Energy plans refresh error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});