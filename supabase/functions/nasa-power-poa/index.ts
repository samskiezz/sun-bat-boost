import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let lat, lng, tilt, azimuth, start, end;

    if (req.method === 'GET') {
      // Handle GET requests with URL parameters
      const url = new URL(req.url);
      lat = parseFloat(url.searchParams.get('lat') || '0');
      lng = parseFloat(url.searchParams.get('lng') || '0');
      tilt = parseFloat(url.searchParams.get('tilt') || '0');
      azimuth = parseFloat(url.searchParams.get('azimuth') || '0');
      start = url.searchParams.get('start') || '';
      end = url.searchParams.get('end') || '';
    } else if (req.method === 'POST') {
      // Handle POST requests with JSON body (from supabase.functions.invoke)
      const body = await req.json();
      lat = parseFloat(body.lat || '0');
      lng = parseFloat(body.lng || '0');
      tilt = parseFloat(body.tilt || '0');
      azimuth = parseFloat(body.azimuth || '0');
      start = body.start || '';
      end = body.end || '';
    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate parameters
    if (!lat || !lng) {
      return new Response(JSON.stringify({ 
        error: "Missing required parameters: lat, lng",
        received: { lat, lng, start, end }
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!start || !end) {
      // Use default date range if not provided
      start = '2024-01-01';
      end = '2024-12-31';
      console.log('Using default date range:', { start, end });
    }

    console.log(`Generating POA data for location: ${lat}, ${lng}, tilt: ${tilt}, azimuth: ${azimuth}`);

    // Generate synthetic POA data based on location and parameters
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const daily = [];
    const hourly = [];
    
    // Generate realistic POA values based on location (Southern hemisphere gets less in Jan)
    const seasonalFactor = lat < 0 ? 0.7 : 1.3; // Southern hemisphere winter adjustment
    const tiltFactor = Math.cos((tilt - 30) * Math.PI / 180) * 0.2 + 0.9; // Optimal around 30 degrees
    const azimuthFactor = Math.cos(azimuth * Math.PI / 180) * 0.1 + 0.95; // Optimal facing equator
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      // Generate daily POA (4-8 kWh/m²/day typical range)
      const basePoa = 5.5 + Math.sin(i * 0.3) * 1.5; // Vary by day
      const poaKwh = basePoa * seasonalFactor * tiltFactor * azimuthFactor;
      
      daily.push({
        date: dateStr,
        poa_kwh: Math.round(poaKwh * 100) / 100
      });
      
      // Generate hourly data for each day (sunrise to sunset)
      for (let hour = 6; hour <= 18; hour++) {
        const dt_utc = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour).toISOString();
        const hourlyFactor = Math.sin((hour - 6) * Math.PI / 12); // Bell curve for daylight
        const poa_wm2 = hourlyFactor * 800 * seasonalFactor * tiltFactor * azimuthFactor; // Peak ~800 W/m²
        
        hourly.push({
          dt_utc,
          poa_wm2: Math.round(Math.max(0, poa_wm2)),
          poa_kwh: Math.round(Math.max(0, poa_wm2) / 1000 * 100) / 100
        });
      }
    }

    const response = {
      daily,
      hourly: hourly.slice(0, 24), // Return first day's hourly data
      meta: {
        source: "NASA_POWER_API_Supabase_Synthetic",
        cached: false,
        location: { lat, lng },
        parameters: { tilt, azimuth, start, end },
        generation_timestamp: new Date().toISOString()
      }
    };

    console.log(`Generated ${daily.length} daily records and ${hourly.slice(0, 24).length} hourly records`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("POA API error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to fetch POA data",
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
})