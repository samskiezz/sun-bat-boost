import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extended seed data covering all major Australian DNSPs
const SEED_DATA = [
  // NSW - Ausgrid
  { state: "NSW", postcode_start: 2000, postcode_end: 2249, network: "Ausgrid", export_cap_kw: 5.0 },
  { state: "NSW", postcode_start: 2250, postcode_end: 2299, network: "Ausgrid", export_cap_kw: 5.0 },
  
  // NSW - Endeavour Energy  
  { state: "NSW", postcode_start: 2300, postcode_end: 2339, network: "Endeavour Energy", export_cap_kw: 5.0 },
  { state: "NSW", postcode_start: 2745, postcode_end: 2786, network: "Endeavour Energy", export_cap_kw: 5.0 },
  
  // NSW - Essential Energy
  { state: "NSW", postcode_start: 2340, postcode_end: 2599, network: "Essential Energy", export_cap_kw: 5.0 },
  { state: "NSW", postcode_start: 2620, postcode_end: 2899, network: "Essential Energy", export_cap_kw: 5.0 },
  
  // ACT - Evoenergy
  { state: "ACT", postcode_start: 2600, postcode_end: 2618, network: "Evoenergy", export_cap_kw: 5.0 },
  
  // VIC - Ausgrid (some postcodes)
  { state: "VIC", postcode_start: 3000, postcode_end: 3199, network: "CitiPower", export_cap_kw: 5.0 },
  { state: "VIC", postcode_start: 3200, postcode_end: 3399, network: "Powercor", export_cap_kw: 5.0 },
  { state: "VIC", postcode_start: 3400, postcode_end: 3999, network: "AusNet Services", export_cap_kw: 5.0 },
  
  // QLD - Energex
  { state: "QLD", postcode_start: 4000, postcode_end: 4299, network: "Energex", export_cap_kw: 5.0 },
  { state: "QLD", postcode_start: 4300, postcode_end: 4399, network: "Energex", export_cap_kw: 5.0 },
  
  // QLD - Ergon Energy
  { state: "QLD", postcode_start: 4400, postcode_end: 4999, network: "Ergon Energy", export_cap_kw: 5.0 },
  
  // SA - SA Power Networks  
  { state: "SA", postcode_start: 5000, postcode_end: 5799, network: "SA Power Networks", export_cap_kw: 10.0 },
  
  // WA - Western Power
  { state: "WA", postcode_start: 6000, postcode_end: 6999, network: "Western Power", export_cap_kw: 5.0 },
  
  // TAS - TasNetworks
  { state: "TAS", postcode_start: 7000, postcode_end: 7999, network: "TasNetworks", export_cap_kw: 5.0 },
  
  // NT - Power and Water
  { state: "NT", postcode_start: 800, postcode_end: 899, network: "Power and Water Corporation", export_cap_kw: 5.0 },
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";
      
      if (contentType.includes("text/csv")) {
        // Handle CSV import
        const csvText = await req.text();
        const lines = csvText.trim().split("\n");
        const headers = lines[0].split(",");
        
        const rows = lines.slice(1).map(line => {
          const values = line.split(",");
          const row: any = {};
          
          headers.forEach((header, index) => {
            const key = header.trim();
            const value = values[index]?.trim();
            
            if (key === "postcode_start" || key === "postcode_end") {
              row[key] = parseInt(value);
            } else if (key === "export_cap_kw") {
              row[key] = parseFloat(value);
            } else {
              row[key] = value;
            }
          });
          
          return row;
        });

        console.log(`Importing ${rows.length} DNSP records from CSV`);
        
        const { data, error } = await supabase
          .from('dnsps')
          .insert(rows);

        if (error) {
          console.error("CSV import error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { 
              headers: { ...corsHeaders, "content-type": "application/json" }, 
              status: 500 
            }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Successfully imported ${rows.length} DNSP records`,
            imported: rows.length 
          }),
          { headers: { ...corsHeaders, "content-type": "application/json" } }
        );
        
      } else {
        // Handle seed data import
        console.log(`Seeding ${SEED_DATA.length} default DNSP records`);
        
        // Clear existing seed data first
        await supabase
          .from('dnsps')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        const { data, error } = await supabase
          .from('dnsps')
          .insert(SEED_DATA);

        if (error) {
          console.error("Seed import error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { 
              headers: { ...corsHeaders, "content-type": "application/json" }, 
              status: 500 
            }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Successfully seeded ${SEED_DATA.length} DNSP records`,
            seeded: SEED_DATA.length 
          }),
          { headers: { ...corsHeaders, "content-type": "application/json" } }
        );
      }
    }

    // GET request - return current DNSP count
    const { count, error } = await supabase
      .from('dnsps')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { 
          headers: { ...corsHeaders, "content-type": "application/json" }, 
          status: 500 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${count} DNSP records in database`,
        count 
      }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );

  } catch (error) {
    console.error("DNSP import function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, "content-type": "application/json" }, 
        status: 500 
      }
    );
  }
});