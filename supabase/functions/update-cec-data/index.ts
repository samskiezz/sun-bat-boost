import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'
// @ts-ignore
import pdf from 'https://esm.sh/pdf-parse@1.1.1'
import { parse } from 'https://esm.sh/fast-csv@4.3.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Data source URLs
const DATA_PANELS_XLSX = 'https://www.solar.vic.gov.au/sites/default/files/2025-08/Solar%20PV%20Panels%20Product%20List.xlsx'
const DATA_BATTERIES_PDF = 'https://assets.cleanenergycouncil.org.au/documents/products/CEC-Approved-Batteries.pdf'
const DATA_INVERTERS_PDF = 'https://assets.cleanenergycouncil.org.au/documents/products/Approved-Inverters.pdf'
const DATA_POSTCODE_ZONE_CSV = 'https://raw.githubusercontent.com/misc-oz/oz-postcode-zone-map/main/postcode_zone.csv'

async function fetchBuffer(url: string): Promise<ArrayBuffer> {
  console.log(`Fetching data from: ${url}`)
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`)
  return await res.arrayBuffer()
}

function parsePanels(buf: ArrayBuffer) {
  console.log('Parsing panels XLSX data...')
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '' })

  // Try common headers used by Solar Victoria list
  return rows.map(r => {
    const brand = (r.Brand || r['Manufacturer'] || '').toString().trim()
    const model = (r.Model || r['Model Number'] || '').toString().trim()
    const watts = Number(r['Wattage'] || r['Module Wattage'] || r['Power (W)'] || 0)
    const cec_id = (r['CEC Listing'] || r['CEC ID'] || r['CEC Listing Number'] || '').toString().trim()
    const technology = (r['Technology'] || r['Cell Type'] || '').toString().trim()
    return { brand, model, watts, cec_id, technology }
  }).filter(x => x.brand && x.model && x.cec_id)
}

async function parseBatteriesPdf(buf: ArrayBuffer) {
  console.log('Parsing batteries PDF data...')
  const txt = (await pdf(Buffer.from(buf))).text
  const lines = txt.split('\n').map(s => s.trim()).filter(Boolean)

  const items: Array<{brand:string; model:string; cec_id:string; usable_capacity_kwh?:number}> = []
  for (const s of lines) {
    // Example line pattern: "BrandX  Model-123  CEC-ABC-999  13.5 kWh usable"
    const m = s.match(/^([A-Za-z0-9\-\&\.\s]+?)\s{2,}([A-Za-z0-9\-\.\s\/\+]+?)\s{2,}(CEC[-\s]?\w+|\w{3,}\d{2,})/i)
    if (m) {
      const brand = m[1].trim()
      const model = m[2].trim()
      const cec_id = m[3].replace(/\s+/g,'-').toUpperCase()
      const k = s.match(/(\d+(\.\d+)?)\s*kWh/i)
      items.push({ brand, model, cec_id, usable_capacity_kwh: k ? Number(k[1]) : undefined })
    }
  }
  // De-dup
  const seen = new Set<string>()
  return items.filter(i => {
    const key = `${i.brand}|${i.model}|${i.cec_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function parseInvertersPdf(buf: ArrayBuffer) {
  console.log('Parsing inverters PDF data...')
  const txt = (await pdf(Buffer.from(buf))).text
  const lines = txt.split('\n').map(s => s.trim()).filter(Boolean)
  const items: Array<{brand:string; model:string; cec_id:string; ac_output_kw?:number}> = []

  for (const s of lines) {
    const m = s.match(/^([A-Za-z0-9\-\&\.\s]+?)\s{2,}([A-Za-z0-9\-\.\s\/\+]+?)\s{2,}(CEC[-\s]?\w+|\w{3,}\d{2,})/i)
    if (m) {
      const brand = m[1].trim()
      const model = m[2].trim()
      const cec_id = m[3].replace(/\s+/g,'-').toUpperCase()
      const ac = s.match(/(\d+(\.\d+)?)\s*kW(AC)?/i)
      items.push({ brand, model, cec_id, ac_output_kw: ac ? Number(ac[1]) : undefined })
    }
  }
  const seen = new Set<string>()
  return items.filter(i => { 
    const k = `${i.brand}|${i.model}|${i.cec_id}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function parsePostcodesCSV(csvText: string): Promise<Array<{postcode: number; zone: number; state: string}>> {
  return new Promise((resolve, reject) => {
    const out: any[] = []
    const stream = parse({ headers: true, ignoreEmpty: true })
      .on('error', reject)
      .on('data', (r) => out.push({ 
        postcode: Number(r.postcode), 
        zone: Number(r.zone), 
        state: r.state 
      }))
      .on('end', () => resolve(out))
    
    stream.write(csvText)
    stream.end()
  })
}

async function upsertPanels(supabase: any, rows: any[]) {
  console.log(`Upserting ${rows.length} panels...`)
  const chunks = chunk(rows, 500)
  for (const c of chunks) {
    const { error } = await supabase
      .from('cec_panels')
      .upsert(c.map(r => ({
        brand: r.brand, 
        model: r.model, 
        cec_id: r.cec_id, 
        watts: r.watts,
        technology: r.technology,
        is_active: true,
        model_number: r.model // Use model as model_number for now
      })), { onConflict: 'cec_id' })
    if (error) throw error
  }
}

async function upsertBatteries(supabase: any, rows: any[]) {
  console.log(`Upserting ${rows.length} batteries...`)
  const chunks = chunk(rows, 500)
  for (const c of chunks) {
    const { error } = await supabase
      .from('cec_batteries')
      .upsert(c.map(r => ({
        brand: r.brand, 
        model: r.model, 
        cec_id: r.cec_id, 
        usable_capacity_kwh: r.usable_capacity_kwh ?? null,
        capacity_kwh: r.usable_capacity_kwh ?? null, // Use usable as total for now
        is_active: true,
        model_number: r.model // Use model as model_number for now
      })), { onConflict: 'cec_id' })
    if (error) throw error
  }
}

async function upsertInverters(supabase: any, rows: any[]) {
  console.log(`Upserting ${rows.length} inverters...`)
  const chunks = chunk(rows, 500)
  for (const c of chunks) {
    const { error } = await supabase
      .from('cec_inverters')
      .upsert(c.map(r => ({
        brand: r.brand, 
        model: r.model, 
        cec_id: r.cec_id, 
        ac_output_kw: r.ac_output_kw ?? null,
        is_active: true,
        model_number: r.model // Use model as model_number for now
      })), { onConflict: 'cec_id' })
    if (error) throw error
  }
}

async function upsertPostcodes(supabase: any, rows: any[]) {
  console.log(`Upserting ${rows.length} postcodes...`)
  const chunks = chunk(rows, 1000)
  for (const c of chunks) {
    const { error } = await supabase
      .from('postcode_zones')
      .upsert(c, { onConflict: 'postcode' })
    if (error) throw error
  }
}

function chunk<T>(arr: T[], size = 1000): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const started = new Date().toISOString()
    console.log('Starting CEC data refresh...', started)

    // Create refresh log entry
    const { data: logData, error: logError } = await supabase
      .from('refresh_log')
      .insert({
        source: 'auto-refresh',
        status: 'running',
        details: 'Starting data fetch and parse',
        fetched_at: started
      })
      .select()
      .single()

    if (logError) {
      console.error('Failed to create log entry:', logError)
      throw logError
    }

    try {
      // Fetch all data sources in parallel
      console.log('Fetching data from all sources...')
      const [panXBuf, batPBuf, invPBuf, pcCsvBuf] = await Promise.all([
        fetchBuffer(DATA_PANELS_XLSX),
        fetchBuffer(DATA_BATTERIES_PDF),
        fetchBuffer(DATA_INVERTERS_PDF),
        fetchBuffer(DATA_POSTCODE_ZONE_CSV)
      ])

      // Parse all data
      console.log('Parsing all data sources...')
      const panels = parsePanels(panXBuf)
      const batteries = await parseBatteriesPdf(batPBuf)
      const inverters = await parseInvertersPdf(invPBuf)
      const postcodes = await parsePostcodesCSV(new TextDecoder().decode(pcCsvBuf))

      console.log('Parsed data counts:', {
        panels: panels.length,
        batteries: batteries.length,
        inverters: inverters.length,
        postcodes: postcodes.length
      })

      // Upsert all data to database
      console.log('Upserting data to database...')
      await Promise.all([
        upsertPanels(supabase, panels),
        upsertBatteries(supabase, batteries),
        upsertInverters(supabase, inverters),
        upsertPostcodes(supabase, postcodes)
      ])

      // Update log entry with success
      const details = `panels:${panels.length} batteries:${batteries.length} inverters:${inverters.length} postcodes:${postcodes.length}`
      await supabase
        .from('refresh_log')
        .update({
          status: 'ok',
          details: details
        })
        .eq('id', logData.id)

      console.log('CEC data refresh completed successfully')

      return new Response(
        JSON.stringify({ 
          ok: true, 
          started, 
          counts: {
            panels: panels.length, 
            batteries: batteries.length, 
            inverters: inverters.length,
            postcodes: postcodes.length
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (error) {
      console.error('Error during data refresh:', error)
      
      // Update log entry with error
      await supabase
        .from('refresh_log')
        .update({
          status: 'error',
          details: String(error)
        })
        .eq('id', logData.id)

      throw error
    }

  } catch (error) {
    console.error('CEC data refresh failed:', error)
    
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})