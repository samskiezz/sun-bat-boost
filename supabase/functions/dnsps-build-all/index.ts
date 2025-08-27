import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as turf from "https://esm.sh/@turf/turf@6.5.0";

type DnspMeta = { code: string; name: string; export_cap_kw?: number; flex?: boolean; phase?: string };

const DNSP_LIST: DnspMeta[] = [
  { code: "AUSGRID", name: "Ausgrid" },
  { code: "ENDEAVOUR", name: "Endeavour Energy" },
  { code: "ESSENTIAL", name: "Essential Energy" },
  { code: "EVOENERGY", name: "Evoenergy (ACT)" },
  { code: "ENERGEX", name: "Energex (SEQ)" },
  { code: "ERGON", name: "Ergon Energy (regional QLD)" },
  { code: "SAPN", name: "SA Power Networks" },
  { code: "CITIPOWER", name: "CitiPower" },
  { code: "POWERCOR", name: "Powercor" },
  { code: "UNITED", name: "United Energy" },
  { code: "AUSNET", name: "AusNet Services" },
  { code: "TASNETWORKS", name: "TasNetworks" },
  { code: "WESTERN_POWER", name: "Western Power (SWIS)" },
  { code: "POWERWATER", name: "Power and Water (NT)" }
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchJSON(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + " " + r.status);
  return await r.json();
}

// Full ABS POA 2021 GeoJSON (national)
const ABS_POA_GEOJSON_URL =
  "https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/POA/MapServer/0/query?where=1%3D1&outFields=poa_code_2021%2Cstate_name_2021&outSR=4326&f=geojson";

async function loadAllPostcodes(): Promise<GeoJSON.FeatureCollection> {
  console.log("Loading all ABS POA 2021 postcodes...");
  return await fetchJSON(ABS_POA_GEOJSON_URL);
}

async function loadDnspGeojsonFromStorage(supabase: any, code: string) {
  console.log(`Loading DNSP GeoJSON for ${code}...`);
  const { data: signed } = await supabase
    .storage.from("gis")
    .createSignedUrl(`dnsp/${code}.geojson`, 60 * 10);
  if (!signed?.signedUrl) throw new Error("Missing GIS file for " + code);
  return await fetchJSON(signed.signedUrl);
}

