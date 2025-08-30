import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PVSimulationParams {
  twinId: string;
  systemKw: number;
  location: string;
  tiltDegrees: number;
  orientationDegrees: number;
  physicsParams: {
    soiling: number;
    albedo: number;
    bifacialGain: number;
  };
}

interface MonthlyData {
  month: string;
  p10: number;
  p50: number;
  p90: number;
}

interface DailyData {
  hour: number;
  production: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { twinId, systemKw, location, tiltDegrees, orientationDegrees, physicsParams }: PVSimulationParams = await req.json();
    
    console.log(`Starting PV simulation for twin ${twinId}: ${systemKw}kW system at ${location}`);

    // Physics-based solar irradiance calculation
    const calculateSolarIrradiance = (month: number, hour: number) => {
      const dayOfYear = month * 30.5;
      const declination = 23.45 * Math.sin((360 * (284 + dayOfYear)) / 365 * Math.PI / 180);
      const latitude = getLatitude(location);
      
      const hourAngle = 15 * (hour - 12);
      const zenithAngle = Math.acos(
        Math.sin(declination * Math.PI / 180) * Math.sin(latitude * Math.PI / 180) +
        Math.cos(declination * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.cos(hourAngle * Math.PI / 180)
      );
      
      const airMass = 1 / Math.cos(zenithAngle);
      const directNormalIrradiance = 1353 * Math.exp(-0.7 * Math.pow(airMass, 0.678));
      
      // Apply tilt and orientation corrections
      const tiltFactor = Math.cos((tiltDegrees - zenithAngle * 180 / Math.PI) * Math.PI / 180);
      const orientationFactor = Math.cos(orientationDegrees * Math.PI / 180);
      
      return Math.max(0, directNormalIrradiance * tiltFactor * orientationFactor);
    };

    const getLatitude = (loc: string): number => {
      const locations: { [key: string]: number } = {
        'Sydney': -33.8688,
        'Melbourne': -37.8136,
        'Adelaide': -34.9285,
        'Perth': -31.9505,
        'Brisbane': -27.4698,
        'Darwin': -12.4634,
        'Canberra': -35.2809,
        'Hobart': -42.8821
      };
      return locations[loc] || -33.8688; // Default to Sydney
    };

    // Generate monthly uncertainty bands with Monte Carlo simulation
    const monthlyData: MonthlyData[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let month = 0; month < 12; month++) {
      const simulations: number[] = [];
      
      // Run 1000 Monte Carlo simulations per month
      for (let sim = 0; sim < 1000; sim++) {
        let monthlyProduction = 0;
        
        // Weather variability factors (random)
        const cloudinessFactor = 0.7 + Math.random() * 0.6; // 70-130% of clear sky
        const temperatureFactor = 0.95 + Math.random() * 0.1; // 95-105% temperature coefficient
        const soilingFactor = 1 - (physicsParams.soiling + Math.random() * 0.01); // ±1% soiling variation
        const systemDegradation = 0.995 + Math.random() * 0.01; // ±0.5% system variation
        
        // Calculate daily production for the month
        for (let day = 0; day < 30; day++) {
          for (let hour = 6; hour < 19; hour++) {
            const irradiance = calculateSolarIrradiance(month, hour);
            const moduleEfficiency = 0.20 * temperatureFactor; // 20% base efficiency
            const systemEfficiency = 0.85 * systemDegradation; // 85% system efficiency
            
            let hourlyProduction = (irradiance / 1000) * systemKw * moduleEfficiency * systemEfficiency;
            
            // Apply physics parameters
            hourlyProduction *= cloudinessFactor * soilingFactor;
            
            // Albedo reflection bonus
            if (physicsParams.albedo > 0.2) {
              hourlyProduction *= 1 + (physicsParams.albedo - 0.2) * 0.1;
            }
            
            // Bifacial gain
            hourlyProduction *= 1 + physicsParams.bifacialGain;
            
            monthlyProduction += hourlyProduction;
          }
        }
        
        simulations.push(monthlyProduction);
      }
      
      // Calculate P10, P50, P90 from Monte Carlo results
      simulations.sort((a, b) => a - b);
      const p10 = simulations[Math.floor(simulations.length * 0.1)];
      const p50 = simulations[Math.floor(simulations.length * 0.5)];
      const p90 = simulations[Math.floor(simulations.length * 0.9)];
      
      monthlyData.push({
        month: months[month],
        p10: Math.round(p10),
        p50: Math.round(p50),
        p90: Math.round(p90)
      });
    }

    // Generate typical daily production profile (P50 summer day)
    const dailyData: DailyData[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const irradiance = calculateSolarIrradiance(6, hour); // June (summer)
      const moduleEfficiency = 0.20;
      const systemEfficiency = 0.85;
      
      let production = (irradiance / 1000) * systemKw * moduleEfficiency * systemEfficiency;
      production *= (1 - physicsParams.soiling) * (1 + physicsParams.bifacialGain);
      
      if (physicsParams.albedo > 0.2) {
        production *= 1 + (physicsParams.albedo - 0.2) * 0.1;
      }
      
      dailyData.push({
        hour,
        production: Math.max(0, Math.round(production * 100) / 100)
      });
    }

    // Calculate annual statistics
    const annualP50 = monthlyData.reduce((sum, month) => sum + month.p50, 0);
    const annualP90 = monthlyData.reduce((sum, month) => sum + month.p90, 0);

    const simulationResults = {
      monthlyData,
      dailyData,
      annualP50,
      annualP90,
      lastSimulated: new Date().toISOString()
    };

    // Update the twin in database
    const { error: updateError } = await supabase
      .from('pv_twins')
      .update({ 
        simulation_results: simulationResults,
        physics_params: physicsParams,
        updated_at: new Date().toISOString()
      })
      .eq('id', twinId);

    if (updateError) {
      throw new Error(`Failed to update twin: ${updateError.message}`);
    }

    console.log(`PV simulation completed for twin ${twinId}. Annual P50: ${annualP50}kWh, P90: ${annualP90}kWh`);

    return new Response(JSON.stringify({ 
      success: true, 
      results: simulationResults,
      message: `Physics-based simulation completed. Annual P50: ${Math.round(annualP50)}kWh, P90: ${Math.round(annualP90)}kWh`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('PV simulation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});