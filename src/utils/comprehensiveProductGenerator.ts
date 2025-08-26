// Comprehensive Product Generator - Creates patterns for ALL database products
import { supabase } from "@/integrations/supabase/client";
import { SOLAR_PANELS, PanelSpec } from "@/data/panelData";
import { BATTERY_SYSTEMS, BatterySpec } from "@/data/batteryData";
import { Product, ProdType } from "./smartMatcher";

// Generate smart regex patterns for different product types
function generateSmartRegex(brand: string, model: string, type: ProdType): string {
  const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedModel = model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  
  // Make separators flexible
  const flexModel = escapedModel
    .replace(/\s+/g, "[-\\s]?")
    .replace(/[-]/g, "[-\\s]?")
    .replace(/[/]/g, "[-/\\s]?");
  
  switch (type) {
    case "panel":
      // Panel patterns: Brand + Model + possible wattage
      return `\\b${escapedBrand}[-\\s]?${flexModel}(?:[-\\s]?\\d{3,4}W?)?\\b`;
      
    case "inverter":
      // Inverter patterns: Brand + Model + possible kW rating
      return `\\b${escapedBrand}[-\\s]?${flexModel}(?:[-\\s]?\\d+(?:\\.\\d)?kW?)?\\b`;
      
    case "battery":
      // Battery patterns: Brand + Model + possible kWh capacity
      return `\\b${escapedBrand}[-\\s]?${flexModel}(?:[-\\s]?\\d+(?:\\.\\d)?kWh?)?\\b`;
      
    default:
      return `\\b${escapedBrand}[-\\s]?${flexModel}\\b`;
  }
}

// Generate aliases for OCR variations
function generateAliases(brand: string, model: string): string[] {
  const aliases = new Set<string>();
  
  // Original
  aliases.add(`${brand} ${model}`.toUpperCase());
  
  // Common OCR confusions
  const ocrSwaps: [string, string][] = [
    ['O', '0'], ['0', 'O'],
    ['I', '1'], ['1', 'I'],
    ['S', '5'], ['5', 'S'],
    ['B', '8'], ['8', 'B'],
    ['G', '6'], ['6', 'G'],
    ['Z', '2'], ['2', 'Z']
  ];
  
  // Apply OCR swaps
  for (const [from, to] of ocrSwaps) {
    const swapped = model.replace(new RegExp(from, 'gi'), to);
    if (swapped !== model) {
      aliases.add(`${brand} ${swapped}`.toUpperCase());
    }
  }
  
  // Spacing variations
  aliases.add(model.replace(/[-\s]/g, '').toUpperCase()); // No spaces/dashes
  aliases.add(model.replace(/[-]/g, ' ').toUpperCase()); // Dashes to spaces
  aliases.add(model.replace(/\s/g, '-').toUpperCase()); // Spaces to dashes
  
  return Array.from(aliases);
}

// Load products from Supabase database
async function loadSupabaseProducts(): Promise<Product[]> {
  const products: Product[] = [];
  
  try {
    // Load panels from pv_modules
    const { data: panels } = await supabase
      .from('pv_modules')
      .select('*')
      .eq('approval_status', 'approved');
      
    if (panels) {
      for (const panel of panels) {
        products.push({
          id: `supabase-panel-${panel.id}`,
          type: "panel",
          brand: panel.brand.toUpperCase(),
          model: panel.model,
          regex: generateSmartRegex(panel.brand, panel.model, "panel"),
          aliases: generateAliases(panel.brand, panel.model),
          specs: { power_rating: panel.power_rating },
          power_rating: panel.power_rating || undefined
        });
      }
    }
    
    // Load batteries
    const { data: batteries } = await supabase
      .from('batteries')
      .select('*')
      .eq('approval_status', 'approved');
      
    if (batteries) {
      for (const battery of batteries) {
        products.push({
          id: `supabase-battery-${battery.id}`,
          type: "battery",
          brand: battery.brand.toUpperCase(),
          model: battery.model,
          regex: generateSmartRegex(battery.brand, battery.model, "battery"),
          aliases: generateAliases(battery.brand, battery.model),
          specs: { capacity_kwh: battery.capacity_kwh },
          capacity_kwh: battery.capacity_kwh || undefined
        });
      }
    }
    
    // Load all products table for inverters and other types
    const { data: allProducts } = await supabase
      .from('all_products')
      .select('*')
      .eq('approval_status', 'approved')
      .in('product_type', ['inverter', 'panel', 'battery']);
      
    if (allProducts) {
      for (const product of allProducts) {
        const type = product.product_type as ProdType;
        products.push({
          id: `supabase-all-${product.id}`,
          type,
          brand: product.brand.toUpperCase(),
          model: product.model,
          regex: generateSmartRegex(product.brand, product.model, type),
          aliases: generateAliases(product.brand, product.model),
          specs: product.specs ? JSON.parse(product.specs) : {},
          power_rating: product.rating || undefined,
          capacity_kwh: product.capacity || undefined
        });
      }
    }
    
  } catch (error) {
    console.warn('Failed to load Supabase products:', error);
  }
  
  return products;
}

