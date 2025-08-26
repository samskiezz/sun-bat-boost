import { extractTextFromFile } from './pdfTextExtractor';
import { battleTestedExtractor, DetectedProduct, MatchedProduct } from './battleTestedExtractor';

export interface BattleTestedProcessorResult {
  success: boolean;
  extractedData?: {
    panels?: Array<{
      description: string;
      confidence: number;
      quantity?: number;
      watts?: number;
      cecId?: string;
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
}

export const processBattleTestedDocument = async (file: File): Promise<BattleTestedProcessorResult> => {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Processing ${file.type} file: ${file.name} with Battle-Tested Extractor`);
    
    // Step 1: Extract text from file using advanced text extraction
    const textExtractionResult = await extractTextFromFile(file);
    const { text, method, confidence: textConfidence } = textExtractionResult;
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }
    
    console.log(`📝 Extracted text using ${method} method (${text.length} characters)`);
    
    // Step 2: Extract product models using battle-tested algorithms
    const detectedProducts = await battleTestedExtractor.extractModelsFromText(text);
    
    if (detectedProducts.length === 0) {
      console.log('⚠️ No products detected with high confidence');
    } else {
      console.log(`🎯 Detected ${detectedProducts.length} high-confidence products`);
    }
    
    // Step 3: Cross-reference with database
    const matchedProducts = await battleTestedExtractor.crossRef(detectedProducts);
    
    console.log(`✅ Matched ${matchedProducts.length} products against database`);
    
    // Step 4: Convert to expected format and extract additional data
    const extractedData = await convertToExpectedFormat(matchedProducts, text);
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      extractedData,
      rawText: text,
      detectionMethod: method,
      processingTime,
    };
    
  } catch (error) {
    console.error('Battle-tested document processing error:', error);
    const processingTime = Date.now() - startTime;
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process document',
      processingTime,
    };
  }
};

async function convertToExpectedFormat(
  matchedProducts: MatchedProduct[], 
  fullText: string
): Promise<BattleTestedProcessorResult['extractedData']> {
  
  const extractedData: BattleTestedProcessorResult['extractedData'] = {
    panels: [],
    batteries: [],
    systemSize: undefined,
    totalCost: undefined,
    postcode: undefined,
    installer: undefined
  };
  
  // Group matched products by type
  const panels = matchedProducts.filter(m => m.product.type === 'panel');
  const batteries = matchedProducts.filter(m => m.product.type === 'battery');
  const inverters = matchedProducts.filter(m => m.product.type === 'inverter');
  
  // Convert panels
  extractedData.panels = panels.map(match => {
    // Extract quantity from context if available
    const quantityMatch = match.detected.context.match(/(\d+)\s*[x×]/i);
    const wattsMatch = match.detected.context.match(/(\d{3,4})\s*[Ww]/i);
    
    return {
      description: match.detected.raw,
      confidence: match.confidence,
      quantity: quantityMatch ? parseInt(quantityMatch[1]) : undefined,
      watts: wattsMatch ? parseInt(wattsMatch[1]) : match.product.power_rating,
      cecId: match.product.specs?.certificate || 'CEC-LISTED',
      suggestedMatch: {
        id: match.product.id,
        brand: match.product.brand,
        model: match.product.model,
        watts: match.product.power_rating || 0,
        cec_id: match.product.specs?.certificate || 'CEC-LISTED',
        confidence: match.confidence,
        matchType: match.matchType
      }
    };
  });
  
  // Convert batteries
  extractedData.batteries = batteries.map(match => {
    // Extract capacity from context if available
    const capacityMatch = match.detected.context.match(/(\d{1,2}(?:\.\d)?)\s*kWh/gi);
    let extractedCapacity = capacityMatch ? parseFloat(capacityMatch[0].replace(/kWh/gi, '')) : undefined;
    
    return {
      description: match.detected.raw,
      confidence: match.confidence,
      capacity_kwh: extractedCapacity || match.product.capacity_kwh,
      cecId: match.product.specs?.certificate || 'CEC-LISTED',
      suggestedMatch: {
        id: match.product.id,
        brand: match.product.brand,
        model: match.product.model,
        capacity_kwh: match.product.capacity_kwh || 0,
        cec_id: match.product.specs?.certificate || 'CEC-LISTED',
        confidence: match.confidence,
        matchType: match.matchType
      }
    };
  });
  
  // Extract additional information using enhanced patterns
  await extractAdditionalData(extractedData, fullText);
  
  // Log final results
  console.log(`📊 Final extraction results:`);
  console.log(`  - Panels: ${extractedData.panels?.length || 0}`);
  console.log(`  - Batteries: ${extractedData.batteries?.length || 0}`);
  console.log(`  - System size: ${extractedData.systemSize?.value || 'not found'}`);
  console.log(`  - Postcode: ${extractedData.postcode?.value || 'not found'}`);
  
  return extractedData;
}

async function extractAdditionalData(
  extractedData: BattleTestedProcessorResult['extractedData'], 
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
  
  // Extract total cost with enhanced patterns
  const costPatterns = [
    /(?:total|final|system)\s*(?:cost|price):\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:total|inc|including)/gi,
    /price:\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi
  ];
  
  for (const line of lines) {
    for (const pattern of costPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match) {
        const cost = parseFloat(match[1].replace(/,/g, ''));
        if (cost > 1000 && cost < 100000) { // Reasonable range for solar systems
          extractedData!.totalCost = {
            value: cost,
            confidence: 0.8
          };
          console.log(`✓ Total cost found: $${cost}`);
          break;
        }
      }
    }
    if (extractedData!.totalCost) break;
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
  
  // Extract installer information
  const installerPatterns = [
    /(?:installer|company|provider):\s*([A-Za-z\s&]+(?:Solar|Energy|Electric|Power|Group|Pty|Ltd)?)/gi,
    /([A-Za-z\s&]+(?:Solar|Energy|Electric|Power|Group))\s*(?:Pty|Ltd|Inc)?/gi
  ];
  
  for (const line of lines) {
    for (const pattern of installerPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match) {
        const installer = match[1].trim();
        if (installer.length > 3 && installer.length < 50) {
          extractedData!.installer = {
            name: installer,
            confidence: 0.7
          };
          console.log(`✓ Installer found: ${installer}`);
          break;
        }
      }
    }
    if (extractedData!.installer) break;
  }
}

// Validation function for battle-tested results
export const validateBattleTestedExtractedData = (data: BattleTestedProcessorResult['extractedData']): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} => {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (!data?.panels?.length && !data?.batteries?.length) {
    warnings.push('No solar equipment detected with high confidence');
    suggestions.push('Ensure the document contains clear equipment specifications with model numbers');
  }
  
  // Check for very high confidence matches (battle-tested threshold)
  const highConfidenceItems = [
    ...(data?.panels?.filter(p => p.confidence >= 0.9) || []),
    ...(data?.batteries?.filter(b => b.confidence >= 0.9) || [])
  ];
  
  if (highConfidenceItems.length === 0 && (data?.panels?.length || data?.batteries?.length)) {
    warnings.push('Equipment matches have confidence below 90%');
    suggestions.push('Please verify equipment models are clearly visible and match CEC approved products');
  }
  
  // Check for system completeness
  if (data?.panels?.length && !data?.systemSize) {
    warnings.push('Solar panels detected but no system size found');
    suggestions.push('Look for system capacity information (e.g., "6.6kW system")');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
  };
};