function featureArea(f: any) {
  try {
    return turf.area(f);
  } catch {
    return 0;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting DNSP build process...");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const url = new URL(req.url);
    const version = url.searchParams.get("version") || "v1";
    const defaultCap = Number(url.searchParams.get("cap_kw") || "5");
    const defaultPhase = url.searchParams.get("phase") || "1P<=5kW;3P<=10kW";

    console.log(`Building version: ${version}`);

    // Load all postcode polygons
    const poa = await loadAllPostcodes();
    console.log(`Loaded ${poa.features?.length || 0} postcode polygons`);

    // Load DNSP polygons from storage
    const dnspPolys: Record<string, any> = {};
    for (const d of DNSP_LIST) {
      try {
        dnspPolys[d.code] = await loadDnspGeojsonFromStorage(supabase, d.code);
        console.log(`Loaded ${d.code}: ${dnspPolys[d.code]?.features?.length || 0} features`);
      } catch (e) {
        console.warn("DNSP missing", d.code, e);
      }
    }

    // Clear existing rows for this version
    console.log(`Clearing existing data for version ${version}...`);
    await supabase.from("dnsps_static").delete().eq("version", version);

    let mapped = 0, ties = 0, missingGeom = 0;
    const rows: any[] = [];

    console.log("Starting spatial intersection analysis...");
    for (const f of (poa.features || [])) {
      const postcodeStr = f.properties?.poa_code_2021 || f.properties?.POA_CODE21 || "";
      const state = f.properties?.state_name_2021 || f.properties?.STE_NAME21 || "Unknown";
      const postcode = Number(postcodeStr);
      
      if (!postcode || !f.geometry) {
        missingGeom++;
        continue;
      }

      if (mapped % 100 === 0) {
        console.log(`Processed ${mapped} postcodes...`);
      }

      // Find DNSP with max overlap
      const poaFeat = turf.feature(f.geometry);
      const poaArea = featureArea(poaFeat);
      let best: { code: string; name: string; pct: number } | null = null;
      let secondPct = 0;

      for (const d of DNSP_LIST) {
        const poly = dnspPolys[d.code];
        if (!poly?.features?.length) continue;

        // Quick bbox intersection check first
        try {
          const bbox = turf.bbox(poly);
          if (!turf.booleanIntersects(poaFeat, turf.bboxPolygon(bbox))) continue;
        } catch {
          continue;
        }

        // Intersect with each feature in the DNSP collection
        let overlapArea = 0;
        for (const g of poly.features) {
          if (!g.geometry) continue;
          let inter: any = null;
          try {
            if (turf.booleanIntersects(poaFeat, g)) {
              inter = turf.intersect(poaFeat, g as any);
            }
          } catch {
            // Skip problematic geometries
          }
          if (inter) overlapArea += featureArea(inter);
        }

        if (overlapArea <= 0 || poaArea <= 0) continue;

        const pct = overlapArea / poaArea;
        if (!best || pct > best.pct) {
          secondPct = best?.pct || 0;
          best = { code: d.code, name: d.name, pct };
        }
      }

      if (!best) {
        // Fallback heuristic by state if nothing intersects
        const fallback =
          state.startsWith("New South") ? { code: "AUSGRID", name: "Ausgrid" } :
          state.startsWith("Victoria") ? { code: "POWERCOR", name: "Powercor" } :
          state.startsWith("Queensland") ? { code: "ENERGEX", name: "Energex (SEQ)" } :
          state.startsWith("South") ? { code: "SAPN", name: "SA Power Networks" } :
          state.startsWith("Tasmania") ? { code: "TASNETWORKS", name: "TasNetworks" } :
          state.startsWith("Western") ? { code: "WESTERN_POWER", name: "Western Power (SWIS)" } :
          state.startsWith("Northern") ? { code: "POWERWATER", name: "Power and Water (NT)" } :
          state.startsWith("Australian") ? { code: "EVOENERGY", name: "Evoenergy (ACT)" } :
          { code: "AUSGRID", name: "Ausgrid" };

        rows.push({
          state,
          postcode,
          dnsp_code: fallback.code,
          dnsp_name: fallback.name,
          overlap_pct: 0,
          export_cap_kw: defaultCap,
          supports_flexible_export: false,
          phase_limit: defaultPhase,
          version,
          source: "builder"
        });
        mapped++;
        continue;
      }

      if (secondPct > 0 && (best.pct - secondPct) < 0.05) ties++; // flag ambiguous overlaps

      rows.push({
        state,
        postcode,
        dnsp_code: best.code,
        dnsp_name: best.name,
        overlap_pct: Number(best.pct.toFixed(6)),
        export_cap_kw: defaultCap,
        supports_flexible_export: best.code === "SAPN", // example special-case
        phase_limit: defaultPhase,
        version,
        source: "builder"
      });
      mapped++;
    }

    console.log(`Inserting ${rows.length} rows into database...`);

    // Batch insert in chunks
    const CHUNK = 1000;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase.from("dnsps_static").insert(chunk);
      if (error) throw error;
      console.log(`Inserted chunk ${Math.floor(i / CHUNK) + 1}/${Math.ceil(rows.length / CHUNK)}`);
    }

    const result = {
      ok: true,
      version,
      mapped,
      total: (poa.features || []).length,
      ties,
      missingGeom,
      dnsp_files_loaded: Object.keys(dnspPolys).length
    };

    console.log("Build completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  } catch (e: any) {
    console.error("Build failed:", e);
    return new Response(JSON.stringify({
      ok: false,
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  }
});