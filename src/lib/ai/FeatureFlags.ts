// Feature flagging system for Lite vs Pro functionality

export interface FeatureFlags {
  // Core features
  basicRebatesCalculator: boolean;
  billUpload: boolean;
  quickROIPreview: boolean;
  
  // Pro features
  fullOCR: boolean;
  planIngestion: boolean;
  milpOptimization: boolean;
  causalUplift: boolean;
  tariffForecasting: boolean;
  scenarioCompare: boolean;
  exportPDF: boolean;
  shareLinks: boolean;
  integrations: boolean;
  
  // Advanced features
  aiOrchestrator: boolean;
  modelTraining: boolean;
  anomalyDetection: boolean;
  confidenceIntervals: boolean;
  explainability: boolean;
  
  // Data sources
  energyPlansAPI: boolean;
  vicEnergyCompare: boolean;
  comprehensiveScraping: boolean;
  
  // UI features
  accuracyModeToggle: boolean;
  systemManager: boolean;
  devMode: boolean;
}

export function getFeatureFlags(tier: 'free' | 'lite' | 'pro', devMode: boolean = false): FeatureFlags {
  const baseFlags: FeatureFlags = {
    // Core features - available to all
    basicRebatesCalculator: true,
    billUpload: true,
    quickROIPreview: true,
    
    // Pro features - disabled by default
    fullOCR: false,
    planIngestion: false,
    milpOptimization: false,
    causalUplift: false,
    tariffForecasting: false,
    scenarioCompare: false,
    exportPDF: false,
    shareLinks: false,
    integrations: false,
    
    // Advanced features - disabled by default
    aiOrchestrator: false,
    modelTraining: false,
    anomalyDetection: false,
    confidenceIntervals: false,
    explainability: false,
    
    // Data sources - basic by default
    energyPlansAPI: true,
    vicEnergyCompare: false,
    comprehensiveScraping: false,
    
    // UI features
    accuracyModeToggle: false,
    systemManager: false,
    devMode: devMode
  };

  // Lite tier enhancements
  if (tier === 'lite' || tier === 'pro') {
    baseFlags.fullOCR = true;
    baseFlags.planIngestion = true;
    baseFlags.aiOrchestrator = true;
    baseFlags.accuracyModeToggle = true;
    baseFlags.confidenceIntervals = true;
    baseFlags.vicEnergyCompare = true;
  }

  // Pro tier enhancements
  if (tier === 'pro') {
    baseFlags.milpOptimization = true;
    baseFlags.causalUplift = true;
    baseFlags.tariffForecasting = true;
    baseFlags.scenarioCompare = true;
    baseFlags.exportPDF = true;
    baseFlags.shareLinks = true;
    baseFlags.integrations = true;
    baseFlags.modelTraining = true;
    baseFlags.anomalyDetection = true;
    baseFlags.explainability = true;
    baseFlags.systemManager = true;
    baseFlags.comprehensiveScraping = true;
  }

  // Dev mode overrides
  if (devMode) {
    Object.keys(baseFlags).forEach(key => {
      (baseFlags as any)[key] = true;
    });
  }

  return baseFlags;
}

// Hook for React components
export function useFeatureFlags(tier: 'free' | 'lite' | 'pro', devMode: boolean = false): FeatureFlags {
  return getFeatureFlags(tier, devMode);
}