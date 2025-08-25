// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import cheerio from "npm:cheerio@1.0.0-rc.12";
import { createClient } from "npm:@supabase/supabase-js@2.56.0";

// ENV you will set in Supabase: URLs + service key + (optional) browserless token
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CEC_PV_URL = Deno.env.get("CEC_PV_URL") ?? "https://cleanenergycouncil.org.au/industry-programs/products-program/modules";
const CEC_BAT_URL = Deno.env.get("CEC_BAT_URL") ?? "https://cleanenergycouncil.org.au/industry-programs/products-program/batteries";
const BROWSERLESS_URL = Deno.env.get("BROWSERLESS_URL"); // e.g. https://chrome.browserless.io/content?token=XXXX

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

function sha1(s: string) {
  const data = new TextEncoder().encode(s);
  const digest = crypto.subtle.digestSync("SHA-1", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function fetchHtml(url: string): Promise<string> {
  console.log(`Fetching HTML from: ${url}`);
  // Try plain fetch first
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 SupabaseEdgeBot" } });
  const text = await res.text();
  console.log(`Fetched ${text.length} characters from ${url}`);

  // If there are no table rows, fall back to headless (if available)
  if (!/table|tbody|tr/i.test(text) && BROWSERLESS_URL) {
    console.log("No table found, trying browserless...");
    const br = await fetch(`${BROWSERLESS_URL}&url=${encodeURIComponent(url)}&wait=2000`);
    if (br.ok) return await br.text();
  }
  return text;
}

function parseDateMaybe(s?: string) {
  if (!s) return null;
  const d = new Date(s.trim());
  return isNaN(+d) ? null : d.toISOString().slice(0,10);
}

async function upsertPV(items: any[]) {
  if (!items.length) return;
  console.log(`Processing ${items.length} PV modules...`);
  
  const { data: existing, error: selErr } = await sb.from("pv_modules").select("brand, model, hash");
  if (selErr) throw selErr;

  const map = new Map(existing?.map(r => [`${r.brand}||${r.model}`, r.hash]) ?? []);
  const toUpsert: any[] = [];
  const toAudit: any[] = [];

  for (const it of items) {
    const key = `${it.brand}||${it.model}`;
    const newHash = sha1([it.brand, it.model, it.technology, it.certificate, it.approval_status, it.approval_expires, it.datasheet_url].join("|"));
    const oldHash = map.get(key);
    if (oldHash !== newHash) {
      toUpsert.push({ ...it, hash: newHash });
      if (oldHash) {
        toAudit.push({ product_type: "pv", brand: it.brand, model: it.model, old_hash: oldHash, new_hash: newHash });
      }
    }
  }

  // batch upsert
  while (toUpsert.length) {
    const chunk = toUpsert.splice(0, 500);
    const { error } = await sb.from("pv_modules").upsert(chunk, { onConflict: "brand,model" });
    if (error) throw error;
  }
  if (toAudit.length) {
    const { error } = await sb.from("product_changes").insert(toAudit);
    if (error) console.warn("audit insert warn:", error.message);
  }
  
  console.log(`Successfully processed ${items.length} PV modules`);
}

async function upsertBAT(items: any[]) {
  if (!items.length) return;
  console.log(`Processing ${items.length} batteries...`);
  
  const { data: existing, error: selErr } = await sb.from("batteries").select("brand, model, hash");
  if (selErr) throw selErr;

  const map = new Map(existing?.map(r => [`${r.brand}||${r.model}`, r.hash]) ?? []);
  const toUpsert: any[] = [];
  const toAudit: any[] = [];

  for (const it of items) {
    const key = `${it.brand}||${it.model}`;
    const newHash = sha1([it.brand, it.model, it.chemistry, it.certificate, it.approval_status, it.approval_expires, it.datasheet_url].join("|"));
    const oldHash = map.get(key);
    if (oldHash !== newHash) {
      toUpsert.push({ ...it, hash: newHash });
      if (oldHash) {
        toAudit.push({ product_type: "battery", brand: it.brand, model: it.model, old_hash: oldHash, new_hash: newHash });
      }
    }
  }

  while (toUpsert.length) {
    const chunk = toUpsert.splice(0, 500);
    const { error } = await sb.from("batteries").upsert(chunk, { onConflict: "brand,model" });
    if (error) throw error;
  }
  if (toAudit.length) {
    const { error } = await sb.from("product_changes").insert(toAudit);
    if (error) console.warn("audit insert warn:", error.message);
  }
  
  console.log(`Successfully processed ${items.length} batteries`);
}

// ------- Parsers (adjust selectors as the CEC DOM evolves) -------
function parsePV(html: string, source_url: string) {
  console.log("Parsing PV modules HTML...");
  const $ = cheerio.load(html);
  const rows = $("table tbody tr");
  const out: any[] = [];

  if (rows.length) {
    console.log(`Found ${rows.length} table rows`);
    rows.each((_, tr) => {
      const tds = $(tr).find("td").toArray().map(td => $(td).text().trim());
      // Heuristic mapping (update if the column order changes on CEC)
      const [brand, model, technology, certificate, status, expiry] = tds;
      if (brand && model) {
        out.push({
          brand, model,
          technology: technology || null,
          certificate: certificate || null,
          approval_status: status || null,
          approval_expires: parseDateMaybe(expiry),
          datasheet_url: null,
          source_url
        });
      }
    });
  } else {
    console.log("No table found, trying card layout...");
    // Fallback: cards layout - try various selectors
    const selectors = [
      '[class*="card"]', 
      '[class*="result"]', 
      '.product-item', 
      '.module-item',
      '[data-testid*="product"]',
      '.list-item',
      '.search-result'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        elements.each((_, el) => {
          const text = $(el).text().trim().replace(/\s+/g, " ");
          // Try multiple patterns for brand/model extraction
          let brand = "";
          let model = "";
          
          // Pattern 1: Brand: xxx Model: yyy
          const brandMatch = text.match(/Brand:\s*([^\|,\n]+)/i);
          const modelMatch = text.match(/Model:\s*([^\|,\n]+)/i);
          
          if (brandMatch && modelMatch) {
            brand = brandMatch[1].trim();
            model = modelMatch[1].trim();
          } else {
            // Pattern 2: Look for common brand names at start
            const commonBrands = ['Trina', 'JinkoSolar', 'Canadian Solar', 'LONGi', 'Q CELLS', 'REC', 'SunPower'];
            for (const b of commonBrands) {
              if (text.toLowerCase().includes(b.toLowerCase())) {
                brand = b;
                // Try to extract model after brand
                const parts = text.split(/\s+/);
                const brandIndex = parts.findIndex(p => p.toLowerCase().includes(b.toLowerCase()));
                if (brandIndex >= 0 && brandIndex < parts.length - 1) {
                  model = parts.slice(brandIndex + 1, brandIndex + 3).join(' ');
                }
                break;
              }
            }
          }
          
          if (brand && model) {
            out.push({ 
              brand, 
              model, 
              technology: null, 
              certificate: null, 
              approval_status: 'approved', 
              approval_expires: null, 
              datasheet_url: null, 
              source_url 
            });
          }
        });
        if (out.length > 0) break; // Found products, stop trying other selectors
      }
    }
  }
  
  console.log(`Extracted ${out.length} PV modules`);
  return out.filter(r => r.brand && r.model);
}

function parseBAT(html: string, source_url: string) {
  console.log("Parsing battery HTML...");
  const $ = cheerio.load(html);
  const rows = $("table tbody tr");
  const out: any[] = [];

  if (rows.length) {
    console.log(`Found ${rows.length} table rows`);
    rows.each((_, tr) => {
      const tds = $(tr).find("td").toArray().map(td => $(td).text().trim());
      // Heuristic mapping
      const [brand, model, chemistry, certificate, status, expiry] = tds;
      if (brand && model) {
        out.push({
          brand, model,
          chemistry: chemistry || null,
          certificate: certificate || null,
          approval_status: status || null,
          approval_expires: parseDateMaybe(expiry),
          datasheet_url: null,
          source_url
        });
      }
    });
  } else {
    console.log("No table found, trying card layout...");
    const selectors = [
      '[class*="card"]', 
      '[class*="result"]', 
      '.product-item', 
      '.battery-item',
      '[data-testid*="product"]',
      '.list-item',
      '.search-result'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        elements.each((_, el) => {
          const text = $(el).text().trim().replace(/\s+/g, " ");
          let brand = "";
          let model = "";
          
          // Pattern 1: Brand: xxx Model: yyy
          const brandMatch = text.match(/Brand:\s*([^\|,\n]+)/i);
          const modelMatch = text.match(/Model:\s*([^\|,\n]+)/i);
          
          if (brandMatch && modelMatch) {
            brand = brandMatch[1].trim();
            model = modelMatch[1].trim();
          } else {
            // Pattern 2: Look for common battery brands
            const commonBrands = ['Tesla', 'Sonnen', 'Enphase', 'Alpha ESS', 'BYD', 'Pylontech', 'Sungrow', 'Huawei', 'LG'];
            for (const b of commonBrands) {
              if (text.toLowerCase().includes(b.toLowerCase())) {
                brand = b;
                const parts = text.split(/\s+/);
                const brandIndex = parts.findIndex(p => p.toLowerCase().includes(b.toLowerCase()));
                if (brandIndex >= 0 && brandIndex < parts.length - 1) {
                  model = parts.slice(brandIndex + 1, brandIndex + 3).join(' ');
                }
                break;
              }
            }
          }
          
          if (brand && model) {
            out.push({ 
              brand, 
              model, 
              chemistry: 'LiFePO4', 
              certificate: null, 
              approval_status: 'approved', 
              approval_expires: null, 
              datasheet_url: null, 
              source_url 
            });
          }
        });
        if (out.length > 0) break;
      }
    }
  }
  
  console.log(`Extracted ${out.length} batteries`);
  return out.filter(r => r.brand && r.model);
}

// ------- HTTP entrypoint -------
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "run"; // run | dry | ping

    if (mode === "ping") {
      return new Response(JSON.stringify({ ok: true }), { 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }

    console.log(`Starting CEC data scraping in ${mode} mode...`);

    // Fetch + parse PV
    const pvHtml = await fetchHtml(CEC_PV_URL);
    const pvItems = parsePV(pvHtml, CEC_PV_URL);
    if (mode !== "dry") await upsertPV(pvItems);

    // Fetch + parse Batteries
    const batHtml = await fetchHtml(CEC_BAT_URL);
    const batItems = parseBAT(batHtml, CEC_BAT_URL);
    if (mode !== "dry") await upsertBAT(batItems);

    console.log(`CEC scraping completed successfully - ${pvItems.length} PV modules, ${batItems.length} batteries`);

    return new Response(JSON.stringify({
      ok: true,
      success: true,
      mode,
      counts: { pv: pvItems.length, batteries: batItems.length }
    }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    
  } catch (e) {
    console.error("CEC scraping failed:", e);
    return new Response(JSON.stringify({ 
      ok: false, 
      success: false,
      error: String(e?.message || e) 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "content-type": "application/json" } 
    });
  }
});