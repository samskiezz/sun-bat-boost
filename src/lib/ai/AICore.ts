import { catalogueClient, type CatalogueProduct } from '@/utils/catalogClient';
import { trainRebateOptimizer, predictOptimalConfiguration } from './RebateOptimizer';
import { diagnoseConfiguration } from './DiagnosticEngine';
import { fuzzyMatchProduct, type ProductMatch } from './NLPResolver';
import { type MatchCandidate } from '@/utils/fuzzyMatch';

export interface Catalog {
  panels: CatalogueProduct[];
  inverters: any[];
  batteries: CatalogueProduct[];
}

export type AppMode = 'lite' | 'pro';
export type UserIntent = 'maximize-rebates' | 'minimize-cost' | 'maximize-self-consumption' | 'off-grid-prep';
export type ProductType = 'panel' | 'inverter' | 'battery';

interface AICoreConfig {
  mode: AppMode;
  userIntent?: UserIntent;
  location?: string;
}

export interface AIState {
  panels: MatchCandidate[];
  inverters: MatchCandidate[];
  batteries: MatchCandidate[];
  billAmount: number | null;
  estimatedUsage: number | null;
  postcode: string | null;
  installDate: string | null;
}

export interface Diagnostic {
  code: string;
  message: string;
  severity: 'info' | 'warn' | 'error';
  relatedComponent?: ProductType;
  suggestedAction?: string;
}

export interface Suggestion {
  type: 'add' | 'remove' | 'replace';
  productType: ProductType;
  reason: string;
  newProductId?: string;
  currentProductId?: string;
  expectedImpact: { 
    rebates: number; 
    paybackPeriod: number;
    confidence: number;
  };
}

export interface AIAssistantResponse {
  diagnostics: Diagnostic[];
  suggestions: Suggestion[];
  canProceed: boolean;
  confidence: number;
  reasoning: string;
}

export class AICore {
  private catalog: Catalog;
  private mode: AppMode;
  private userIntent: UserIntent;
  private isModelsTrained: boolean = false;
  
  public state: AIState;

  constructor(config: AICoreConfig) {
    this.mode = config.mode;
    this.userIntent = config.userIntent || 'maximize-rebates';
    this.catalog = { panels: [], inverters: [], batteries: [] };
    this.state = {
      panels: [],
      inverters: [],
      batteries: [],
      billAmount: null,
      estimatedUsage: null,
      postcode: null,
      installDate: null
    };
    
    this.initializeModels();
  }

  private async initializeModels() {
    if (this.mode === 'pro' && !this.isModelsTrained) {
      try {
        console.log('[AICore] Initializing ML models...');
        await catalogueClient.init();
        this.catalog.panels = catalogueClient.getPanels();
        this.catalog.batteries = catalogueClient.getBatteries();
        this.catalog.inverters = []; // Will be populated from OCR or manual input
        
        await trainRebateOptimizer(this.catalog);
        this.isModelsTrained = true;
        console.log('[AICore] Models initialized successfully');
      } catch (error) {
        console.warn('[AICore] Failed to initialize models:', error);
      }
    } else {
      // Initialize catalog even in lite mode
      try {
        await catalogueClient.init();
        this.catalog.panels = catalogueClient.getPanels();
        this.catalog.batteries = catalogueClient.getBatteries();
        this.catalog.inverters = [];
      } catch (error) {
        console.warn('[AICore] Failed to initialize catalog:', error);
      }
    }
  }

  // Primary public method: event handler for user actions
  async onUserAction(action: string, payload: any): Promise<AIAssistantResponse> {
    try {
      // 1. Update internal state
      await this.updateState(action, payload);

      // 2. Run diagnostics
      const diagnostics = await diagnoseConfiguration(this.state, this.catalog, this.mode);

      // 3. Generate intelligent suggestions if in pro mode
      let suggestions: Suggestion[] = [];
      if (this.mode === 'pro' && this.isModelsTrained) {
        suggestions = await predictOptimalConfiguration(
          this.state, 
          this.catalog, 
          this.userIntent
        );
      }

      // 4. Calculate overall confidence
      const confidence = this.calculateConfidence(diagnostics, suggestions);

      // 5. Generate reasoning explanation
      const reasoning = this.generateReasoning(diagnostics, suggestions);

      return {
        diagnostics,
        suggestions,
        canProceed: diagnostics.every(d => d.severity !== 'error'),
        confidence,
        reasoning
      };
    } catch (error) {
      console.error('[AICore] Error processing user action:', error);
      return {
        diagnostics: [{
          code: 'AI_ERROR',
          message: 'AI processing failed, falling back to basic mode',
          severity: 'warn'
        }],
        suggestions: [],
        canProceed: true,
        confidence: 0.5,
        reasoning: 'Using fallback processing due to AI error'
      };
    }
  }

  private async updateState(action: string, payload: any) {
    switch (action) {
      case 'USER_ADDED_PRODUCT':
        const resolvedProduct = await this.resolveProduct(payload.userInput, payload.productType);
        if (resolvedProduct) {
          const targetArray = this.state[resolvedProduct.type + 's' as keyof AIState] as MatchCandidate[];
          targetArray.push({
            id: resolvedProduct.id,
            brand: resolvedProduct.brand,
            model: resolvedProduct.model,
            ...resolvedProduct
          });
        }
        break;
        
      case 'USER_ENTERED_BILL':
        this.state.billAmount = payload.amount;
        this.state.estimatedUsage = this.estimateUsage(payload.amount);
        break;
        
      case 'USER_SET_POSTCODE':
        this.state.postcode = payload.postcode;
        break;
        
      case 'USER_SET_INSTALL_DATE':
        this.state.installDate = payload.date;
        break;
        
      case 'OCR_DATA_EXTRACTED':
        this.processOCRData(payload.data);
        break;
        
      case 'USER_REMOVED_PRODUCT':
        this.removeProduct(payload.productType, payload.productId);
        break;
    }
  }

