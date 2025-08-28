import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentAnalysisRequest {
  text: string;
  documentType: 'bill' | 'proposal';
  filename?: string;
}

interface ExtractedData {
  // Address & Location
  address?: string;
  postcode?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  
  // Bill Data
  retailer?: string;
  planName?: string;
  accountNumber?: string;
  usage?: number; // kWh
  billAmount?: number;
  dailySupply?: number; // cents per day
  rate?: number; // average rate
  
  // Time of Use Data
  peakUsage?: number;
  offPeakUsage?: number;
  shoulderUsage?: number;
  peakRate?: number;
  offPeakRate?: number;
  shoulderRate?: number;
  
  // Solar Detection Data
  solarExportKwh?: number; // kWh exported to grid
  solarFeedInRate?: number; // feed-in tariff rate c/kWh
  solarCreditAmount?: number; // dollar amount credited
  hasSolar?: boolean; // true if solar detected
  estimatedSolarSize?: number; // estimated system size kW
  
  // System Data (from proposals)
  systemSize?: number; // kW
  panelCount?: number;
  panelBrand?: string;
  panelModel?: string;
  panelWattage?: number;
  
  inverterBrand?: string;
  inverterModel?: string;
  inverterSize?: number; // kW
  inverterCount?: number;
  
  batteryBrand?: string;
  batteryModel?: string;
  batterySize?: number; // kWh
  batteryCount?: number;
  
  // Site Data
  roofTilt?: number;
  roofAzimuth?: number;
  shadingFactor?: number;
  
  // Financial
  systemPrice?: number;
  estimatedGeneration?: number; // kWh/year
  paybackPeriod?: number; // years
  
  // Confidence scores
  confidence: number;
  extractedFields: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, documentType, filename }: DocumentAnalysisRequest = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`🔍 Analyzing ${documentType} document: ${filename || 'Unknown'}`);
    console.log(`📄 Text length: ${text.length} characters`);

    const systemPrompt = documentType === 'bill' 
      ? getBillAnalysisPrompt() 
      : getProposalAnalysisPrompt();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this ${documentType} document and extract all relevant data:\n\n${text}` }
        ],
        max_completion_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    let extractedData: ExtractedData;
    try {
      extractedData = JSON.parse(data.choices[0].message.content) as ExtractedData;
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      console.log('Raw OpenAI response:', data.choices[0].message.content);
      
      // Fallback: try to extract what we can from the raw content
      const content = data.choices[0].message.content;
      extractedData = {
        confidence: 50,
        extractedFields: ['fallback_parsing'],
        // Add basic extraction fallback here if needed
      };
    }

    console.log(`✅ Successfully extracted ${extractedData.extractedFields?.length || 0} fields`);
    console.log(`🎯 Confidence: ${extractedData.confidence}%`);

    return new Response(JSON.stringify({
      success: true,
      data: extractedData,
      documentType,
      filename
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in ai-document-analyzer:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getBillAnalysisPrompt(): string {
  return `You are an expert at analyzing Australian electricity bills. Extract ALL relevant data from the bill text and return it as JSON.

EXTRACTION RULES:
1. Address: Look for "Service Address", "Property Address", "Supply Address", or similar
2. Retailer: Identify the energy company (AGL, Origin, Energy Australia, etc.)
3. Usage: Extract kWh consumption, both total and time-of-use breakdown
4. Rates: Extract cents per kWh for peak, off-peak, shoulder periods
5. Billing: Extract total bill amount and daily supply charges
6. Account: Extract account numbers if present

SOLAR FEED-IN DETECTION (CRITICAL):
7. Solar Credits: Look for "Feed-in Tariff", "Solar Credit", "Solar Export", "Feed In Credit", or similar terms
8. Export Amount: Extract kWh exported to grid (indicates solar system size)
9. Feed-in Rate: Extract cents per kWh for solar exports
10. Solar Revenue: Extract dollar amount credited for solar exports

SOLAR SYSTEM DETECTION:
- If ANY solar feed-in credits are found, customer HAS solar panels
- Estimate system size from monthly export: small exports (0-200kWh) = ~3-6kW, medium (200-800kWh) = ~6-10kW, large (800+kWh) = 10kW+
- Look for solar generation vs consumption ratios

