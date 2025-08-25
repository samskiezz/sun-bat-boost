import { createWorker, PSM } from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { fuzzyMatch } from './fuzzyMatch';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessorResult {
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

// Image preprocessing function to improve OCR accuracy
const preprocessImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Set canvas size to match image
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0);
        
        // Get image data for preprocessing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Convert to grayscale and increase contrast
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          // Increase contrast
          const contrast = gray > 128 ? Math.min(255, gray * 1.2) : Math.max(0, gray * 0.8);
          data[i] = contrast;     // red
          data[i + 1] = contrast; // green
          data[i + 2] = contrast; // blue
        }
        
        // Put processed image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/jpeg', 0.9);
        
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Process images with improved error handling
const processImageFile = async (file: File): Promise<string> => {
  let worker: Tesseract.Worker | null = null;
  
  try {
    console.log('Starting image OCR processing...');
    
    // Preprocess image for better OCR
    const processedImage = await preprocessImage(file);
    
    // Initialize Tesseract worker with better configuration
    worker = await createWorker('eng');
    
    // Configure worker for better text recognition
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,()$×x: -\n/\\',
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1'
    });
    
    // Process the preprocessed image
    const { data: { text } } = await worker.recognize(processedImage);
    console.log('Image OCR completed successfully');
    
    return text || '';
    
  } catch (error) {
    console.error('Image OCR processing error:', error);
    // Try with original image if preprocessing fails
    if (worker) {
      try {
        const { data: { text } } = await worker.recognize(file);
        return text || '';
      } catch (fallbackError) {
        console.error('Fallback OCR also failed:', fallbackError);
        throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    throw error;
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
};

// Process PDF files
const processPDFFile = async (file: File): Promise<string> => {
  try {
    console.log('Processing PDF file...');
    const arrayBuffer = await file.arrayBuffer();
    const result = await pdfParse(Buffer.from(arrayBuffer));
    console.log('PDF processing completed');
    return result.text || '';
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Process Word documents
const processWordFile = async (file: File): Promise<string> => {
  try {
    console.log('Processing Word document...');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    console.log('Word document processing completed');
    return result.value || '';
  } catch (error) {
    console.error('Word processing error:', error);
    throw new Error(`Word document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Process Excel files
const processExcelFile = async (file: File): Promise<string> => {
  try {
    console.log('Processing Excel file...');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let allText = '';
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Convert array data to text
      jsonData.forEach((row: any) => {
        if (Array.isArray(row)) {
          allText += row.join(' ') + '\n';
        }
      });
    });
    
    console.log('Excel processing completed');
    return allText;
  } catch (error) {
    console.error('Excel processing error:', error);
    throw new Error(`Excel processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Main document processor
export const processDocument = async (file: File): Promise<ProcessorResult> => {
  try {
    console.log(`Processing ${file.type} file: ${file.name}`);
    
    let text = '';
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    // Determine file type and process accordingly
    if (fileType.startsWith('image/') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
      text = await processImageFile(file);
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      text = await processPDFFile(file);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      text = await processWordFile(file);
    } else if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
      throw new Error('Legacy .doc files are not supported. Please convert to .docx format.');
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileName.endsWith('.xlsx')) {
      text = await processExcelFile(file);
    } else if (fileType === 'application/vnd.ms-excel' || fileName.endsWith('.xls')) {
      throw new Error('Legacy .xls files are not supported. Please convert to .xlsx format.');
    } else {
      throw new Error(`Unsupported file type: ${fileType || 'unknown'}. Supported formats: JPG, PNG, PDF, DOCX, XLSX`);
    }
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }
    
    // Extract structured data from the text
    const extractedData = await extractSystemData(text);
    
    return {
      success: true,
      extractedData,
      rawText: text,
    };
    
  } catch (error) {
    console.error('Document processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process document',
    };
  }
};

async function extractSystemData(text: string): Promise<ProcessorResult['extractedData']> {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  // Fetch CEC approved data
  const [panels, batteries] = await Promise.all([
    (async () => {
      let allPanels: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('pv_modules')
          .select('*')
          .range(from, from + 999);

        if (error) {
          console.error('Error fetching panels:', error);
          break;
        }

        if (data && data.length > 0) {
          allPanels = [...allPanels, ...data];
          from += 1000;
          hasMore = data.length === 1000;
        } else {
          hasMore = false;
        }
      }

      return allPanels;
    })(),
    (async () => {
      let allBatteries: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('batteries')
          .select('*')
          .range(from, from + 999);

        if (error) {
          console.error('Error fetching batteries:', error);
          break;
        }

        if (data && data.length > 0) {
          allBatteries = [...allBatteries, ...data];
          from += 1000;
          hasMore = data.length === 1000;
        } else {
          hasMore = false;
        }
      }

      return allBatteries;
    })()
  ]);

  // Enhanced panel detection patterns for quote/invoice line items
  const panelPatterns = [
    // Line item patterns (quantity x description)
    /(\d+)\s*[x×]\s*([a-zA-Z0-9\s\-\.&]+(?:panel|module|solar|mono|poly|perc|topcon|bifacial))/gi,
    
    // Power rating patterns
    /(\d+)\s*(w|watt|watts?)\s*([a-zA-Z0-9\s\-\.&]+(?:panel|module|solar|mono|poly|perc|topcon))/gi,
    /([a-zA-Z0-9\s\-\.&]+)\s*(\d+)\s*(w|watt|watts?)/gi,
    
    // Brand-specific patterns
    /(jinko|trina|canadian\s*solar|lg|rec|sunpower|q\s*cells|ja\s*solar|longi|risen|astronergy|hyundai|tier\s*1)[\s\-]([a-zA-Z0-9\s\-\.&]+)/gi,
    
    // Model number patterns
    /([A-Z]{2,}\-?\d{3,}[A-Z]*\-?[A-Z0-9]*)/gi,
    
    // Invoice/quote specific patterns
    /(solar\s*panel|pv\s*module|photovoltaic)[\s:]*([a-zA-Z0-9\s\-\.&]+)/gi
  ];

  // Enhanced battery detection patterns
  const batteryPatterns = [
    // Line item patterns
    /(\d+)\s*[x×]\s*([a-zA-Z0-9\s\-\.&]+(?:battery|storage|powerwall|enphase|tesla))/gi,
    
    // Capacity-based patterns
    /(\d+(?:\.\d+)?)\s*(kwh|kw)\s*([a-zA-Z0-9\s\-\.&]+(?:battery|storage|powerwall))/gi,
    /([a-zA-Z0-9\s\-\.&]+)\s*(\d+(?:\.\d+)?)\s*(kwh|kw)\s*(?:battery|storage)/gi,
    
    // Brand-specific patterns
    /(tesla|lg|byd|pylontech|sungrow|redback|enphase|sonnen|alpha\s*ess|fronius|powerwall)[\s\-]([a-zA-Z0-9\s\-\.&]+)/gi,
    
    // Model patterns
    /([A-Z]{2,}\-?\d+(?:\.\d+)?[A-Z]*)/gi
  ];

  const extractedData: ProcessorResult['extractedData'] = {
    panels: [],
    batteries: [],
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
        if (description.length > 5 && !description.match(/^\d+$/)) {
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
      cec_id: p.certificate || 'CEC-LISTED'
    })));

    extractedData.panels?.push({
      description,
      confidence: match ? match.confidence : 0.3,
      cecId: match?.cec_id,
      suggestedMatch: match ? {
        id: match.id,
        brand: match.brand,
        model: match.model,
        watts: match.power_rating || 400,
        cec_id: match.cec_id || 'CEC-LISTED',
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
        if (description.length > 5 && !description.match(/^\d+$/)) {
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
      cec_id: b.certificate || 'CEC-LISTED'
    })));

    extractedData.batteries?.push({
      description,
      confidence: match ? match.confidence : 0.3,
      cecId: match?.cec_id,
      suggestedMatch: match ? {
        id: match.id,
        brand: match.brand,
        model: match.model,
        capacity_kwh: match.capacity_kwh || match.usable_capacity || 10,
        cec_id: match.cec_id || 'CEC-LISTED',
        confidence: match.confidence,
        matchType: match.matchType
      } : undefined
    });
  }

  // Extract system size
  const systemSizePatterns = [
    /(\d+(?:\.\d+)?)\s*(kw|kilowatt|kva)\s*(?:system|install|solar|capacity)/gi,
    /(?:system\s*size|capacity)[\s:]*(\d+(?:\.\d+)?)\s*(kw|kilowatt)/gi
  ];
  
  for (const line of lines) {
    for (const pattern of systemSizePatterns) {
      const match = pattern.exec(line);
      if (match) {
        extractedData.systemSize = {
          value: parseFloat(match[1]),
          unit: match[2].toLowerCase(),
          confidence: 0.8
        };
        break;
      }
    }
    if (extractedData.systemSize) break;
  }

  // Extract total cost
  const costPatterns = [
    /(?:total|price|cost|amount)[\s:]*\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:total|inc|including)/gi,
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g
  ];
  
  const costs: number[] = [];
  for (const line of lines) {
    for (const pattern of costPatterns) {
      const matches = [...line.matchAll(pattern)];
      for (const match of matches) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (value > 1000 && value < 1000000) {
          costs.push(value);
        }
      }
    }
  }
  
  if (costs.length > 0) {
    extractedData.totalCost = {
      value: Math.max(...costs),
      confidence: 0.7
    };
  }

  // Extract postcode
  const postcodePatterns = [
    /(?:postcode|post\s*code|postal\s*code)[\s:]*(\d{4})/gi,
    /\b(\d{4})\b/g // Any 4-digit number as potential postcode
  ];
  
  for (const line of lines) {
    for (const pattern of postcodePatterns) {
      const match = pattern.exec(line);
      if (match) {
        const postcode = match[1];
        // Basic Australian postcode validation
        if (postcode >= '1000' && postcode <= '9999') {
          extractedData.postcode = {
            value: postcode,
            confidence: pattern.source.includes('postcode') ? 0.9 : 0.6
          };
          break;
        }
      }
    }
    if (extractedData.postcode) break;
  }

  // Extract installer name
  const installerPatterns = [
    /(?:installer|company|business)[\s:]*([a-zA-Z0-9\s&\-\.]{3,50})/gi,
    /(?:contact|from)[\s:]*([a-zA-Z0-9\s&\-\.]{3,50})/gi
  ];
  
  for (const line of lines) {
    for (const pattern of installerPatterns) {
      const match = pattern.exec(line);
      if (match) {
        const name = match[1].trim();
        if (name.length > 2 && !name.match(/^\d+$/)) {
          extractedData.installer = {
            name,
            confidence: 0.6
          };
          break;
        }
      }
    }
    if (extractedData.installer) break;
  }

  return extractedData;
}

// Validation function
export const validateExtractedData = (data: ProcessorResult['extractedData']): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} => {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (!data?.panels?.length && !data?.batteries?.length) {
    warnings.push('No solar panels or batteries detected in the document');
    suggestions.push('Try uploading a clearer document or check if it contains equipment specifications');
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
  
  // Check for missing postcode
  if (!data?.postcode) {
    warnings.push('Postcode not detected in document');
    suggestions.push('Please enter your postcode manually for accurate rebate calculations');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
  };
};