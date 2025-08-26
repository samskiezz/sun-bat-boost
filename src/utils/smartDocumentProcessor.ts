import { extractTextFromFile } from './pdfTextExtractor';
import { SmartMatcher, Product, MatchHit } from './smartMatcher';
import { supabase } from '@/integrations/supabase/client';

export interface SmartProcessorResult {
  success: boolean;
  extractedData?: {
    panels?: Array<{
      description: string;
      confidence: number;
      quantity?: number;
      watts?: number;
      cecId?: string;
      needsConfirmation?: boolean;
      candidates?: MatchHit[];
      suggestedMatch?: {
        id: string;
        brand: string;
        model: string;
        watts: number;
        cec_id?: string;
        confidence: number;
        matchType: string;
      };
    }>;
    batteries?: Array<{
      description: string;
      confidence: number;
      quantity?: number;
      capacity_kwh?: number;
      cecId?: string;
      needsConfirmation?: boolean;
      candidates?: MatchHit[];
      suggestedMatch?: {
        id: string;
        brand: string;
        model: string;
        capacity_kwh: number;
        cec_id?: string;
        confidence: number;
        matchType: string;
      };
    }>;
    inverters?: Array<{
      description: string;
      confidence: number;
      kw?: number;
      needsConfirmation?: boolean;
      candidates?: MatchHit[];
      suggestedMatch?: {
        id: string;
        brand: string;
        model: string;
        kw: number;
        confidence: number;
        matchType: string;
      };
    }>;
    systemSize?: {
      value: number;
      unit: string;
      confidence: number;
    };
    totalCost?: {
      value: number;
      confidence: number;
    };
    postcode?: {
      value: string;
      confidence: number;
    };
    installer?: {
      name: string;
      confidence: number;
    };
  };
  rawText?: string;
  error?: string;
  detectionMethod?: 'native' | 'ocr' | 'hybrid';
  processingTime?: number;
  matcher?: SmartMatcher; // Expose for UI callbacks
  allProducts?: Product[]; // For correction dropdown
}

export const processSmartDocument = async (file: File): Promise<SmartProcessorResult> => {
  const startTime = Date.now();
  
  try {
    console.log('🧠 Processing with Smart Self-Learning Extractor...');
    
    // Step 1: Extract text from file
    const textExtractionResult = await extractTextFromFile(file);
    const { text, method } = textExtractionResult;
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }
    
    console.log(`📝 Extracted text using ${method} method (${text.length} characters)`);
    
    // Step 2: Load products and initialize SmartMatcher
    const products = await loadProductDatabase();
    const matcher = new SmartMatcher(products);
    await matcher.init();
    
    console.log(`🏭 Loaded ${products.length} products for smart matching`);
    
    // Step 3: Run smart matching
    const hits = matcher.match(text);
    
    console.log(`🎯 Smart matcher found ${hits.length} potential matches`);
    
    // Step 4: Process hits by type and determine what needs confirmation
    const extractedData = await processMatchHits(hits, text, matcher);
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      extractedData,
      rawText: text,
      detectionMethod: method,
      processingTime,
      matcher,
      allProducts: products,
    };
    
  } catch (error) {
    console.error('Smart document processing error:', error);
    const processingTime = Date.now() - startTime;
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process document',
      processingTime,
    };
  }
};

async function loadProductDatabase(): Promise<Product[]> {
  const products: Product[] = [];
  
  // Load panels from pv_modules
  const { data: panels } = await supabase
    .from('pv_modules')
    .select('*')
    .eq('approval_status', 'approved');

  if (panels) {
    for (const panel of panels) {
      products.push({
        id: `panel_${panel.id}`,
        type: 'panel',
        brand: panel.brand,
        model: panel.model,
        aliases: generateBaseAliases(panel.brand, panel.model),
        regex: generateBaseRegex(panel.brand, panel.model, 'panel'),
        specs: { watts: panel.power_rating },
        power_rating: panel.power_rating,
      });
    }
  }

  // Load batteries
  const { data: batteries } = await supabase
    .from('batteries')
    .select('*')
    .eq('approval_status', 'approved');

  if (batteries) {
    for (const battery of batteries) {
      products.push({
        id: `battery_${battery.id}`,
        type: 'battery',
        brand: battery.brand,
        model: battery.model,
        aliases: generateBaseAliases(battery.brand, battery.model),
        regex: generateBaseRegex(battery.brand, battery.model, 'battery'),
        specs: { capacity_kwh: battery.capacity_kwh },
        capacity_kwh: battery.capacity_kwh,
      });
    }
  }

  // Add some hardcoded high-quality patterns for common products
  products.push(
    {
      id: 'goodwe-gw6000-eh',
      type: 'inverter',
      brand: 'GOODWE',
      model: 'GW6000-EH',
      aliases: ['GW 6000 EH', 'GW-6000-EH', 'GW6000EH'],
      regex: '\\bGW\\s?\\d{4}\\s?-?EH\\b',
      specs: { phase: '1P', kW: 6 },
    },
    {
      id: 'goodwe-lx-f12.8-h-20',
      type: 'battery',
      brand: 'GOODWE',
      model: 'LX F12.8-H-20',
      aliases: ['LXF12.8-H-20', 'LX-F12.8-H-20', 'LYNX F 12.8 H 20'],
      regex: '\\bLX\\s?-?F\\s?\\d{1,2}(?:\\.\\d)?-H-20\\b',
      specs: { usable_kWh: 12.8 },
      capacity_kwh: 12.8,
    },
    {
      id: 'eging-eg-440nt54-hl-bf-dg',
      type: 'panel',
      brand: 'EGING',
      model: 'EG-440NT54-HL/BF-DG',
      aliases: ['EG-440NT54-HL-BF-DG', 'EG 440NT54 HL/BF DG', 'EG-440NT54 HL BF DG'],
      regex: '\\bEG[-\\s]?440NT54[-\\s]?HL(?:[/\\-\\s]?BF)?[-\\s]?DG\\b',
      specs: { W: 440 },
      power_rating: 440,
    }
  );

  console.log(`📊 Product database loaded: ${products.filter(p => p.type === 'panel').length} panels, ${products.filter(p => p.type === 'battery').length} batteries, ${products.filter(p => p.type === 'inverter').length} inverters`);
  
  return products;
}

