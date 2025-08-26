import { supabase } from '@/integrations/supabase/client';

export interface CatalogueProduct {
  id: string;
  brand: string;
  model: string;
  type: 'panel' | 'battery';
  specs: {
    watts?: number;
    kWh?: number;
    cellGroup?: string;
    usable_capacity?: number;
  };
  regex: string;
  aliases: string[];
}

export interface InverterBrand {
  brand: string;
  patterns: string[];
}

// Universal inverter brands lexicon
export const INVERTER_BRANDS: InverterBrand[] = [
  { brand: 'SIGENERGY', patterns: ['SIGEN', 'SIGENSTOR'] },
  { brand: 'GOODWE', patterns: ['GOODWE', 'GW'] },
  { brand: 'SUNGROW', patterns: ['SUNGROW', 'SG'] },
  { brand: 'SOLAREDGE', patterns: ['SOLAREDGE', 'SE'] },
  { brand: 'FRONIUS', patterns: ['FRONIUS'] },
  { brand: 'SMA', patterns: ['SMA'] },
  { brand: 'SOLIS', patterns: ['SOLIS'] },
  { brand: 'HUAWEI', patterns: ['HUAWEI'] },
  { brand: 'DELTA', patterns: ['DELTA'] },
  { brand: 'GROWATT', patterns: ['GROWATT'] },
  { brand: 'ENPHASE', patterns: ['ENPHASE', 'IQ'] },
  { brand: 'REDBACK', patterns: ['REDBACK'] },
  { brand: 'ABB', patterns: ['ABB'] },
  { brand: 'SCHNEIDER', patterns: ['SCHNEIDER'] },
];

class CatalogueClient {
  private panelCache: CatalogueProduct[] = [];
  private batteryCache: CatalogueProduct[] = [];
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    
    console.log('📊 Initializing universal catalogue client...');
    
    // Load panels from DB
    const { data: panels } = await supabase
      .from('pv_modules')
      .select('*')
      .limit(3000);
    
    // Load batteries from DB  
    const { data: batteries } = await supabase
      .from('batteries')
      .select('*')
      .limit(2000);
    
    // Process panels - generate regex + aliases for ALL brands equally
    this.panelCache = (panels || []).map(panel => ({
      id: String(panel.id),
      brand: this.normalizeBrand(panel.brand),
      model: this.normalizeModel(panel.model),
      type: 'panel' as const,
      specs: {
        watts: panel.power_rating,
        cellGroup: this.extractCellGroup(panel.model),
      },
      regex: this.generateRegexPattern(panel.brand, panel.model, panel.power_rating),
      aliases: this.generateAliases(panel.brand, panel.model, panel.power_rating)
    }));
    
    // Process batteries - generate regex + aliases for ALL brands equally
    this.batteryCache = (batteries || []).map(battery => ({
      id: String(battery.id),
      brand: this.normalizeBrand(battery.brand),
      model: this.normalizeModel(battery.model),
      type: 'battery' as const,
      specs: {
        kWh: battery.capacity_kwh || battery.usable_capacity,
        usable_capacity: battery.usable_capacity,
      },
      regex: this.generateRegexPattern(battery.brand, battery.model, battery.capacity_kwh),
      aliases: this.generateAliases(battery.brand, battery.model, battery.capacity_kwh)
    }));
    
    console.log(`✅ Loaded ${this.panelCache.length} panels, ${this.batteryCache.length} batteries with universal patterns`);
    this.initialized = true;
  }

  getPanels(): CatalogueProduct[] {
    return this.panelCache;
  }

  getBatteries(): CatalogueProduct[] {
    return this.batteryCache;
  }

  private normalizeBrand(brand: string): string {
    return brand.toUpperCase().trim().replace(/\s+/g, ' ');
  }

  private normalizeModel(model: string): string {
    return model.toUpperCase().trim().replace(/\s+/g, ' ');
  }

  private extractCellGroup(model: string): string | undefined {
    const cellMatch = model.match(/-(\d{2,3})-/);
    return cellMatch ? cellMatch[1] : undefined;
  }

  private generateRegexPattern(brand: string, model: string, rating?: number): string {
    const brandPattern = this.normalizeBrand(brand)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s/g, '\\s*');
    
    const modelPattern = this.normalizeModel(model)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/[-]/g, '[-\\s]?')
      .replace(/\./g, '\\.')
      .replace(/\//g, '[/\\-\\s]?')
      .replace(/\s/g, '\\s*');
    
    // Strict token order with optional separators
    return `\\b${brandPattern}[-\\s]*${modelPattern}\\b`;
  }

  private generateAliases(brand: string, model: string, rating?: number): string[] {
    const normalizedBrand = this.normalizeBrand(brand);
    const normalizedModel = this.normalizeModel(model);
    const aliases: Set<string> = new Set();
    
    // Base combinations
    aliases.add(`${normalizedBrand} ${normalizedModel}`);
    aliases.add(`${normalizedBrand}${normalizedModel}`);
    aliases.add(`${normalizedBrand}-${normalizedModel}`);
    aliases.add(normalizedModel); // Model only
    
    // Remove separators entirely
    const modelNoSep = normalizedModel.replace(/[-\s\/]/g, '');
    aliases.add(`${normalizedBrand}${modelNoSep}`);
    aliases.add(modelNoSep);
    
    // Replace separators
    const modelSpaces = normalizedModel.replace(/[-\/]/g, ' ');
    const modelDashes = normalizedModel.replace(/[\s\/]/g, '-');
    const modelSlashes = normalizedModel.replace(/[-\s]/g, '/');
    
    aliases.add(`${normalizedBrand} ${modelSpaces}`);
    aliases.add(`${normalizedBrand}-${modelDashes}`);
    aliases.add(`${normalizedBrand}/${modelSlashes}`);
    
    // OCR confusion variants (0/O, 1/I, -/_)
    const ocrVariants = normalizedModel
      .replace(/0/g, '[0O]')
      .replace(/1/g, '[1I]')
      .replace(/-/g, '[-_]');
    aliases.add(`${normalizedBrand}${ocrVariants}`);
    
    // Include rating if provided
    if (rating) {
      aliases.add(`${normalizedBrand} ${normalizedModel} ${rating}`);
      aliases.add(`${normalizedBrand}${normalizedModel}${rating}`);
    }
    
    return Array.from(aliases);
  }
}

export const catalogueClient = new CatalogueClient();