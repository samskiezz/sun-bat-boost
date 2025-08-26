import { processBattleTestedDocument } from './battleTestedDocumentProcessor';

export interface AdvancedProcessorResult {
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
}

// Main processing function - now using battle-tested approach
export const processAdvancedDocument = async (file: File): Promise<AdvancedProcessorResult> => {
  console.log('🚀 Using Battle-Tested Document Processor for maximum accuracy...');
  
  try {
    const result = await processBattleTestedDocument(file);
    
    // Convert battle-tested result to legacy format for compatibility
    return {
      success: result.success,
      extractedData: result.extractedData,
      rawText: result.rawText,
      error: result.error,
    };
  } catch (error) {
    console.error('Failed to process with battle-tested processor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
    };
  }
};

// Legacy validation function - redirects to battle-tested validator
export const validateAdvancedExtractedData = (data: AdvancedProcessorResult['extractedData']): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} => {
  const { validateBattleTestedExtractedData } = require('./battleTestedDocumentProcessor');
  return validateBattleTestedExtractedData(data);
};