function generateBaseAliases(brand: string, model: string): string[] {
  const aliases = [];
  const baseModel = model.toUpperCase();
  
  // Generate spacing variants
  aliases.push(baseModel.replace(/[-]/g, ' '));
  aliases.push(baseModel.replace(/\s/g, '-'));
  aliases.push(baseModel.replace(/[\/]/g, '-'));
  aliases.push(baseModel.replace(/[-\s]/g, ''));
  
  // Add brand + model combinations
  aliases.push(`${brand.toUpperCase()} ${baseModel}`);
  aliases.push(`${brand.toUpperCase()}-${baseModel}`);
  
  return [...new Set(aliases)]; // Remove duplicates
}

function generateBaseRegex(brand: string, model: string, type: string): string {
  const brandPattern = brand.toUpperCase().replace(/\s/g, '\\s?');
  const modelPattern = model.toUpperCase()
    .replace(/[-]/g, '[-\\s]?')
    .replace(/\./g, '\\.')
    .replace(/\//g, '[/\\-\\s]?');
  
  return `\\b${brandPattern}[-\\s]?${modelPattern}\\b`;
}

async function processMatchHits(
  hits: MatchHit[], 
  fullText: string, 
  matcher: SmartMatcher
): Promise<SmartProcessorResult['extractedData']> {
  
  const extractedData: SmartProcessorResult['extractedData'] = {
    panels: [],
    batteries: [],
    inverters: [],
    systemSize: undefined,
    totalCost: undefined,
    postcode: undefined,
    installer: undefined
  };

  // Group hits by type
  const panelHits = hits.filter(h => h.product.type === 'panel');
  const batteryHits = hits.filter(h => h.product.type === 'battery');
  const inverterHits = hits.filter(h => h.product.type === 'inverter');

  // Process panels
  for (const hit of panelHits.slice(0, 3)) { // Top 3 panel matches
    const threshold = await matcher.autoAcceptThreshold(hit.product.brand);
    const needsConfirmation = hit.score < threshold;
    
    // Extract additional info from context
    const contextWindow = fullText.substring(
      Math.max(0, hit.at - 200), 
      Math.min(fullText.length, hit.at + 200)
    );
    
    const quantityMatch = contextWindow.match(/(\d+)\s*[x×]/i);
    const wattsMatch = contextWindow.match(/(\d{3,4})\s*[Ww]/i);
    
    extractedData.panels!.push({
      description: hit.raw,
      confidence: hit.score,
      quantity: quantityMatch ? parseInt(quantityMatch[1]) : undefined,
      watts: wattsMatch ? parseInt(wattsMatch[1]) : hit.product.power_rating,
      cecId: hit.product.specs?.certificate || 'CEC-LISTED',
      needsConfirmation,
      candidates: needsConfirmation ? [hit] : undefined,
      suggestedMatch: {
        id: hit.productId,
        brand: hit.product.brand,
        model: hit.product.model,
        watts: hit.product.power_rating || 0,
        cec_id: hit.product.specs?.certificate || 'CEC-LISTED',
        confidence: hit.score,
        matchType: hit.evidence.regexHit ? 'regex' : hit.evidence.aliasHit ? 'alias' : 'fuzzy'
      }
    });
    
    console.log(`🔆 Panel: ${hit.product.brand} ${hit.product.model} (${(hit.score * 100).toFixed(1)}%) ${needsConfirmation ? '⚠️ NEEDS CONFIRMATION' : '✅ AUTO-ACCEPTED'}`);
  }

  // Process batteries
  for (const hit of batteryHits.slice(0, 2)) { // Top 2 battery matches
    const threshold = await matcher.autoAcceptThreshold(hit.product.brand);
    const needsConfirmation = hit.score < threshold;
    
    const contextWindow = fullText.substring(
      Math.max(0, hit.at - 200), 
      Math.min(fullText.length, hit.at + 200)
    );
    
    const capacityMatch = contextWindow.match(/(\d{1,2}(?:\.\d)?)\s*kWh/gi);
    let extractedCapacity = capacityMatch ? parseFloat(capacityMatch[0].replace(/kWh/gi, '')) : undefined;
    
    extractedData.batteries!.push({
      description: hit.raw,
      confidence: hit.score,
      capacity_kwh: extractedCapacity || hit.product.capacity_kwh,
      cecId: hit.product.specs?.certificate || 'CEC-LISTED',
      needsConfirmation,
      candidates: needsConfirmation ? [hit] : undefined,
      suggestedMatch: {
        id: hit.productId,
        brand: hit.product.brand,
        model: hit.product.model,
        capacity_kwh: hit.product.capacity_kwh || 0,
        cec_id: hit.product.specs?.certificate || 'CEC-LISTED',
        confidence: hit.score,
        matchType: hit.evidence.regexHit ? 'regex' : hit.evidence.aliasHit ? 'alias' : 'fuzzy'
      }
    });
    
    console.log(`🔋 Battery: ${hit.product.brand} ${hit.product.model} (${(hit.score * 100).toFixed(1)}%) ${needsConfirmation ? '⚠️ NEEDS CONFIRMATION' : '✅ AUTO-ACCEPTED'}`);
  }

  // Process inverters
  for (const hit of inverterHits.slice(0, 2)) { // Top 2 inverter matches
    const threshold = await matcher.autoAcceptThreshold(hit.product.brand);
    const needsConfirmation = hit.score < threshold;
    
    const contextWindow = fullText.substring(
      Math.max(0, hit.at - 200), 
      Math.min(fullText.length, hit.at + 200)
    );
    
    const kwMatch = contextWindow.match(/(\d(?:\.\d)?)\s*kW/i);
    
    extractedData.inverters!.push({
      description: hit.raw,
      confidence: hit.score,
      kw: kwMatch ? parseFloat(kwMatch[1]) : hit.product.specs?.kW,
      needsConfirmation,
      candidates: needsConfirmation ? [hit] : undefined,
      suggestedMatch: {
        id: hit.productId,
        brand: hit.product.brand,
        model: hit.product.model,
        kw: hit.product.specs?.kW || 0,
        confidence: hit.score,
        matchType: hit.evidence.regexHit ? 'regex' : hit.evidence.aliasHit ? 'alias' : 'fuzzy'
      }
    });
    
    console.log(`⚡ Inverter: ${hit.product.brand} ${hit.product.model} (${(hit.score * 100).toFixed(1)}%) ${needsConfirmation ? '⚠️ NEEDS CONFIRMATION' : '✅ AUTO-ACCEPTED'}`);
  }

  // Extract additional data using enhanced patterns
  await extractAdditionalData(extractedData, fullText);
  
  console.log(`📊 Smart extraction complete: ${extractedData.panels?.length || 0} panels, ${extractedData.batteries?.length || 0} batteries, ${extractedData.inverters?.length || 0} inverters`);
  
  return extractedData;
}

async function extractAdditionalData(
  extractedData: SmartProcessorResult['extractedData'], 
  text: string
) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  // Extract system size with enhanced patterns
  const systemSizePatterns = [
    /(\d+(?:\.\d+)?)\s*kW\s*(?:of\s*)?(?:solar\s*)?(?:power|system|capacity|install)/gi,
    /(?:system\s*size|solar\s*capacity):\s*(\d+(?:\.\d+)?)\s*kW/gi,
    /(\d+(?:\.\d+)?)\s*kW\s*PV\s*system/gi
  ];
  
  for (const line of lines) {
    for (const pattern of systemSizePatterns) {
      pattern.lastIndex = 0; // Reset regex state
      const match = pattern.exec(line);
      if (match) {
        extractedData!.systemSize = {
          value: parseFloat(match[1]),
          unit: 'kW',
          confidence: 0.9
        };
        console.log(`✓ System size found: ${match[1]}kW`);
        break;
      }
    }
    if (extractedData!.systemSize) break;
  }
  
  // Extract postcode
  const postcodePattern = /\b(\d{4})\b/g;
  for (const line of lines) {
    postcodePattern.lastIndex = 0;
    const matches = [...line.matchAll(postcodePattern)];
    for (const match of matches) {
      const postcode = match[1];
      if (postcode >= '1000' && postcode <= '9999') {
        extractedData!.postcode = {
          value: postcode,
          confidence: 0.8
        };
        console.log(`✓ Postcode found: ${postcode}`);
        break;
      }
    }
    if (extractedData!.postcode) break;
  }
}