TIME OF USE PATTERNS:
- Peak: Usually weekdays 2pm-8pm or similar
- Off-Peak: Usually nights and weekends
- Shoulder: Usually morning/evening transition periods

AUSTRALIAN POSTAL CODES:
- Must be 4 digits between 1000-9999
- Match with the service address

Return JSON with this exact structure:
{
  "address": "full service address or null",
  "postcode": "4-digit postcode or null",
  "state": "state abbreviation or null",
  "retailer": "energy retailer name or null",
  "planName": "plan name if found or null",
  "usage": "total kWh usage number or null",
  "billAmount": "total bill amount number or null",
  "dailySupply": "daily supply charge in cents or null",
  "rate": "average rate in c/kWh or null",
  "peakUsage": "peak period kWh or null",
  "offPeakUsage": "off-peak period kWh or null",
  "shoulderUsage": "shoulder period kWh or null",
  "peakRate": "peak rate in c/kWh or null",
  "offPeakRate": "off-peak rate in c/kWh or null",
  "shoulderRate": "shoulder rate in c/kWh or null",
  "solarExportKwh": "kWh exported to grid or null",
  "solarFeedInRate": "feed-in tariff rate in c/kWh or null",
  "solarCreditAmount": "dollar amount credited for solar or null",
  "hasSolar": "true if solar feed-in detected, false otherwise",
  "estimatedSolarSize": "estimated system size in kW based on exports or null",
  "confidence": "confidence percentage 0-100",
  "extractedFields": ["list of successfully extracted field names"]
}`;
}

function getProposalAnalysisPrompt(): string {
  return `You are an expert at analyzing solar system proposals and quotes. Extract ALL technical specifications, pricing, and site details.

EXTRACTION FOCUS:
1. SYSTEM COMPONENTS:
   - Solar panels: brand, model, wattage, quantity
   - Inverters: brand, model, size (kW), quantity
   - Batteries: brand, model, capacity (kWh/Ah), quantity
   - Total system size in kW

2. SITE INFORMATION:
   - Installation address
   - Roof details: tilt angle, azimuth/orientation
   - Shading analysis results
   - Site conditions

3. FINANCIAL DATA:
   - System price (total cost)
   - Rebates and incentives
   - Estimated payback period
   - Annual generation estimates

4. TECHNICAL SPECIFICATIONS:
   - Panel efficiency ratings
   - Inverter specifications
   - Battery specifications
   - Monitoring systems

BRAND RECOGNITION:
Common solar brands: SunPower, LG, Jinko, Trina, Canadian Solar, REC, Q-Cells
Common inverter brands: Fronius, SMA, SolarEdge, Enphase, Huawei, ABB
Common battery brands: Tesla, LG Chem, BYD, Pylontech, Alpha ESS

Return JSON with this exact structure:
{
  "address": "installation address or null",
  "postcode": "4-digit postcode or null",
  "systemSize": "total system size in kW or null",
  "panelCount": "number of panels or null",
  "panelBrand": "panel manufacturer or null",
  "panelModel": "panel model or null",
  "panelWattage": "individual panel wattage or null",
  "inverterBrand": "inverter manufacturer or null",
  "inverterModel": "inverter model or null",
  "inverterSize": "inverter size in kW or null",
  "inverterCount": "number of inverters or null",
  "batteryBrand": "battery manufacturer or null",
  "batteryModel": "battery model or null",
  "batterySize": "battery capacity in kWh or null",
  "batteryCount": "number of battery units or null",
  "roofTilt": "roof tilt angle in degrees or null",
  "roofAzimuth": "roof azimuth in degrees (0=North) or null",
  "shadingFactor": "shading percentage or null",
  "systemPrice": "total system price or null",
  "estimatedGeneration": "annual generation in kWh or null",
  "paybackPeriod": "payback period in years or null",
  "confidence": "confidence percentage 0-100",
  "extractedFields": ["list of successfully extracted field names"]
}`;
}