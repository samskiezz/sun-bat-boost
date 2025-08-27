import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    
    const url = new URL(req.url);
    const postcode = Number(url.searchParams.get("postcode") || "");
    const version = url.searchParams.get("version") || "v1";
    
    if (!postcode) {
      return new Response(JSON.stringify({
        ok: false,
        error: "postcode required"
      }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
        status: 400
      });
    }

    console.log(`Resolving DNSP for postcode ${postcode}, version ${version}`);

    const { data, error } = await supabase
      .from("dnsps_static")
      .select("*")
      .eq("version", version)
      .eq("postcode", postcode)
      .limit(5);
    
    if (error) {
      console.error("Database error:", error);
      return new Response(JSON.stringify({
        ok: false,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    console.log(`Found ${data?.length || 0} results for postcode ${postcode}`);

    return new Response(JSON.stringify({
      ok: true,
      results: data || [],
      version,
      postcode
    }), {
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  } catch (e: any) {
    console.error("Resolve error:", e);
    return new Response(JSON.stringify({
      ok: false,
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  }
});