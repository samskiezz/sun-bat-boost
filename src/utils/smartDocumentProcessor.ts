import { extractTextFromFile } from './pdfTextExtractor';
import { SmartMatcher, Product, MatchHit } from './smartMatcher';
import { generateComprehensiveProducts } from './comprehensiveProductGenerator';
import { brandStrictFilter } from './brandStrictFilter';
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
    console.log('📊 Loading comprehensive product database...');
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
      
      console.log(`📈 Loaded ${allProducts.length} products from database`);
    } catch (error) {
      console.warn('⚠️ Database unavailable, using synthetic products');
      allProducts = await generateComprehensiveProducts();
    }
    
    // Step 3: Initialize hierarchical smart matcher
    const matcher = new SmartMatcher(allProducts);
    await matcher.init();
    
    console.log(`🏭 Loaded ${allProducts.length} products for smart matching`);
    
    // Step 4: Run hierarchical matching (Brand → Wattage/kWh → Model)
    const hits = matchHierarchically(text, allProducts, matcher);
    
    console.log(`🎯 Hierarchical matcher found ${hits.length} potential matches`);
    
    // Step 5: Process hits by type and determine what needs confirmation
    const extractedData = await processMatchHits(hits, text, matcher);
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      extractedData,
      rawText: text,
      detectionMethod: method,
      processingTime,
      matcher,
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

// Hierarchical matching: Brand → Wattage/kWh → Model
function matchHierarchically(text: string, allProducts: Product[], matcher: SmartMatcher): MatchHit[] {
  console.log('🔄 Using hierarchical matching: Brand → Wattage → Model');
  
  const normalizedText = text.toUpperCase();
  const results: MatchHit[] = [];
  
  // Extract all potential brand+spec combinations from text
  const brandSpecPatterns = [
    // Panel patterns: "JINKO 440W", "TRINA 580", "LONGI 450W"
    /\b(JINKO|TRINA|LONGI|JA|CANADIAN|REC|QCELLS|MAXEON|SUNPOWER)\s+(\d{3,4})W?\b/gi,
    // Battery patterns: "TESLA 13.5KWH", "BYD 10KWH", "PYLONTECH 5KWH"
    /\b(TESLA|BYD|PYLONTECH|ALPHAESS|SUNGROW|GOODWE|SOLAREDGE|ENPHASE)\s+(\d{1,2}(?:\.\d)?)\s*KWH?\b/gi,
    // Inverter patterns: "GOODWE 6KW", "SUNGROW 10KW", "SOLAREDGE 5KW"
    /\b(GOODWE|SUNGROW|SOLAREDGE|FRONIUS|SMA|SOLIS|ENPHASE|GROWATT)\s+(\d{1,2}(?:\.\d)?)\s*KW\b/gi
  ];
  
  for (const pattern of brandSpecPatterns) {
    let match;
    while ((match = pattern.exec(normalizedText)) !== null) {
      const brand = match[1].toUpperCase();
      const spec = parseFloat(match[2]);
      const fullMatch = match[0];
      
      console.log(`🎯 Found brand+spec: ${brand} ${spec} (${fullMatch})`);
      
      // Use strict filtering to get exact brand+spec matches
      let searchQuery: string;
      let expectedType: 'panel' | 'battery' | 'inverter';
      
      if (spec >= 100) { // Panel wattage
        searchQuery = `${brand} ${spec}W`;
        expectedType = 'panel';
      } else if (spec < 50) { // Battery/Inverter capacity/power
        // Determine if it's battery or inverter based on context
        const contextWindow = normalizedText.slice(Math.max(0, match.index! - 50), match.index! + 50);
        if (/KWH|BATTERY|STORAGE/i.test(contextWindow)) {
          searchQuery = `${brand} ${spec}kWh`;
          expectedType = 'battery';
        } else {
          searchQuery = `${brand} ${spec}kW`;
          expectedType = 'inverter';
        }
      } else {
        continue; // Skip ambiguous specs
      }
      
      const strictResult = brandStrictFilter.filterProducts(allProducts, searchQuery);
      
      if (strictResult.filteredProducts.length > 0) {
        console.log(`✅ Found ${strictResult.filteredProducts.length} exact ${brand} products with ${spec}`);
        
        // Now try to find the specific model within these exact matches
        const contextWindow = normalizedText.slice(Math.max(0, match.index! - 100), match.index! + 100);
        
        let bestMatch = strictResult.filteredProducts[0]; // Default to first exact match
        let modelScore = 0.6; // Base score for brand+spec match
        
        // Try to find model-specific keywords in context
        for (const product of strictResult.filteredProducts) {
          const modelWords = product.model.toUpperCase().split(/[\s-_]+/);
          let foundModelWords = 0;
          
          for (const word of modelWords) {
            if (word.length >= 3 && contextWindow.includes(word)) {
              foundModelWords++;
            }
          }
          
          if (foundModelWords > 0) {
            const newScore = 0.6 + (foundModelWords * 0.15);
            if (newScore > modelScore) {
              bestMatch = product;
              modelScore = newScore;
              console.log(`🎯 Found model match: ${product.model} (score: ${newScore})`);
            }
          }
        }
        
        // Create match hit
        const hit: MatchHit = {
          productId: bestMatch.id,
          product: bestMatch,
          score: modelScore,
          evidence: {
            regexHit: true, // Brand+spec is like a regex hit
            aliasHit: false,
            sectionBoost: 0,
            qtyBoost: 0,
            brandNearby: true,
            specNearby: true,
            ocrRiskPenalty: 0
          },
          at: match.index!,
          raw: fullMatch
        };
        
        // If score is lower than 0.8, mark for confirmation and include alternatives
        if (modelScore < 0.8) {
          (hit as any).needsConfirmation = true;
          (hit as any).alternatives = strictResult.filteredProducts.slice(0, 10);
        }
        
        results.push(hit);
      } else {
        console.log(`❌ No products found for ${brand} ${spec}`);
      }
    }
  }
  
  // Fallback to original smart matcher for patterns not caught by hierarchical matching
  const originalMatches = matcher.match(text);
  const hierarchicalPositions = new Set(results.map(r => r.at));
  
  for (const match of originalMatches) {
    if (!hierarchicalPositions.has(match.at)) {
      results.push(match);
    }
  }
  
  console.log(`🏁 Hierarchical matching found ${results.length} total matches`);
  return results.sort((a, b) => b.score - a.score);
}

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