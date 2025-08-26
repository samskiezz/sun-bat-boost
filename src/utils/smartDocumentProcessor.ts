import { extractTextFromFile } from './pdfTextExtractor';
import { SmartMatcher, Product, MatchHit } from './smartMatcher';
import { generateComprehensiveProducts } from './comprehensiveProductGenerator';
import { createHierarchicalMatcher } from './hierarchicalMatcher';
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
    
    // Step 2: Load comprehensive product database
    let allProducts: Product[];
    
    try {
      const { data: panels } = await supabase.from('pv_modules').select('*').limit(2000);
      const { data: batteries } = await supabase.from('batteries').select('*').limit(1000);
      
      allProducts = [
        ...(panels || []).map(p => ({ 
          id: String(p.id), 
          brand: p.brand, 
          model: p.model, 
          type: 'panel' as const,
          power_rating: p.power_rating,
          specs: p
        })),
        ...(batteries || []).map(b => ({ 
          id: String(b.id), 
          brand: b.brand, 
          model: b.model, 
          type: 'battery' as const,
          capacity_kwh: b.capacity_kwh,
          specs: b
        }))
      ];
    } catch (error) {
      allProducts = await generateComprehensiveProducts();
    }
    
    // Step 3: Initialize comprehensive hierarchical matcher for ALL products
    const hierarchicalMatcher = createHierarchicalMatcher(allProducts);
    const smartMatcher = new SmartMatcher(allProducts); // Keep for fallback/learning
    await smartMatcher.init();
    
  // Step 4: Run comprehensive hierarchical matching (Brand → Wattage/kWh → Model)
  console.log('🎯 Running hierarchical matching on text length:', text.length);
  const hierarchicalMatches = hierarchicalMatcher.match(text);
  console.log('🔍 Hierarchical matches found:', hierarchicalMatches.length);
  hierarchicalMatches.forEach(match => {
    console.log(`  - ${match.product.type}: ${match.product.brand} ${match.product.model} (${match.confidence})`);
  });
  
  const hits = hierarchicalMatcher.convertToMatchHits(hierarchicalMatches);
  console.log('🎯 Converted to match hits:', hits.length);
    
    // Step 5: Process hits by type and determine what needs confirmation
    const extractedData = await processMatchHits(hits, text, smartMatcher);
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      extractedData,
      rawText: text,
      detectionMethod: method,
      processingTime,
      matcher: smartMatcher,
      allProducts: allProducts,
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

// This function is now replaced by the comprehensive HierarchicalMatcher class
// which handles ALL ~2000 products automatically

// This function has been replaced by generateComprehensiveProducts() from comprehensiveProductGenerator.ts

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

    // Process panels - Add debug logging
    for (const hit of panelHits.slice(0, 3)) { // Top 3 panel matches
      console.log('🔍 Processing panel hit:', hit.product.brand, hit.product.model, 'Score:', hit.score);
      
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
    }

  // Process batteries - Fix capacity extraction
  for (const hit of batteryHits.slice(0, 2)) { // Top 2 battery matches
    const threshold = await matcher.autoAcceptThreshold(hit.product.brand);
    const needsConfirmation = hit.score < threshold;
    
    const contextWindow = fullText.substring(
      Math.max(0, hit.at - 200), 
      Math.min(fullText.length, hit.at + 200)
    );
    
    // Enhanced capacity extraction supporting larger batteries
    const capacityPatterns = [
      /(\d{1,3}(?:\.\d{1,2})?)\s*kWh/gi,
      /(\d{1,3}(?:\.\d{1,2})?)\s*kwh/gi,
      /(\d{1,3}(?:\.\d{1,2})?)\s*KWH/gi
    ];
    
    let extractedCapacity = hit.product.capacity_kwh; // Default to database value
    
    // Try to extract capacity from context
    for (const pattern of capacityPatterns) {
      const matches = contextWindow.match(pattern);
      if (matches && matches.length > 0) {
        const value = parseFloat(matches[0].replace(/kWh/gi, ''));
        if (value > 0 && value <= 200) { // Reasonable battery range
          extractedCapacity = value;
          break;
        }
      }
    }
    
    extractedData.batteries!.push({
      description: hit.raw,
      confidence: hit.score,
      capacity_kwh: extractedCapacity,
      cecId: hit.product.specs?.certificate || 'CEC-LISTED',
      needsConfirmation,
      candidates: needsConfirmation ? [hit] : undefined,
      suggestedMatch: {
        id: hit.productId,
        brand: hit.product.brand,
        model: hit.product.model,
        capacity_kwh: extractedCapacity || 0,
        cec_id: hit.product.specs?.certificate || 'CEC-LISTED',
        confidence: hit.score,
        matchType: hit.evidence.regexHit ? 'regex' : hit.evidence.aliasHit ? 'alias' : 'fuzzy'
      }
    });
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
  }

  // Extract additional data using enhanced patterns
  await extractAdditionalData(extractedData, fullText);
  
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
        break;
      }
    }
    if (extractedData!.postcode) break;
  }
}