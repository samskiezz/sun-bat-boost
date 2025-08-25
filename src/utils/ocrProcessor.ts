// OCR Processing for Solar Quotes
import { createWorker } from 'tesseract.js';
import { SOLAR_PANELS, searchPanels } from '@/data/panelData';
import { BATTERY_SYSTEMS, searchBatteries } from '@/data/batteryData';

export interface OCRResult {
  success: boolean;
  extractedData?: {
    panels?: Array<{
      model: string;
      quantity: number;
      power_watts?: number;
      confidence: number;
    }>;
    batteries?: Array<{
      model: string;
      quantity: number;
      capacity_kwh?: number;
      confidence: number;
    }>;
    installer?: string;
    totalSystemSize?: number;
    totalCost?: number;
    postcode?: string;
  };
  rawText?: string;
  error?: string;
}

// Common patterns for OCR text extraction
const PATTERNS = {
  // Panel patterns
  panelQuantity: /(\d+)\s*(?:x|×)\s*([^\n]+(?:panel|solar|module|PV))/gi,
  panelModel: /(?:panel|solar|module|PV):\s*([^\n]+)/gi,
  panelWatts: /(\d+(?:\.\d+)?)\s*(?:w|watt|kw|kilowatt)/gi,
  
  // Battery patterns  
  batteryQuantity: /(\d+)\s*(?:x|×)\s*([^\n]+(?:battery|storage|kwh))/gi,
  batteryModel: /(?:battery|storage):\s*([^\n]+)/gi,
  batteryCapacity: /(\d+(?:\.\d+)?)\s*kwh/gi,
  
  // System details
  systemSize: /(?:system size|total capacity|dc size):\s*(\d+(?:\.\d+)?)\s*(?:kw|kilowatt)/gi,
  totalCost: /(?:total|cost|price):\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
  postcode: /(?:postcode|post code):\s*(\d{4})/gi,
  installer: /(?:installer|company|dealer):\s*([^\n]+)/gi,
};

export const processQuoteImage = async (imageFile: File): Promise<OCRResult> => {
  let worker: Tesseract.Worker | null = null;
  
  try {
    console.log('Starting OCR processing...');
    
    // Initialize Tesseract worker
    worker = await createWorker('eng');
    
    // Configure worker for better text recognition
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,()$×x-: \n',
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    });
    
    // Process the image
    const { data: { text } } = await worker.recognize(imageFile);
    console.log('OCR completed, processing text...');
    
    // Extract structured data from OCR text
    const extractedData = await extractSystemData(text);
    
    return {
      success: true,
      extractedData,
      rawText: text,
    };
    
  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process image',
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
};

const extractSystemData = async (text: string): Promise<OCRResult['extractedData']> => {
  const result: OCRResult['extractedData'] = {
    panels: [],
    batteries: [],
  };
  
  // Clean up text
  const cleanText = text.replace(/[^\w\s\d.,()$×x-:]/g, ' ').replace(/\s+/g, ' ');
  
  // Extract panels
  const panelMatches = [...cleanText.matchAll(PATTERNS.panelQuantity)];
  for (const match of panelMatches) {
    const quantity = parseInt(match[1]);
    const description = match[2].trim();
    
    // Try to find matching panel model
    const foundPanels = searchPanels(description);
    if (foundPanels.length > 0) {
      const bestMatch = foundPanels[0]; // Take the best match
      result.panels?.push({
        model: bestMatch.model,
        quantity,
        power_watts: bestMatch.power_watts,
        confidence: calculateMatchConfidence(description, bestMatch.model),
      });
    } else {
      // Extract watts from description if no model match
      const wattsMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:w|watt)/i);
      const watts = wattsMatch ? parseFloat(wattsMatch[1]) : undefined;
      
      result.panels?.push({
        model: description,
        quantity,
        power_watts: watts,
        confidence: 0.3, // Low confidence for unrecognized models
      });
    }
  }
  
  // Extract batteries
  const batteryMatches = [...cleanText.matchAll(PATTERNS.batteryQuantity)];
  for (const match of batteryMatches) {
    const quantity = parseInt(match[1]);
    const description = match[2].trim();
    
    // Try to find matching battery model
    const foundBatteries = searchBatteries(description);
    if (foundBatteries.length > 0) {
      const bestMatch = foundBatteries[0];
      result.batteries?.push({
        model: bestMatch.model,
        quantity,
        capacity_kwh: bestMatch.capacity_kwh,
        confidence: calculateMatchConfidence(description, bestMatch.model),
      });
    } else {
      // Extract capacity from description if no model match
      const capacityMatch = description.match(/(\d+(?:\.\d+)?)\s*kwh/i);
      const capacity = capacityMatch ? parseFloat(capacityMatch[1]) : undefined;
      
      result.batteries?.push({
        model: description,
        quantity,
        capacity_kwh: capacity,
        confidence: 0.3, // Low confidence for unrecognized models
      });
    }
  }
  
  // Extract other system details
  const systemSizeMatch = cleanText.match(PATTERNS.systemSize);
  if (systemSizeMatch) {
    result.totalSystemSize = parseFloat(systemSizeMatch[1]);
  }
  
  const totalCostMatch = cleanText.match(PATTERNS.totalCost);
  if (totalCostMatch) {
    result.totalCost = parseFloat(totalCostMatch[1].replace(/,/g, ''));
  }
  
  const postcodeMatch = cleanText.match(PATTERNS.postcode);
  if (postcodeMatch) {
    result.postcode = postcodeMatch[1];
  }
  
  const installerMatch = cleanText.match(PATTERNS.installer);
  if (installerMatch) {
    result.installer = installerMatch[1].trim();
  }
  
  return result;
};

const calculateMatchConfidence = (description: string, modelName: string): number => {
  const descLower = description.toLowerCase();
  const modelLower = modelName.toLowerCase();
  
  // Simple confidence scoring based on word overlap
  const descWords = descLower.split(/\s+/);
  const modelWords = modelLower.split(/\s+/);
  
  let matches = 0;
  for (const word of descWords) {
    if (modelWords.some(mWord => mWord.includes(word) || word.includes(mWord))) {
      matches++;
    }
  }
  
  return Math.min(matches / Math.max(descWords.length, modelWords.length), 1.0);
};

// Helper function to validate and clean extracted data
export const validateExtractedData = (data: OCRResult['extractedData']): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} => {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (!data?.panels?.length && !data?.batteries?.length) {
    warnings.push('No solar panels or batteries detected in the quote');
    suggestions.push('Try uploading a clearer image or check if the quote contains equipment specifications');
  }
  
  // Check panel confidence levels
  data?.panels?.forEach((panel, index) => {
    if (panel.confidence < 0.5) {
      warnings.push(`Panel ${index + 1} has low confidence match: ${panel.model}`);
      suggestions.push('Please verify the panel model manually');
    }
  });
  
  // Check battery confidence levels
  data?.batteries?.forEach((battery, index) => {
    if (battery.confidence < 0.5) {
      warnings.push(`Battery ${index + 1} has low confidence match: ${battery.model}`);
      suggestions.push('Please verify the battery model manually');
    }
  });
  
  // Check for missing postcode
  if (!data?.postcode) {
    warnings.push('Postcode not detected in quote');
    suggestions.push('Please enter your postcode manually for accurate rebate calculations');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
  };
};