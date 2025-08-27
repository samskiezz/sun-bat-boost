import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VPPProvider {
  id: string;
  name: string;
  company: string;
  states_available: string[];
  compatible_battery_brands: string[];
  compatible_inverter_brands: string[];
  min_battery_kwh: number;
  max_battery_kwh: number;
  estimated_annual_reward: number;
  signup_bonus: number;
  is_active: boolean;
  requirements: string;
  website?: string;
}

interface CompatibilityCheck {
  battery_brand?: string;
  inverter_brand?: string;
  battery_capacity_kwh?: number;
  state?: string;
  postcode?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { battery_brand, inverter_brand, battery_capacity_kwh, state, postcode } = await req.json() as CompatibilityCheck;

    console.log('Checking VPP compatibility for:', { battery_brand, inverter_brand, battery_capacity_kwh, state, postcode });

    // Get postcode state if not provided
    let targetState = state;
    if (!targetState && postcode) {
      const { data: postcodeData } = await supabase
        .from('postcode_zones')
        .select('state')
        .eq('postcode', postcode)
        .single();
      
      targetState = postcodeData?.state;
    }

    // Get all active VPP providers
    const { data: providers, error } = await supabase
      .from('vpp_providers')
      .select('*')
      .eq('is_active', true)
      .order('estimated_annual_reward', { ascending: false });

    if (error) {
      console.error('Error fetching VPP providers:', error);
      throw error;
    }

    console.log(`Found ${providers?.length || 0} active VPP providers`);

    // Filter compatible providers
    const compatibleProviders: Array<VPPProvider & { compatibility_score: number; compatibility_reasons: string[] }> = [];

    for (const provider of providers || []) {
      const compatibility_reasons: string[] = [];
      let compatibility_score = 0;

      // Check state compatibility
      let stateCompatible = true;
      if (targetState && provider.states_available?.length > 0) {
        stateCompatible = provider.states_available.includes(targetState);
        if (stateCompatible) {
          compatibility_reasons.push(`Available in ${targetState}`);
          compatibility_score += 25;
        }
      }

      // Check battery brand compatibility
      let batteryCompatible = true;
      if (battery_brand && provider.compatible_battery_brands?.length > 0) {
        batteryCompatible = provider.compatible_battery_brands.some(brand => 
          brand.toLowerCase().includes(battery_brand.toLowerCase()) ||
          battery_brand.toLowerCase().includes(brand.toLowerCase())
        );
        if (batteryCompatible) {
          compatibility_reasons.push(`Supports ${battery_brand} batteries`);
          compatibility_score += 30;
        }
      }

      // Check inverter brand compatibility  
      let inverterCompatible = true;
      if (inverter_brand && provider.compatible_inverter_brands?.length > 0) {
        inverterCompatible = provider.compatible_inverter_brands.some(brand =>
          brand.toLowerCase().includes(inverter_brand.toLowerCase()) ||
          inverter_brand.toLowerCase().includes(brand.toLowerCase())
        );
        if (inverterCompatible) {
          compatibility_reasons.push(`Supports ${inverter_brand} inverters`);
          compatibility_score += 20;
        }
      }

      // Check battery capacity limits
      let capacityCompatible = true;
      if (battery_capacity_kwh) {
        const minCapacity = provider.min_battery_kwh || 0;
        const maxCapacity = provider.max_battery_kwh || 1000;
        capacityCompatible = battery_capacity_kwh >= minCapacity && battery_capacity_kwh <= maxCapacity;
        
        if (capacityCompatible) {
          compatibility_reasons.push(`Battery capacity ${battery_capacity_kwh}kWh within range (${minCapacity}-${maxCapacity}kWh)`);
          compatibility_score += 15;
        }
      }

      // Add reward value to score
      compatibility_score += Math.min(10, (provider.estimated_annual_reward || 0) / 100);

      // Only include if compatible or no filters provided
      if ((stateCompatible && batteryCompatible && inverterCompatible && capacityCompatible) || 
          (!battery_brand && !inverter_brand && !battery_capacity_kwh && !targetState)) {
        
        compatibleProviders.push({
          ...provider,
          compatibility_score,
          compatibility_reasons
        });
      }
    }

    // Sort by compatibility score and reward
    compatibleProviders.sort((a, b) => {
      if (a.compatibility_score !== b.compatibility_score) {
        return b.compatibility_score - a.compatibility_score;
      }
      return (b.estimated_annual_reward || 0) - (a.estimated_annual_reward || 0);
    });

    const response = {
      success: true,
      compatible_providers: compatibleProviders,
      total_providers_found: providers?.length || 0,
      compatible_count: compatibleProviders.length,
      search_criteria: {
        battery_brand,
        inverter_brand,
        battery_capacity_kwh,
        state: targetState,
        postcode
      },
      best_match: compatibleProviders[0] || null,
      top_rewards: compatibleProviders.slice(0, 3).map(p => ({
        name: p.name,
        company: p.company,
        annual_reward: p.estimated_annual_reward,
        signup_bonus: p.signup_bonus,
        compatibility_score: p.compatibility_score
      }))
    };

    console.log(`Returning ${compatibleProviders.length} compatible VPP providers`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('VPP compatibility check error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      compatible_providers: [],
      total_providers_found: 0,
      compatible_count: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});