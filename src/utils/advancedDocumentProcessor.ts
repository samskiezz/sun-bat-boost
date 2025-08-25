import { createWorker, PSM } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { intelligentMatcher } from './intelligentMatcher';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

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

// Enhanced image preprocessing with multiple techniques
const preprocessImage = (file: File): Promise<Blob[]> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }
        
        const results: Blob[] = [];
        
        // Original image
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) results.push(blob);
        }, 'image/jpeg', 0.95);
        
        // High contrast version
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          const contrast = gray > 140 ? 255 : gray < 100 ? 0 : gray;
          data[i] = contrast;
          data[i + 1] = contrast;
          data[i + 2] = contrast;
        }
        
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            results.push(blob);
            resolve(results);
          }
        }, 'image/jpeg', 0.95);
        
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Multi-pass OCR processing
const processImageFile = async (file: File): Promise<string> => {
  let worker: Tesseract.Worker | null = null;
  
  try {
    console.log('Starting advanced OCR processing...');
    
    // Get multiple preprocessed versions
    const processedImages = await preprocessImage(file);
    let bestText = '';
    let bestConfidence = 0;
    
    worker = await createWorker('eng');
    
    // Multiple OCR passes with different configurations
    const configs = [
      {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,()$×x: -\n/\\',
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: '1'
      },
      {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,()$×x: -\n/\\',
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1'
      }
    ];
    
    for (const config of configs) {
      await worker.setParameters(config);
      
      for (const processedImage of processedImages) {
        const { data: { text, confidence } } = await worker.recognize(processedImage);
        
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestText = text;
        }
      }
    }
    
    console.log(`Best OCR confidence: ${bestConfidence}%`);
    return bestText || '';
    
  } catch (error) {
    console.error('Advanced OCR processing error:', error);
    throw new Error(`Advanced OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
};

// Process PDF files with enhanced text extraction
const processPDFFile = async (file: File): Promise<string> => {
  try {
    console.log('Processing PDF with advanced extraction...');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Enhanced text extraction with positioning
      const pageText = textContent.items
        .sort((a: any, b: any) => {
          // Sort by vertical position first, then horizontal
          const yDiff = Math.abs(a.transform[5] - b.transform[5]);
          if (yDiff < 5) {
            return a.transform[4] - b.transform[4]; // Same line, sort by x
          }
          return b.transform[5] - a.transform[5]; // Different lines, sort by y
        })
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ');
      
      fullText += pageText + '\n';
    }
    
    console.log('Advanced PDF processing completed');
    return fullText;
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Process Excel files with better structure recognition
const processExcelFile = async (file: File): Promise<string> => {
  try {
    console.log('Processing Excel with structure recognition...');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let allText = '';
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Process with structure awareness
      jsonData.forEach((row: any, rowIndex: number) => {
        if (Array.isArray(row)) {
          const rowText = row.filter(cell => cell && cell.toString().trim()).join(' | ');
          if (rowText.trim()) {
            allText += `Row ${rowIndex + 1}: ${rowText}\n`;
          }
        }
      });
    });
    
    console.log('Excel structure processing completed');
    return allText;
  } catch (error) {
    console.error('Excel processing error:', error);
    throw new Error(`Excel processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Advanced database matching with scoring
class EquipmentMatcher {
  async initialize() {
    await intelligentMatcher.initialize();
  }
  
  // Advanced panel matching using intelligent matcher
  matchPanel(description: string, context: string = '') {
    const match = intelligentMatcher.findBestPanelMatch(description);
    return match;
  }
  
  // Advanced battery matching using intelligent matcher
  matchBattery(description: string, context: string = '') {
    const match = intelligentMatcher.findBestBatteryMatch(description);
    return match;
  }
}

// Main processing function
export const processAdvancedDocument = async (file: File): Promise<AdvancedProcessorResult> => {
  try {
    console.log(`Processing ${file.type} file: ${file.name} with advanced algorithms`);
    
    let text = '';
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    // Determine file type and process
    if (fileType.startsWith('image/') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
      text = await processImageFile(file);
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      text = await processPDFFile(file);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileName.endsWith('.xlsx')) {
      text = await processExcelFile(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}. Supported: JPG, PNG, PDF, XLSX`);
    }
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }
    
    // Extract structured data with advanced algorithms
    const extractedData = await extractAdvancedSystemData(text);
    
    return {
      success: true,
      extractedData,
      rawText: text,
    };
    
  } catch (error) {
    console.error('Advanced document processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process document',
    };
  }
};

async function extractAdvancedSystemData(text: string): Promise<AdvancedProcessorResult['extractedData']> {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const matcher = new EquipmentMatcher();
  await matcher.initialize();
  
  console.log('=== INTELLIGENT EXTRACTION STARTING ===');
  console.log('Raw text:', text.substring(0, 500) + '...');
  
  const extractedData: AdvancedProcessorResult['extractedData'] = {
    panels: [],
    batteries: [],
    systemSize: undefined,
    totalCost: undefined,
    postcode: undefined,
    installer: undefined
  };
  
  // Enhanced pattern recognition with context awareness
  const panelCandidates: Array<{description: string, context: string, line: string}> = [];
  const batteryCandidates: Array<{description: string, context: string, line: string}> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    console.log(`Processing line ${i}: "${line}"`);
    
    // Skip non-equipment lines
    if (lowerLine.includes('app') || 
        lowerLine.includes('monitoring') || 
        lowerLine.includes('visibility') ||
        lowerLine.includes('control') ||
        lowerLine.includes('designed to give') ||
        lowerLine.includes('real-time') ||
        lowerLine.includes('features')) {
      console.log('  -> Skipped (app/monitoring content)');
      continue;
    }
    
    // Extract solar panels with enhanced patterns
    const panelPatterns = [
      // Tiger Neo specific pattern
      /(Tiger\s+Neo\s+N-type\s+[A-Z0-9\-]+)/gi,
      // JKM series with model numbers
      /(JKM\d{3,}[A-Z]*[-_]?\d*[A-Z]*[-_]?[A-Z0-9]*)/gi,
      // Quantity x Model patterns  
      /(\d+)\s*[x×]\s*([A-Z]{2,}[0-9]{3,}[A-Z]*[-_]?[0-9]*[A-Z]*)/gi,
      // Wattage with panels
      /(\d{3,})\s*[Ww]att\s*panels?/gi,
      // Brand + model combinations
      /((?:jinko|trina|canadian|lg|rec|sunpower)\s*[A-Z0-9\s\-\.]+)/gi
    ];
    
    for (const pattern of panelPatterns) {
      const matches = [...line.matchAll(pattern)];
      for (const match of matches) {
        if (match[0].length > 5) {
          panelCandidates.push({
            description: match[0].trim(),
            context: 'solar_panel',
            line: line
          });
          console.log(`  -> Found panel candidate: "${match[0].trim()}"`);
        }
      }
    }
    
    // Extract batteries with enhanced patterns (exclude inverters explicitly)
    if (!lowerLine.includes('inverter') && 
        !lowerLine.includes('sma') && 
        !lowerLine.includes('fronius') &&
        !lowerLine.includes('enphase') &&
        !lowerLine.includes('solaredge')) {
      
      const batteryPatterns = [
        // Sigen Battery with capacity
        /(Sigen\s+Battery[\s\S]*?(\d+(?:\.\d+)?)\s*kwh)/gi,
        // SigenStor models
        /(SigenStor\s+[A-Z0-9\s\-\.]+)/gi,
        // Capacity with "of Battery Storage"
        /(\d+(?:\.\d+)?)\s*kwh\s*of\s*Battery\s*Storage/gi,
        // Battery with capacity
        /(\d+(?:\.\d+)?)\s*kwh\s*(?:battery|storage)/gi,
        // Sigenergy brand
        /(Sigenergy[\s\S]*?(?:\d+(?:\.\d+)?)\s*kwh)/gi,
        // BAT models
        /(BAT\s*\d+(?:\.\d+)?)/gi
      ];
      
      for (const pattern of batteryPatterns) {
        const matches = [...line.matchAll(pattern)];
        for (const match of matches) {
          if (match[0].length > 5) {
            batteryCandidates.push({
              description: match[0].trim(),
              context: 'battery_storage', 
              line: line
            });
            console.log(`  -> Found battery candidate: "${match[0].trim()}"`);
          }
        }
      }
    }
  }
  
  console.log(`Found ${panelCandidates.length} panel candidates and ${batteryCandidates.length} battery candidates`);
  
  // Process panel candidates with intelligent matching
  const processedPanels = new Set<string>();
  for (const candidate of panelCandidates) {
    if (!processedPanels.has(candidate.description)) {
      processedPanels.add(candidate.description);
      
      console.log(`Matching panel: "${candidate.description}"`);
      const match = matcher.matchPanel(candidate.description, candidate.context);
      
      if (match) {
        // Extract additional info from line
        const quantityMatch = candidate.line.match(/(\d+)\s*[x×]/i);
        const wattsMatch = candidate.line.match(/(\d{3,})\s*[Ww]att/i);
        
        extractedData.panels?.push({
          description: candidate.description,
          confidence: match.confidence,
          quantity: quantityMatch ? parseInt(quantityMatch[1]) : undefined,
          watts: wattsMatch ? parseInt(wattsMatch[1]) : match?.power_rating,
          cecId: match.certificate,
          suggestedMatch: {
            id: match.id,
            brand: match.brand,
            model: match.model,
            watts: match.power_rating || 0,
            cec_id: match.certificate || 'CEC-LISTED',
            confidence: match.confidence,
            matchType: match.matchType
          }
        });
        
        console.log(`✓ Panel matched: ${match.brand} ${match.model} (${(match.confidence * 100).toFixed(1)}%)`);
      } else {
        console.log(`✗ No panel match found for: "${candidate.description}"`);
      }
    }
  }
  
  // Process battery candidates with intelligent matching
  const processedBatteries = new Set<string>();
  for (const candidate of batteryCandidates) {
    if (!processedBatteries.has(candidate.description)) {
      processedBatteries.add(candidate.description);
      
      console.log(`Matching battery: "${candidate.description}"`);
      const match = matcher.matchBattery(candidate.description, candidate.context);
      
      if (match) {
        // Extract capacity from line
        const capacityMatch = candidate.line.match(/(\d+(?:\.\d+)?)\s*kwh/gi);
        let extractedCapacity = capacityMatch ? parseFloat(capacityMatch[0].replace(/kwh/gi, '')) : undefined;
        
        extractedData.batteries?.push({
          description: candidate.description,
          confidence: match.confidence,
          capacity_kwh: extractedCapacity || match.capacity_kwh,
          cecId: match.certificate,
          suggestedMatch: {
            id: match.id,
            brand: match.brand,
            model: match.model,
            capacity_kwh: match.capacity_kwh || 0,
            cec_id: match.certificate || 'CEC-LISTED',
            confidence: match.confidence,
            matchType: match.matchType
          }
        });
        
        console.log(`✓ Battery matched: ${match.brand} ${match.model} ${match.capacity_kwh}kWh (${(match.confidence * 100).toFixed(1)}%)`);
      } else {
        console.log(`✗ No battery match found for: "${candidate.description}"`);
      }
    }
  }
  
  // Extract system size with enhanced patterns
  const systemSizePatterns = [
    /(\d+(?:\.\d+)?)\s*kw\s*of\s*solar\s*power/gi,
    /(\d+(?:\.\d+)?)\s*kw\s*(?:system|capacity|install)/gi
  ];
  
  for (const line of lines) {
    for (const pattern of systemSizePatterns) {
      const match = pattern.exec(line);
      if (match) {
        extractedData.systemSize = {
          value: parseFloat(match[1]),
          unit: 'kw',
          confidence: 0.9
        };
        console.log(`✓ System size found: ${match[1]}kW`);
        break;
      }
    }
    if (extractedData.systemSize) break;
  }
  
  // Extract postcode
  const postcodePattern = /\b(\d{4})\b/g;
  for (const line of lines) {
    const matches = [...line.matchAll(postcodePattern)];
    for (const match of matches) {
      const postcode = match[1];
      if (postcode >= '1000' && postcode <= '9999') {
        extractedData.postcode = {
          value: postcode,
          confidence: 0.8
        };
        console.log(`✓ Postcode found: ${postcode}`);
        break;
      }
    }
    if (extractedData.postcode) break;
  }
  
  console.log('=== EXTRACTION COMPLETE ===');
  console.log(`Final results: ${extractedData.panels?.length || 0} panels, ${extractedData.batteries?.length || 0} batteries`);
  
  return extractedData;
}

// Validation function
export const validateAdvancedExtractedData = (data: AdvancedProcessorResult['extractedData']): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} => {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (!data?.panels?.length && !data?.batteries?.length) {
    warnings.push('No solar equipment detected');
    suggestions.push('Ensure the document contains clear equipment specifications');
  }
  
  // Check for high confidence matches
  const highConfidenceItems = [
    ...(data?.panels?.filter(p => p.confidence > 0.7) || []),
    ...(data?.batteries?.filter(b => b.confidence > 0.7) || [])
  ];
  
  if (highConfidenceItems.length === 0 && (data?.panels?.length || data?.batteries?.length)) {
    warnings.push('Low confidence in equipment matches');
    suggestions.push('Please verify equipment models against CEC approved lists');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
  };
};