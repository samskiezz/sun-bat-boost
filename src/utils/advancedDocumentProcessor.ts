import { processSmartDocument } from './smartDocumentProcessor';

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

// Main processing function - now using smart self-learning approach
export const processAdvancedDocument = async (file: File): Promise<AdvancedProcessorResult> => {
  console.log('🧠 Using Smart Self-Learning Document Processor...');
  
  try {
    const result = await processSmartDocument(file);
    
    // Convert smart result to legacy format for compatibility
    return {
      success: result.success,
      extractedData: result.extractedData,
      rawText: result.rawText,
      error: result.error,
    };
  } catch (error) {
    console.error('Failed to process with smart processor:', error);
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
  // Simple validation for now to avoid require() issues
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
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
  };
};