// CEC cache loader for local JSON data

export interface CECBattery {
  brand: string;
  model: string;
  capacityKWh: number;
  usableKWh: number;
  approved: boolean;
  productId: string;
}

export interface CECPanel {
  brand: string;
  model: string;
  watts: number;
  approved: boolean;
  productId: string;
}

export interface CECCache {
  batteries: {
    version: string;
    lastUpdated: string;
    batteries: CECBattery[];
  };
  panels: {
    version: string;
    lastUpdated: string; 
    panels: CECPanel[];
  };
}

let cache: CECCache | null = null;

// Load CEC data from local JSON files
export async function loadCECCache(): Promise<CECCache> {
  if (cache) return cache;
  
  try {
    const [batteriesRes, panelsRes] = await Promise.all([
      import('@/data/cec_batteries.json'),
      import('@/data/cec_panels.json'),
    ]);
    
    cache = {
      batteries: batteriesRes.default,
      panels: panelsRes.default,
    };
    
    console.log('✅ CEC cache loaded:', {
      batteries: cache.batteries.batteries.length,
      panels: cache.panels.panels.length,
      batteryVersion: cache.batteries.version,
      panelVersion: cache.panels.version,
    });
    
    return cache;
  } catch (error) {
    console.warn('⚠️ Failed to load CEC cache:', error);
    
    // Return empty cache
    cache = {
      batteries: {
        version: '0.0',
        lastUpdated: 'unknown',
        batteries: [],
      },
      panels: {
        version: '0.0', 
        lastUpdated: 'unknown',
        panels: [],
      },
    };
    
    return cache;
  }
}

// Find battery by brand/model
export async function findBattery(brand?: string, model?: string, capacity?: number): Promise<CECBattery | null> {
  if (!brand && !model && !capacity) return null;
  
  const cache = await loadCECCache();
  
  return cache.batteries.batteries.find(battery => {
    let matches = 0;
    let checks = 0;
    
    if (brand) {
      checks++;
      if (battery.brand.toLowerCase().includes(brand.toLowerCase()) || 
          brand.toLowerCase().includes(battery.brand.toLowerCase())) {
        matches++;
      }
    }
    
    if (model) {
      checks++;
      if (battery.model.toLowerCase().includes(model.toLowerCase()) ||
          model.toLowerCase().includes(battery.model.toLowerCase())) {
        matches++;
      }
    }
    
    if (capacity) {
      checks++;
      const diff = Math.abs(battery.usableKWh - capacity);
      if (diff < 0.5) { // Within 0.5 kWh
        matches++;
      }
    }
    
    return matches >= Math.max(1, Math.floor(checks * 0.6)); // 60% match threshold
  }) || null;
}

// Find panel by brand/model/watts
export async function findPanel(brand?: string, model?: string, watts?: number): Promise<CECPanel | null> {
  if (!brand && !model && !watts) return null;
  
  const cache = await loadCECCache();
  
  return cache.panels.panels.find(panel => {
    let matches = 0;
    let checks = 0;
    
    if (brand) {
      checks++;
      if (panel.brand.toLowerCase().includes(brand.toLowerCase()) ||
          brand.toLowerCase().includes(panel.brand.toLowerCase())) {
        matches++;
      }
    }
    
    if (model) {
      checks++;
      if (panel.model.toLowerCase().includes(model.toLowerCase()) ||
          model.toLowerCase().includes(panel.model.toLowerCase())) {
        matches++;
      }
    }
    
    if (watts) {
      checks++;
      const diff = Math.abs(panel.watts - watts);
      if (diff < 10) { // Within 10W
        matches++;
      }
    }
    
    return matches >= Math.max(1, Math.floor(checks * 0.6)); // 60% match threshold
  }) || null;
}

// Get cache status for UI
export function getCacheStatus(): { loaded: boolean; batteriesCount: number; panelsCount: number; lastUpdated: string } {
  if (!cache) {
    return {
      loaded: false,
      batteriesCount: 0,
      panelsCount: 0,
      lastUpdated: 'Not loaded',
    };
  }
  
  return {
    loaded: true,
    batteriesCount: cache.batteries.batteries.length,
    panelsCount: cache.panels.panels.length,
    lastUpdated: cache.batteries.lastUpdated,
  };
}