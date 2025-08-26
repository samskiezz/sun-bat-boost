import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface ExtractedContent {
  text: string;
  imagesText: string[];
  method: 'native' | 'ocr' | 'hybrid';
}

export class PDFExtractor {
  private ocrWorker: Tesseract.Worker | null = null;
  
  async init(): Promise<void> {
    if (!this.ocrWorker) {
      console.log('🔧 Initializing OCR worker...');
      this.ocrWorker = await createWorker('eng');
    }
  }

  async extractFromFile(file: File): Promise<ExtractedContent> {
    await this.init();
    
    console.log('📄 Starting PDF extraction...');
    const startTime = Date.now();
    
    try {
      // Try native text extraction first
      const nativeText = await this.extractNativeText(file);
      let imagesText: string[] = [];
      let method: ExtractedContent['method'] = 'native';
      
      // If native text is sparse, also do OCR
      if (nativeText.length < 500) {
        console.log('📸 Native text sparse, running OCR...');
        imagesText = await this.extractOCRText(file);
        method = nativeText.length > 50 ? 'hybrid' : 'ocr';
      }
      
      const totalText = this.normalizeText(nativeText + ' ' + imagesText.join(' '));
      
      console.log(`✅ Extraction complete (${Date.now() - startTime}ms): ${totalText.length} chars via ${method}`);
      
      return {
        text: totalText,
        imagesText,
        method
      };
      
    } catch (error) {
      console.error('❌ PDF extraction failed:', error);
      throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractNativeText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Preserve reading order by sorting by transform position
      const items = textContent.items
        .filter((item): item is any => 'str' in item)
        .sort((a, b) => {
          // Sort by Y position (top to bottom), then X position (left to right)
          const yDiff = b.transform[5] - a.transform[5]; // Y coordinate (inverted)
          if (Math.abs(yDiff) > 5) return yDiff < 0 ? -1 : 1;
          return a.transform[4] - b.transform[4]; // X coordinate
        });
      
      const pageText = items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  }

  private async extractOCRText(file: File): Promise<string[]> {
    if (!this.ocrWorker) throw new Error('OCR worker not initialized');
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const imagesText: string[] = [];
    
    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) { // Limit to first 5 pages for performance
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        }).promise;
        
        // Convert canvas to blob for OCR
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(resolve as (blob: Blob | null) => void, 'image/png');
        }) as Blob;
        
        const { data: { text } } = await this.ocrWorker.recognize(blob);
        
        if (text.trim().length > 0) {
          imagesText.push(text);
        }
        
      } catch (error) {
        console.warn(`OCR failed for page ${i}:`, error);
      }
    }
    
    return imagesText;
  }

  private normalizeText(text: string): string {
    return text
      // Convert to uppercase for consistent matching
      .toUpperCase()
      // Fix hyphen line breaks: word-\nword → wordword
      .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
      // Normalize all dash types to standard hyphen
      .replace(/[–—−]/g, '-')
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      // Remove extra whitespace
      .trim();
  }

  async cleanup(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }
}

export const pdfExtractor = new PDFExtractor();