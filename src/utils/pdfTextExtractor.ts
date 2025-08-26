import * as pdfjsLib from 'pdfjs-dist';
import { createWorker, PSM } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface TextExtractionResult {
  text: string;
  method: 'native' | 'ocr' | 'hybrid';
  confidence: number;
}

export async function extractTextFromFile(file: File): Promise<TextExtractionResult> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  } else if (fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) {
    return extractTextFromImage(file);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileName.endsWith('.xlsx')) {
    // For XLSX, we'll use the existing Excel processing
    const text = await processExcelFile(file);
    return { text, method: 'native', confidence: 0.95 };
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function extractTextFromPDF(file: File): Promise<TextExtractionResult> {
  console.log('📄 Extracting text from PDF...');
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    let hasNativeText = false;
    const imagePages: number[] = [];
    
    // First pass: try to extract native text
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .filter((item): item is any => 'str' in item)
        .map(item => item.str)
        .join(' ')
        .trim();
      
      if (pageText.length > 50) {
        fullText += pageText + '\n';
        hasNativeText = true;
      } else {
        // This page likely contains only images/scanned content
        imagePages.push(i);
      }
    }
    
    // If we have good native text, use it
    if (hasNativeText && fullText.length > 200) {
      console.log(`✅ Extracted ${fullText.length} characters of native PDF text`);
      return { text: fullText, method: 'native', confidence: 0.95 };
    }
    
    // If no native text or insufficient text, fall back to OCR
    console.log('📸 PDF has insufficient native text, using OCR...');
    
    let ocrText = '';
    
    // OCR the pages that don't have text
    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) { // Limit to first 5 pages for performance
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      if (context) {
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        };
        await page.render(renderContext).promise;
        
        // Convert canvas to blob for OCR
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(resolve as any, 'image/jpeg', 0.95);
        });
        
        if (blob) {
          const pageOcrText = await performOCR(blob);
          ocrText += pageOcrText + '\n';
        }
      }
    }
    
    // Combine native text (if any) with OCR text
    const combinedText = (fullText + '\n' + ocrText).trim();
    
    console.log(`✅ Extracted ${combinedText.length} characters using hybrid approach`);
    return { 
      text: combinedText, 
      method: hasNativeText ? 'hybrid' : 'ocr', 
      confidence: hasNativeText ? 0.85 : 0.75 
    };
    
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextFromImage(file: File): Promise<TextExtractionResult> {
  console.log('🖼️ Extracting text from image using OCR...');
  
  try {
    const text = await performOCR(file);
    console.log(`✅ Extracted ${text.length} characters from image`);
    return { text, method: 'ocr', confidence: 0.80 };
  } catch (error) {
    console.error('Image OCR failed:', error);
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function performOCR(file: File | Blob): Promise<string> {
  const worker = await createWorker('eng');
  
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO_OSD,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/.()[]{}:;,*+= \n\t',
    });
    
    const { data: { text } } = await worker.recognize(file);
    
    return text;
  } finally {
    await worker.terminate();
  }
}

// Excel processing function (moved from advancedDocumentProcessor)
async function processExcelFile(file: File): Promise<string> {
  // Dynamic import to avoid bundling issues
  const XLSX = await import('xlsx');
  
  try {
    console.log('📊 Processing Excel file...');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let allText = '';
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      jsonData.forEach((row: any, rowIndex: number) => {
        if (Array.isArray(row)) {
          const rowText = row.filter(cell => cell && cell.toString().trim()).join(' | ');
          if (rowText.trim()) {
            allText += `Row ${rowIndex + 1}: ${rowText}\n`;
          }
        }
      });
    });
    
    console.log('✅ Excel processing completed');
    return allText;
  } catch (error) {
    console.error('Excel processing error:', error);
    throw new Error(`Excel processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}