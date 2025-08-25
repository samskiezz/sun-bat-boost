import { createWorker, PSM } from 'tesseract.js';
import { fuzzyMatch, fuzzyMatchMultiple, type MatchCandidate } from './fuzzyMatch';
import { supabase } from '@/integrations/supabase/client';

export interface OCRResult {
  success: boolean;
  extractedData?: {
    panels?: Array<{
      description: string;
      confidence: number;
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
    inverters?: Array<{
      description: string;
      confidence: number;
      cecId?: string;
      suggestedMatch?: {
        id: string;
        brand: string;
        model: string;
        ac_output_kw?: number;
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
}

export const processQuoteImage = async (imageFile: File): Promise<OCRResult> => {
  let worker: Tesseract.Worker | null = null;
  
  try {
    console.log('Starting OCR processing...');
    
    // Initialize Tesseract worker
    worker = await createWorker('eng');
    
    // Configure worker for better text recognition
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,()$×x: -\n',
      tessedit_pageseg_mode: PSM.AUTO,
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

async function extractSystemData(text: string): Promise<OCRResult['extractedData']> {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  // Fetch CEC data for matching
  const [panelsData, batteriesData, invertersData] = await Promise.all([
    supabase.from('cec_panels').select('id, brand, model, watts, cec_id').eq('is_active', true),
    supabase.from('cec_batteries').select('id, brand, model, capacity_kwh, usable_capacity_kwh, cec_id').eq('is_active', true),
    supabase.from('cec_inverters').select('id, brand, model, ac_output_kw, cec_id').eq('is_active', true)
  ]);

  const panels = panelsData.data || [];
  const batteries = batteriesData.data || [];
  const inverters = invertersData.data || [];

  // Panel detection patterns
  const panelPatterns = [
    /(\d+)\s*(w|watt|watts?)\s*([a-zA-Z0-9\s\-\.]+(?:panel|module|solar))/gi,
    /([a-zA-Z0-9\s\-\.]+)\s*(\d+)\s*(w|watt|watts?)/gi,
    /(panel|module|solar)[\s:]*([a-zA-Z0-9\s\-\.]+)/gi
  ];

  // Battery detection patterns  
  const batteryPatterns = [
    /(\d+(?:\.\d+)?)\s*(kwh|kw)\s*([a-zA-Z0-9\s\-\.]+(?:battery|storage))/gi,
    /([a-zA-Z0-9\s\-\.]+)\s*(\d+(?:\.\d+)?)\s*(kwh|kw)\s*(?:battery|storage)/gi,
    /(battery|storage)[\s:]*([a-zA-Z0-9\s\-\.]+)/gi
  ];

  // Inverter detection patterns
  const inverterPatterns = [
    /(\d+(?:\.\d+)?)\s*(kw|kilowatt)\s*([a-zA-Z0-9\s\-\.]+(?:inverter))/gi,
    /([a-zA-Z0-9\s\-\.]+)\s*(\d+(?:\.\d+)?)\s*(kw|kilowatt)\s*(?:inverter)/gi,
    /(inverter)[\s:]*([a-zA-Z0-9\s\-\.]+)/gi
  ];

  const extractedData: OCRResult['extractedData'] = {
    panels: [],
    batteries: [],
    inverters: [],
    systemSize: undefined,
    totalCost: undefined,
    postcode: undefined,
    installer: undefined
  };

  // Extract and match panels
  const panelTexts = new Set<string>();
  for (const line of lines) {
    for (const pattern of panelPatterns) {
      const matches = [...line.matchAll(pattern)];
      for (const match of matches) {
        const description = match[0].trim();
        if (description.length > 5) {
          panelTexts.add(description);
        }
      }
    }
  }

  for (const description of panelTexts) {
    const match = fuzzyMatch(description, panels.map(p => ({
      id: p.id,
      brand: p.brand,
      model: p.model,
      cec_id: p.cec_id
    })));

    extractedData.panels?.push({
      description,
      confidence: match ? match.confidence : 0.3,
      cecId: match?.cec_id,
      suggestedMatch: match ? {
        id: match.id,
        brand: match.brand,
        model: match.model,
        watts: panels.find(p => p.id === match.id)?.watts || 0,
        cec_id: match.cec_id,
        confidence: match.confidence,
        matchType: match.matchType
      } : undefined
    });
  }

  // Extract and match batteries
  const batteryTexts = new Set<string>();
  for (const line of lines) {
    for (const pattern of batteryPatterns) {
      const matches = [...line.matchAll(pattern)];
      for (const match of matches) {
        const description = match[0].trim();
        if (description.length > 5) {
          batteryTexts.add(description);
        }
      }
    }
  }

  for (const description of batteryTexts) {
    const match = fuzzyMatch(description, batteries.map(b => ({
      id: b.id,
      brand: b.brand,
      model: b.model,
      cec_id: b.cec_id
    })));

    extractedData.batteries?.push({
      description,
      confidence: match ? match.confidence : 0.3,
      cecId: match?.cec_id,
      suggestedMatch: match ? {
        id: match.id,
        brand: match.brand,
        model: match.model,
        capacity_kwh: batteries.find(b => b.id === match.id)?.capacity_kwh || 0,
        cec_id: match.cec_id,
        confidence: match.confidence,
        matchType: match.matchType
      } : undefined
    });
  }

  // Extract and match inverters
  const inverterTexts = new Set<string>();
  for (const line of lines) {
    for (const pattern of inverterPatterns) {
      const matches = [...line.matchAll(pattern)];
      for (const match of matches) {
        const description = match[0].trim();
        if (description.length > 5) {
          inverterTexts.add(description);
        }
      }
    }
  }

  for (const description of inverterTexts) {
    const match = fuzzyMatch(description, inverters.map(i => ({
      id: i.id,
      brand: i.brand,
      model: i.model,
      cec_id: i.cec_id
    })));

    extractedData.inverters?.push({
      description,
      confidence: match ? match.confidence : 0.3,
      cecId: match?.cec_id,
      suggestedMatch: match ? {
        id: match.id,
        brand: match.brand,
        model: match.model,
        ac_output_kw: inverters.find(i => i.id === match.id)?.ac_output_kw,
        cec_id: match.cec_id,
        confidence: match.confidence,
        matchType: match.matchType
      } : undefined
    });
  }

  // Extract system size
  const systemSizePattern = /(\d+(?:\.\d+)?)\s*(kw|kilowatt|kva)\s*(?:system|install|solar)/gi;
  for (const line of lines) {
    const match = systemSizePattern.exec(line);
    if (match) {
      extractedData.systemSize = {
        value: parseFloat(match[1]),
        unit: match[2].toLowerCase(),
        confidence: 0.8
      };
      break;
    }
  }

  // Extract total cost
  const costPattern = /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  const costs: number[] = [];
  for (const line of lines) {
    const matches = [...line.matchAll(costPattern)];
    for (const match of matches) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (value > 1000) { // Likely system cost
        costs.push(value);
      }
    }
  }
  if (costs.length > 0) {
    extractedData.totalCost = {
      value: Math.max(...costs), // Take the highest cost as likely system total
      confidence: 0.7
    };
  }

  // Extract postcode
  const postcodePattern = /(?:postcode|post\s*code|postal\s*code)[\s:]*(\d{4})/gi;
  for (const line of lines) {
    const match = postcodePattern.exec(line);
    if (match) {
      extractedData.postcode = {
        value: match[1],
        confidence: 0.9
      };
      break;
    }
  }

  // Extract installer name
  const installerPattern = /(installer|company|business)[\s:]*([a-zA-Z0-9\s&\-\.]{3,50})/gi;
  for (const line of lines) {
    const match = installerPattern.exec(line);
    if (match) {
      extractedData.installer = {
        name: match[2].trim(),
        confidence: 0.6
      };
      break;
    }
  }

  return extractedData;
}

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
      warnings.push(`Panel ${index + 1} has low confidence match: ${panel.description}`);
      suggestions.push('Please verify the panel model manually against CEC approved list');
    }
  });
  
  // Check battery confidence levels
  data?.batteries?.forEach((battery, index) => {
    if (battery.confidence < 0.5) {
      warnings.push(`Battery ${index + 1} has low confidence match: ${battery.description}`);
      suggestions.push('Please verify the battery model manually against CEC approved list');
    }
  });
  
  // Check inverter confidence levels
  data?.inverters?.forEach((inverter, index) => {
    if (inverter.confidence < 0.5) {
      warnings.push(`Inverter ${index + 1} has low confidence match: ${inverter.description}`);
      suggestions.push('Please verify the inverter model manually against CEC approved list');
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