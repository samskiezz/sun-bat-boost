// Synthetic product generation for OCR-detected items not in database

export interface SyntheticProduct {
  id: string;
  brand: string;
  model: string;
  type: 'panel' | 'battery';
  power_rating?: number;
  capacity_kwh?: number;
  usable_kwh?: number;
  technology?: string;
  synthetic: true;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidences: Array<{
    page: number;
    text: string;
    context: string;
    weight: number;
  }>;
}

// Create synthetic panel when we have good specs but no DB match
export function createSyntheticPanel(
  brand: string, 
  model: string | undefined, 
  wattage: number | undefined,
  count: number | undefined,
  arrayKwDc: number | undefined,
  evidences: any[]
): SyntheticProduct {
  
  // Generate model if missing
  const finalModel = model || (wattage ? `${wattage}W` : 'Unknown');
  
  // Derive wattage if missing but we have array and count
  let finalWattage = wattage;
  if (!finalWattage && arrayKwDc && count) {
    finalWattage = Math.round((arrayKwDc * 1000) / count);
  }
  
  // Determine confidence based on completeness
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (brand && finalModel && finalWattage) {
    confidence = 'HIGH';
  } else if ((brand || finalModel) && finalWattage) {
    confidence = 'MEDIUM';
  }
  
  // Generate synthetic ID
  const id = `synthetic-panel-${brand?.toLowerCase()}-${finalModel?.toLowerCase()}-${finalWattage}w`
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-');
  
  return {
    id,
    brand: brand || 'Unknown Brand',
    model: finalModel,
    type: 'panel',
    power_rating: finalWattage,
    technology: 'Monocrystalline', // Default assumption
    synthetic: true,
    confidence,
    evidences
  };
}

// Create synthetic battery when we have good specs but no DB match
export function createSyntheticBattery(
  brand: string | undefined,
  model: string | undefined,
  usableKWh: number | undefined,
  stack: { modules?: number; moduleKWh?: number; totalKWh?: number } | undefined,
  evidences: any[]
): SyntheticProduct {
  
  // Use stack total if available and more complete
  const finalCapacity = stack?.totalKWh || usableKWh;
  
  // Generate model if missing
  let finalModel = model;
  if (!finalModel && finalCapacity) {
    finalModel = `${finalCapacity}kWh`;
  }
  
  // Determine confidence
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (brand && finalModel && finalCapacity) {
    confidence = 'HIGH';
  } else if (finalCapacity && (brand || finalModel)) {
    confidence = 'MEDIUM';
  }
  
  // Generate synthetic ID
  const id = `synthetic-battery-${brand?.toLowerCase()}-${finalCapacity}kwh`
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-');
  
  return {
    id,
    brand: brand || 'Unknown Brand',
    model: finalModel || 'Unknown Model',
    type: 'battery',
    capacity_kwh: finalCapacity,
    usable_kwh: finalCapacity, // Assume usable = total for simplicity
    synthetic: true,
    confidence,
    evidences
  };
}

// Create a generic display string for synthetic products
export function getSyntheticDisplayName(product: SyntheticProduct): string {
  if (product.type === 'panel') {
    return `${product.brand} ${product.model} (${product.power_rating}W) - Detected from Proposal`;
  } else {
    return `${product.brand} ${product.model} (${product.usable_kwh}kWh) - Detected from Proposal`;
  }
}