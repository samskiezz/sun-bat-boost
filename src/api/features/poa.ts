// NASA POWER POA (Plane of Array) data API endpoint
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get('lat') || '0');
    const lng = parseFloat(url.searchParams.get('lng') || '0');
    const tilt = parseFloat(url.searchParams.get('tilt') || '0');
    const azimuth = parseFloat(url.searchParams.get('azimuth') || '0');
    const start = url.searchParams.get('start') || '';
    const end = url.searchParams.get('end') || '';

    // Validate parameters
    if (!lat || !lng || !start || !end) {
      return new Response(JSON.stringify({ 
        error: "Missing required parameters: lat, lng, start, end" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // For demo purposes, generate synthetic POA data based on location and parameters
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const daily = [];
    const hourly = [];
    
    // Generate realistic POA values based on location (Southern hemisphere gets less in Jan)
    const seasonalFactor = lat < 0 ? 0.7 : 1.3; // Southern hemisphere winter adjustment
    const tiltFactor = Math.cos((tilt - 30) * Math.PI / 180) * 0.2 + 0.9; // Optimal around 30 degrees
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      // Generate daily POA (4-8 kWh/m²/day typical range)
      const basePoa = 5.5 + Math.sin(i * 0.3) * 1.5; // Vary by day
      const poaKwh = basePoa * seasonalFactor * tiltFactor;
      
      daily.push({
        date: dateStr,
        poa_kwh: Math.round(poaKwh * 100) / 100
      });
      
      // Generate hourly data for each day (sunrise to sunset)
      for (let hour = 6; hour <= 18; hour++) {
        const dt_utc = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour).toISOString();
        const hourlyFactor = Math.sin((hour - 6) * Math.PI / 12); // Bell curve for daylight
        const poa_wm2 = hourlyFactor * 800 * seasonalFactor * tiltFactor; // Peak ~800 W/m²
        
        hourly.push({
          dt_utc,
          poa_wm2: Math.round(poa_wm2),
          poa_kwh: Math.round(poa_wm2 / 1000 * 100) / 100
        });
      }
    }

    return new Response(JSON.stringify({
      daily,
      hourly: hourly.slice(0, 24), // Return first day's hourly data
      meta: {
        source: "NASA_POWER_API_Synthetic",
        cached: false,
        location: { lat, lng },
        parameters: { tilt, azimuth, start, end }
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("POA API error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to fetch POA data",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}