// Load products from local data files
function loadLocalProducts(): Product[] {
  const products: Product[] = [];
  
  // Add panels from panelData.ts
  Object.values(SOLAR_PANELS).forEach((panel: PanelSpec) => {
    products.push({
      id: `local-panel-${panel.id}`,
      type: "panel",
      brand: panel.brand.toUpperCase(),
      model: panel.model,
      regex: generateSmartRegex(panel.brand, panel.model, "panel"),
      aliases: [...panel.common_names.map(name => name.toUpperCase()), 
                ...generateAliases(panel.brand, panel.model)],
      specs: { power_rating: panel.power_watts },
      power_rating: panel.power_watts
    });
  });
  
  // Add batteries from batteryData.ts
  Object.values(BATTERY_SYSTEMS).forEach((battery: BatterySpec) => {
    products.push({
      id: `local-battery-${battery.id}`,
      type: "battery",
      brand: battery.brand.toUpperCase(),
      model: battery.model,
      regex: generateSmartRegex(battery.brand, battery.model, "battery"),
      aliases: [...battery.common_names.map(name => name.toUpperCase()),
                ...generateAliases(battery.brand, battery.model)],
      specs: { capacity_kwh: battery.capacity_kwh },
      capacity_kwh: battery.capacity_kwh
    });
  });
  
  return products;
}

// Generate comprehensive products from all sources
export async function generateComprehensiveProducts(): Promise<Product[]> {
  console.log('🔄 Generating comprehensive product database...');
  
  const [supabaseProducts, localProducts] = await Promise.all([
    loadSupabaseProducts(),
    loadLocalProducts()
  ]);
  
  // Combine and deduplicate by brand+model
  const productMap = new Map<string, Product>();
  
  [...localProducts, ...supabaseProducts].forEach(product => {
    const key = `${product.brand}-${product.model}`.toLowerCase();
    if (!productMap.has(key)) {
      productMap.set(key, product);
    }
  });
  
  const products = Array.from(productMap.values());
  
  console.log(`✅ Generated ${products.length} products from all sources:`, {
    panels: products.filter(p => p.type === 'panel').length,
    batteries: products.filter(p => p.type === 'battery').length,
    inverters: products.filter(p => p.type === 'inverter').length,
    brands: new Set(products.map(p => p.brand)).size
  });
  
  return products;
}

// Export specific brand regex patterns for common brands
export const BRAND_PATTERNS = {
  GOODWE: {
    inverter: /\bGW[-\s]?\d{4,5}[-\s]?(?:EH|ET|ES|MS|NS|XS|DNS|EMS|EMT|XSA|XNA)\b/gi,
    battery: /\b(?:LX|LYNX)[-\s]?F[-\s]?\d{1,2}(?:\.\d)?[-\s]?H[-\s]?\d{2}\b/gi
  },
  EGING: {
    panel: /\bEG[-\s]?\d{3,4}[A-Z]{2,6}[-\s]?(?:HL|BL|BF|DG|MG)(?:[-/\s]?[A-Z]{2})*\b/gi
  },
  TESLA: {
    battery: /\b(?:TESLA[-\s]?)?POWERWALL[-\s]?[23]?\b/gi
  },
  ENPHASE: {
    battery: /\bIQ[-\s]?BATTERY[-\s]?(?:3|5P?|10T?)?\b/gi,
    inverter: /\bIQ[-\s]?[78][-\s]?[A-Z]?\b/gi
  },
  FRONIUS: {
    inverter: /\b(?:PRIMO|SYMO|SNAP)[-\s]?\d{1,2}(?:\.\d)?[-\s]?[0-9]?\b/gi
  },
  SOLAREDGE: {
    inverter: /\bSE[-\s]?\d{4,5}[A-Z]?[-\s]?[A-Z]{2,4}\b/gi,
    battery: /\bSTOREDGE[-\s]?\d{1,2}(?:\.\d)?[-\s]?[KH]\b/gi
  }
};