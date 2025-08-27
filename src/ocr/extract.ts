import { OCRPage, ExtractResult, PanelCandidate, BatteryCandidate, InverterExtract } from './extract.types';
import { extractors } from './regex';
import { normalize, correctUnitByContext } from './normalize';
import { scoreCandidates } from './score';

// Determine context type from text characteristics
const detectContext = (text: string, pageIndex: number, totalPages: number): string => {
  const line = text.trim();
  
  // Header detection - only very specific header patterns, not general solar content
  if (/^.{0,30}(?:proposal\s+for|prepared\s+by|quote\s*#|valid\s+until)/i.test(line)) {
    return 'HEADER';
  }
  
  // Footer detection - only specific footer patterns
  if (/(?:page\s*\d+\/\d+|©|copyright|\.com\.au|phone:|email:)/i.test(line)) {
    return 'FOOTER';
  }
  
  // Table detection (tabs, pipes, or multiple spaces)
  if (/\||\t|(?:\s{3,})/.test(line)) {
    return 'TABLE';
  }
  
  // Default to line
  return 'LINE';
};

// Split text into contextual chunks
const analyzeTextStructure = (pages: OCRPage[]): Array<{text: string; page: number; context: string}> => {
  const chunks: Array<{text: string; page: number; context: string}> = [];
  
  pages.forEach((page, pageIndex) => {
    const lines = page.text.split('\n').filter(line => line.trim().length > 0);
    
    lines.forEach(line => {
      const context = detectContext(line, pageIndex, pages.length);
      const correctedText = correctUnitByContext(line, context);
      
      chunks.push({
        text: correctedText,
        page: page.page,
        context,
      });
    });
  });
  
  return chunks;
};

// Main extraction orchestration
function extractFromOcr(pages: OCRPage[]): ExtractResult {
  console.log('🔍 Starting OCR extraction with', pages.length, 'pages');
  
  const errors: string[] = [];
  
  try {
    // 1. Analyze text structure
    const chunks = analyzeTextStructure(pages);
    console.log('📄 Analyzed', chunks.length, 'text chunks');
    
    // 2. Extract candidates from each chunk
    let allPanelCandidates: PanelCandidate[] = [];
    let allBatteryCandidates: BatteryCandidate[] = [];
    let inverterExtract: InverterExtract | null = null;
    
    let addressExtract: { address?: string; postcode?: string } | null = null;

    chunks.forEach(chunk => {
      // Extract panels
      const panelCands = extractors.extractPanels(chunk.text, chunk.page, chunk.context);
      allPanelCandidates.push(...panelCands);
      
      // Extract batteries
      const batteryCands = extractors.extractBatteries(chunk.text, chunk.page, chunk.context);
      allBatteryCandidates.push(...batteryCands);
      
      // Extract inverter (take first good match)
      if (!inverterExtract) {
        const invExtract = extractors.extractInverter(chunk.text, chunk.page, chunk.context);
        if (invExtract) {
          inverterExtract = invExtract;
        }
      }
      
      // Extract address (take first good match)
      if (!addressExtract) {
        const addrExtract = extractors.extractAddress(chunk.text, chunk.page, chunk.context);
        if (addrExtract) {
          addressExtract = addrExtract;
        }
      }
    });
    
    console.log('🔋 Found', allBatteryCandidates.length, 'battery candidates');
    console.log('⚡ Found', allPanelCandidates.length, 'panel candidates');
    console.log('🔌 Inverter extract:', inverterExtract ? 'yes' : 'no');
    
    // 3. Normalize candidates
    allPanelCandidates = allPanelCandidates.map(normalize.panel);
    allBatteryCandidates = allBatteryCandidates.map(normalize.battery);
    if (inverterExtract) {
      inverterExtract = normalize.inverter(inverterExtract);
    }
    
    // 4. Score and disambiguate
    const panels = scoreCandidates.panels(allPanelCandidates);
    const battery = scoreCandidates.batteries(allBatteryCandidates);
    
    // 5. Determine inverter confidence
    const inverterConfidence = inverterExtract?.evidences.length > 0 ? 
      (inverterExtract.brandRaw && inverterExtract.modelRaw ? 'HIGH' : 'MEDIUM') : 'LOW';
    
    const inverterWarnings = [];
    if (!inverterExtract || inverterExtract.evidences.length === 0) {
      inverterWarnings.push('No inverter information detected');
    }
    
    // 6. Build result
    const result: ExtractResult = {
      panels,
      battery,
      inverter: {
        value: inverterExtract || undefined,
        confidence: inverterConfidence as any,
        warnings: inverterWarnings,
      },
      policyCalcInput: {
        address: addressExtract?.address,
        postcode: addressExtract?.postcode,
      },
      errors,
    };
    
    console.log('✅ Extraction complete:', {
      panels: panels.best ? `${panels.best.brand} ${panels.best.model}` : 'none',  
      battery: battery.best ? `${battery.best.brand} ${battery.best.model} ${battery.best.usableKWh}kWh` : 'none',
      inverter: inverterExtract ? `${inverterExtract.brandRaw} ${inverterExtract.modelRaw}` : 'none',
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ OCR extraction failed:', error);
    errors.push(error instanceof Error ? error.message : 'Unknown extraction error');
    
    return {
      panels: { candidates: [], confidence: 'LOW', warnings: ['Extraction failed'] },
      battery: { candidates: [], confidence: 'LOW', warnings: ['Extraction failed'] },
      inverter: { confidence: 'LOW', warnings: ['Extraction failed'] },
      policyCalcInput: {},
      errors,
    } as ExtractResult;
  }
}

export { extractFromOcr };
export type { ExtractResult, OCRPage };