// functions/cec_scrape/index.ts
// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.56.0";
import * as XLSX from "npm:xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PAGE = "https://www.solar.vic.gov.au/product-lists"; // master page
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

function sha1(s: string) {
  const bytes = new TextEncoder().encode(s);
  const digest = crypto.subtle.digestSync("SHA-1", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("");
}

async function fetchText(url: string) {
  console.log(`Fetching text from: ${url}`);
  const r = await fetch(url, { headers: { "user-agent": "Hilts-SupabaseBot/1.0" } });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return await r.text();
}

async function fetchArrayBuffer(url: string) {
  console.log(`Fetching Excel file from: ${url}`);
  const r = await fetch(url, { headers: { "user-agent": "Hilts-SupabaseBot/1.0" } });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return await r.arrayBuffer();
}

// Find latest Excel links for PV & Batteries on the Solar Victoria page
function extractLatestLinks(html: string) {
  console.log("Extracting Excel links from Solar Victoria page...");
  // super simple href scan
  const hrefs = Array.from(html.matchAll(/href="([^"]+\.xlsx?)"[^>]*>([^<]+)<\/a>/gi))
    .map(m => ({ url: new URL(m[1], PAGE).toString(), text: m[2].toLowerCase() }));

  console.log(`Found ${hrefs.length} Excel links:`, hrefs.map(h => h.text));

  const pick = (needle: RegExp) =>
    hrefs.find(h => needle.test(h.text))?.url ?? null;

  const pvUrl = pick(/solar panel.*product list|pv product list|solar panel \(pv\) product list/);
  const batUrl = pick(/battery product list/);

  if (!pvUrl) throw new Error("PV Excel link not found on Solar Victoria page");
  if (!batUrl) throw new Error("Battery Excel link not found on Solar Victoria page");
  
  console.log(`Found PV URL: ${pvUrl}`);
  console.log(`Found Battery URL: ${batUrl}`);
  
  return { pvUrl, batUrl };
}

function toRows(buf: ArrayBuffer) {
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const sh = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<any>(sh, { defval: "" });
}

// Heuristic header mapping (SV changes column titles occasionally)
function norm(s: string) { return s.toLowerCase().replace(/\s+/g," ").trim(); }

function mapPV(row: any, source_url: string) {
  const entries = Object.entries(row);
  const get = (keys: string[]) => {
    const k = entries.find(([h]) => keys.includes(norm(String(h))))?.[1] ?? "";
    return String(k).trim();
  };

  return {
    brand: get(["brand","manufacturer","module brand","panel brand"]),
    model: get(["model","model number","module model number","panel model"]),
    technology: get(["technology","cell tech","cell type"]),
    certificate: get(["certificate","certification","iec standard","iec 61215 standard"]),
    approval_status: get(["status","approval status"]) || "approved",
    approval_expires: get(["expiry","expiry date","approval expiry"]) || null,
    datasheet_url: get(["datasheet","datasheet url","link"]),
    source_url
  };
}

function mapBAT(row: any, source_url: string) {
  const entries = Object.entries(row);
  const get = (keys: string[]) => {
    const k = entries.find(([h]) => keys.includes(norm(String(h))))?.[1] ?? "";
    return String(k).trim();
  };

  return {
    brand: get(["brand","manufacturer"]),
    model: get(["model","model number"]),
    chemistry: get(["chemistry","battery chemistry","cell chemistry","type"]),
    certificate: get(["certificate","certification","standards","iec/ul standard"]),
    approval_status: get(["status","approval status","eligible"]) || "approved",
    approval_expires: get(["expiry","expiry date","approval expiry"]) || null,
    datasheet_url: get(["datasheet","datasheet url","link"]),
    source_url
  };
}

async function upsert(table: "pv_modules"|"batteries", items: any[]) {
  if (!items.length) return { inserted: 0, updated: 0 };
  
  console.log(`Processing ${items.length} items for ${table}...`);
  
  const keys = items.map(i => `${i.brand}||${i.model}`);
  const { data: existing, error: selErr } = await sb.from(table).select("brand,model,hash").in("brand", items.map(i=>i.brand));
  if (selErr) throw selErr;

  const map = new Map((existing ?? []).map(r => [`${r.brand}||${r.model}`, r.hash]));
  const upserts: any[] = [];
  let inserted = 0, updated = 0;

  for (const it of items) {
    const hash = sha1([it.brand,it.model,it.technology||it.chemistry,it.certificate,it.approval_status,it.approval_expires,it.datasheet_url].join("|"));
    const key = `${it.brand}||${it.model}`;
    const old = map.get(key);
    if (old !== hash) {
      upserts.push({ ...it, hash, scraped_at: new Date().toISOString() });
      if (old) updated++; else inserted++;
    }
  }

  console.log(`${table}: ${inserted} new, ${updated} updated`);

  while (upserts.length) {
    const chunk = upserts.splice(0, 500);
    const { error } = await sb.from(table).upsert(chunk, { onConflict: "brand,model" });
    if (error) throw error;
  }
  return { inserted, updated };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "run"; // run|dry|ping

    if (mode === "ping") {
      return new Response(JSON.stringify({ ok: true }), { 
        headers: { ...corsHeaders, "content-type":"application/json" }
      });
    }

    console.log(`Starting Solar Victoria Excel scraping in ${mode} mode...`);

    // 1) discover latest Excel URLs from Solar Victoria page
    const html = await fetchText(PAGE);
    const { pvUrl, batUrl } = extractLatestLinks(html);

    // 2) download files
    const [pvBuf, batBuf] = await Promise.all([fetchArrayBuffer(pvUrl), fetchArrayBuffer(batUrl)]);

    // 3) parse rows
    const pvRows = toRows(pvBuf);
    const batRows = toRows(batBuf);
    
    console.log(`Parsed ${pvRows.length} PV rows and ${batRows.length} battery rows`);

    // 4) map + filter
    const pvItems = pvRows.map(r => mapPV(r, pvUrl)).filter(r => r.brand && r.model);
    const batItems = batRows.map(r => mapBAT(r, batUrl)).filter(r => r.brand && r.model);

    console.log(`Filtered to ${pvItems.length} PV items and ${batItems.length} battery items`);

    if (mode === "dry") {
      return new Response(JSON.stringify({ 
        ok:true, 
        preview:{ pv: pvItems.slice(0,5), batteries: batItems.slice(0,5) }
      }), { 
        headers: { ...corsHeaders, "content-type":"application/json" }
      });
    }

    // 5) upsert
    const pvRes = await upsert("pv_modules", pvItems);
    const batRes = await upsert("batteries", batItems);

    console.log("Solar Victoria Excel scraping completed successfully");

    return new Response(JSON.stringify({
      ok: true,
      success: true,
      source: { pvUrl, batUrl },
      counts: { pv_found: pvItems.length, bat_found: batItems.length },
      upserts: { pv: pvRes, batteries: batRes }
    }), { 
      headers: { ...corsHeaders, "content-type":"application/json" }
    });
    
  } catch (e) {
    console.error("Solar Victoria Excel scraping failed:", e);
    return new Response(JSON.stringify({ 
      ok:false, 
      success: false,
      error: String(e?.message || e) 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "content-type":"application/json" }
    });
  }
});