  private async resolveProduct(userInput: string, productType?: ProductType): Promise<ProductMatch | null> {
    // 1. Try exact matching first (fast)
    const exactMatch = this.exactMatch(userInput, productType);
    if (exactMatch) {
      return { ...exactMatch, confidence: 0.95 };
    }

    // 2. Use ML-based fuzzy matching in pro mode
    if (this.mode === 'pro') {
      return await fuzzyMatchProduct(userInput, this.catalog, productType);
    }

    return null;
  }

  private exactMatch(input: string, productType?: ProductType): ProductMatch | null {
    const searchTerms = input.toLowerCase().trim();
    
    // Search through catalog for exact brand/model matches
    const allProducts = [
      ...this.catalog.panels.map(p => ({ ...p, type: 'panel' as const })),
      ...this.catalog.batteries.map(b => ({ ...b, type: 'battery' as const })),
      ...this.catalog.inverters.map(i => ({ ...i, type: 'inverter' as const }))
    ];

    for (const product of allProducts) {
      const brandModel = `${product.brand} ${product.model}`.toLowerCase();
      if (brandModel.includes(searchTerms) || searchTerms.includes(brandModel)) {
        return {
          id: product.id,
          brand: product.brand,
          model: product.model,
          type: product.type,
          confidence: 0.9,
          power_rating: product.specs?.watts,
          capacity_kwh: product.specs?.kWh
        };
      }
    }

    return null;
  }

  private processOCRData(data: any) {
    if (data.panels?.best) {
      this.state.panels.push({
        id: data.panels.best.id || 'ocr_panel',
        brand: data.panels.best.brand || 'Unknown',
        model: data.panels.best.model || 'Unknown',
        power_rating: data.panels.best.arrayKwDc
      });
    }

    if (data.battery?.best) {
      this.state.batteries.push({
        id: data.battery.best.id || 'ocr_battery',
        brand: data.battery.best.brand || 'Unknown',
        model: data.battery.best.model || 'Unknown',
        capacity_kwh: data.battery.best.usableKWh
      });
    }

    if (data.inverter?.value) {
      this.state.inverters.push({
        id: 'ocr_inverter',
        brand: data.inverter.brand || 'Unknown',
        model: data.inverter.value
      });
    }

    if (data.policyCalcInput?.postcode) {
      this.state.postcode = data.policyCalcInput.postcode;
    }
  }

  private removeProduct(productType: ProductType, productId: string) {
    const targetArray = this.state[productType + 's' as keyof AIState] as MatchCandidate[];
    const index = targetArray.findIndex(p => p.id === productId);
    if (index > -1) {
      targetArray.splice(index, 1);
    }
  }

  private estimateUsage(billAmount: number): number {
    // Simple estimation: assume ~$0.30 per kWh average
    return Math.round(billAmount / 0.30 / 3); // quarterly to monthly
  }

  private calculateConfidence(diagnostics: Diagnostic[], suggestions: Suggestion[]): number {
    const errorCount = diagnostics.filter(d => d.severity === 'error').length;
    const warnCount = diagnostics.filter(d => d.severity === 'warn').length;
    
    let baseConfidence = 1.0;
    baseConfidence -= errorCount * 0.3;
    baseConfidence -= warnCount * 0.1;
    
    // Boost confidence if we have good suggestions
    if (suggestions.length > 0) {
      const avgSuggestionConfidence = suggestions.reduce((sum, s) => sum + s.expectedImpact.confidence, 0) / suggestions.length;
      baseConfidence = Math.max(baseConfidence, avgSuggestionConfidence * 0.8);
    }
    
    return Math.max(0.1, Math.min(1.0, baseConfidence));
  }

  private generateReasoning(diagnostics: Diagnostic[], suggestions: Suggestion[]): string {
    let reasoning = "Analysis complete. ";
    
    if (diagnostics.length === 0) {
      reasoning += "No issues detected with current configuration. ";
    } else {
      const errors = diagnostics.filter(d => d.severity === 'error');
      const warnings = diagnostics.filter(d => d.severity === 'warn');
      
      if (errors.length > 0) {
        reasoning += `Found ${errors.length} critical issue(s) that need attention. `;
      }
      if (warnings.length > 0) {
        reasoning += `${warnings.length} optimization opportunity(ies) identified. `;
      }
    }
    
    if (suggestions.length > 0) {
      reasoning += `Generated ${suggestions.length} intelligent suggestion(s) to improve your system.`;
    }
    
    return reasoning;
  }

  // Public getters
  get currentMode(): AppMode {
    return this.mode;
  }

  get isProMode(): boolean {
    return this.mode === 'pro';
  }

  get systemSummary() {
    const totalPanelPower = this.state.panels.reduce((sum, p) => sum + (p.power_rating || 0), 0);
    const totalBatteryCapacity = this.state.batteries.reduce((sum, b) => sum + (b.capacity_kwh || 0), 0);
    
    return {
      panelCount: this.state.panels.length,
      totalPanelPowerKw: totalPanelPower / 1000,
      batteryCount: this.state.batteries.length,
      totalBatteryCapacityKwh: totalBatteryCapacity,
      inverterCount: this.state.inverters.length,
      isComplete: this.state.panels.length > 0 && this.state.inverters.length > 0
    };
  }
}

// Feature flags for different modes
export const featureFlags = (mode: AppMode) => ({
  maximizeRebates: mode === 'pro',
  mlProductResolution: mode === 'pro',
  predictiveOptimization: mode === 'pro',
  advancedDiagnostics: mode === 'pro',
  chatInterface: mode === 'pro'
});