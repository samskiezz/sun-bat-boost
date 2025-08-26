import { type CatalogueProduct } from '@/utils/catalogClient';
import { type AIState, type Suggestion, type UserIntent } from './AICore';
import { calculateSolarRebates } from '@/utils/solarCalculations';

interface OptimizationModel {
  trained: boolean;
  weights: {
    rebateAmount: number;
    paybackPeriod: number;
    systemReliability: number;
    futureExpansion: number;
  };
  historicalData: ConfigurationResult[];
}

interface ConfigurationResult {
  configuration: SystemConfiguration;
  rebateAmount: number;
  paybackPeriod: number;
  satisfactionScore: number;
}

interface SystemConfiguration {
  panelIds: string[];
  inverterId: string;
  batteryIds: string[];
  totalPanelKw: number;
  totalBatteryKwh: number;
  estimatedCost: number;
}

class RebateOptimizer {
  private model: OptimizationModel = {
    trained: false,
    weights: {
      rebateAmount: 0.4,
      paybackPeriod: 0.3,
      systemReliability: 0.2,
      futureExpansion: 0.1
    },
    historicalData: []
  };

  async train(catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }) {
    console.log('[RebateOptimizer] Training model...');
    
    // Generate synthetic training data based on common configurations
    this.model.historicalData = this.generateTrainingData(catalog);
    
    // Simple gradient descent to optimize weights based on historical satisfaction
    this.optimizeWeights();
    
    this.model.trained = true;
    console.log('[RebateOptimizer] Model training completed');
  }

  private generateTrainingData(catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }): ConfigurationResult[] {
    const data: ConfigurationResult[] = [];
    const panels = catalog.panels;
    const inverters = catalog.inverters;
    const batteries = catalog.batteries;

    // Generate common system sizes and configurations
    const systemSizes = [3, 5, 6.6, 8, 10, 13, 15]; // kW
    const batteryOptions = [0, 5, 10, 13.5, 20]; // kWh

    for (const systemSize of systemSizes) {
      for (const batterySize of batteryOptions) {
        // Find suitable panels for this system size
        const suitablePanels = panels.filter(p => p.specs?.watts && p.specs.watts > 300);
        if (suitablePanels.length === 0) continue;

        const selectedPanel = suitablePanels[Math.floor(Math.random() * suitablePanels.length)];
        const panelCount = Math.ceil((systemSize * 1000) / (selectedPanel.specs?.watts || 400));
        
        // Find suitable inverter (mock data for now)
        const selectedInverter = {
          id: `mock_inverter_${systemSize}kw`,
          power_rating: systemSize
        };

        // Find suitable battery if needed
        let selectedBattery = null;
        if (batterySize > 0) {
          const suitableBatteries = batteries.filter(b => 
            b.specs?.kWh && Math.abs(b.specs.kWh - batterySize) <= 2
          );
          selectedBattery = suitableBatteries[0];
        }

        const configuration: SystemConfiguration = {
          panelIds: [selectedPanel.id],
          inverterId: selectedInverter.id,
          batteryIds: selectedBattery ? [selectedBattery.id] : [],
          totalPanelKw: systemSize,
          totalBatteryKwh: batterySize,
          estimatedCost: this.estimateSystemCost(systemSize, batterySize)
        };

        // Calculate rebates for this configuration
        const rebateCalc = calculateSolarRebates({
          postcode: '2000', // Sydney default
          install_date: new Date().toISOString().split('T')[0],
          pv_dc_size_kw: systemSize,
          battery_capacity_kwh: batterySize,
          stc_price_aud: 38,
          vpp_provider: null
        });

        const paybackPeriod = configuration.estimatedCost / (rebateCalc.total_rebate_aud + 1000); // Rough estimate
        const satisfactionScore = this.calculateSatisfactionScore(configuration, rebateCalc.total_rebate_aud, paybackPeriod);

        data.push({
          configuration,
          rebateAmount: rebateCalc.total_rebate_aud,
          paybackPeriod,
          satisfactionScore
        });
      }
    }

    return data;
  }

  private estimateSystemCost(panelKw: number, batteryKwh: number): number {
    const panelCost = panelKw * 1000; // $1000 per kW
    const batteryCost = batteryKwh * 1200; // $1200 per kWh
    const inverterCost = Math.min(panelKw * 300, 5000); // $300 per kW, max $5000
    const installationCost = 3000 + (panelKw * 200); // Base + per kW

    return panelCost + batteryCost + inverterCost + installationCost;
  }

  private calculateSatisfactionScore(config: SystemConfiguration, rebates: number, payback: number): number {
    // Higher rebates = better, lower payback = better
    const rebateScore = Math.min(rebates / 10000, 1); // Normalize to 0-1
    const paybackScore = Math.max(0, 1 - (payback / 10)); // 10 year payback = 0 score
    const sizeScore = config.totalPanelKw >= 6.6 ? 0.8 : 0.6; // Prefer larger systems
    const batteryScore = config.totalBatteryKwh > 0 ? 0.9 : 0.5; // Prefer battery systems

    return (rebateScore * 0.3 + paybackScore * 0.3 + sizeScore * 0.2 + batteryScore * 0.2);
  }

  private optimizeWeights() {
    // Simple optimization: adjust weights based on which factors correlate with higher satisfaction
    const data = this.model.historicalData;
    if (data.length === 0) return;

    let rebateCorrelation = 0;
    let paybackCorrelation = 0;

    for (const result of data) {
      const normalizedRebate = result.rebateAmount / 10000;
      const normalizedPayback = 1 - (result.paybackPeriod / 10);
      
      rebateCorrelation += normalizedRebate * result.satisfactionScore;
      paybackCorrelation += normalizedPayback * result.satisfactionScore;
    }

    rebateCorrelation /= data.length;
    paybackCorrelation /= data.length;

    // Adjust weights based on correlations
    const total = rebateCorrelation + paybackCorrelation;
    if (total > 0) {
      this.model.weights.rebateAmount = (rebateCorrelation / total) * 0.7; // Keep some base weighting
      this.model.weights.paybackPeriod = (paybackCorrelation / total) * 0.7;
      this.model.weights.systemReliability = 0.2;
      this.model.weights.futureExpansion = 0.1;
    }
  }

  async predictOptimalConfigurations(
    state: AIState, 
    catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }, 
    intent: UserIntent,
    maxSuggestions = 3
  ): Promise<Suggestion[]> {
    if (!this.model.trained) {
      console.warn('[RebateOptimizer] Model not trained, returning basic suggestions');
      return this.getBasicSuggestions(state, catalog, intent);
    }

    const suggestions: Suggestion[] = [];
    const currentSystem = this.analyzeCurrentSystem(state);

    // Generate alternative configurations
    const alternatives = this.generateAlternatives(currentSystem, catalog, intent);

    for (const alt of alternatives.slice(0, maxSuggestions)) {
      const impact = await this.calculateImpact(currentSystem, alt, state);
      
      if (impact.rebates > 0 || impact.paybackPeriod < currentSystem.paybackPeriod) {
        suggestions.push({
          type: alt.type,
          productType: alt.productType,
          reason: alt.reason,
          newProductId: alt.newProductId,
          currentProductId: alt.currentProductId,
          expectedImpact: {
            rebates: impact.rebates,
            paybackPeriod: impact.paybackPeriod,
            confidence: impact.confidence
          }
        });
      }
    }

    return suggestions;
  }

  private analyzeCurrentSystem(state: AIState) {
    const totalPanelKw = state.panels.reduce((sum, p) => sum + (p.power_rating || 0), 0) / 1000;
    const totalBatteryKwh = state.batteries.reduce((sum, b) => sum + (b.capacity_kwh || 0), 0);
    
    return {
      totalPanelKw,
      totalBatteryKwh,
      hasInverter: state.inverters.length > 0,
      estimatedCost: this.estimateSystemCost(totalPanelKw, totalBatteryKwh),
      paybackPeriod: 8 // Default estimate
    };
  }

  private generateAlternatives(currentSystem: any, catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }, intent: UserIntent) {
    const alternatives = [];

    // Size optimization suggestions
    if (currentSystem.totalPanelKw < 6.6 && intent === 'maximize-rebates') {
      alternatives.push({
        type: 'add' as const,
        productType: 'panel' as const,
        reason: 'Increasing to 6.6kW system maximizes STC rebates',
        newProductId: catalog.panels[0]?.id || '',
        targetKw: 6.6
      });
    }

    // Battery suggestions
    if (currentSystem.totalBatteryKwh === 0 && intent !== 'minimize-cost') {
      alternatives.push({
        type: 'add' as const,
        productType: 'battery' as const,
        reason: 'Adding battery storage increases rebates and energy independence',
        newProductId: catalog.batteries[0]?.id || '',
        targetKwh: 10
      });
    }

    // Inverter optimization
    if (!currentSystem.hasInverter) {
      alternatives.push({
        type: 'add' as const,
        productType: 'inverter' as const,
        reason: 'System requires an inverter for grid connection',
        newProductId: 'mock_inverter_5kw'
      });
    }

    return alternatives;
  }

  private async calculateImpact(currentSystem: any, alternative: any, state: AIState) {
    // Calculate current rebates
    const currentRebates = calculateSolarRebates({
      postcode: state.postcode || '2000',
      install_date: state.installDate || new Date().toISOString().split('T')[0],
      pv_dc_size_kw: currentSystem.totalPanelKw,
      battery_capacity_kwh: currentSystem.totalBatteryKwh,
      stc_price_aud: 38,
      vpp_provider: null
    });

    // Calculate new rebates with alternative
    let newPanelKw = currentSystem.totalPanelKw;
    let newBatteryKwh = currentSystem.totalBatteryKwh;

    if (alternative.productType === 'panel' && alternative.targetKw) {
      newPanelKw = alternative.targetKw;
    }
    if (alternative.productType === 'battery' && alternative.targetKwh) {
      newBatteryKwh = alternative.targetKwh;
    }

    const newRebates = calculateSolarRebates({
      postcode: state.postcode || '2000',
      install_date: state.installDate || new Date().toISOString().split('T')[0],
      pv_dc_size_kw: newPanelKw,
      battery_capacity_kwh: newBatteryKwh,
      stc_price_aud: 38,
      vpp_provider: null
    });

    const rebateDifference = newRebates.total_rebate_aud - currentRebates.total_rebate_aud;
    const newCost = this.estimateSystemCost(newPanelKw, newBatteryKwh);
    const costDifference = newCost - currentSystem.estimatedCost;
    const newPayback = (newCost - newRebates.total_rebate_aud) / 1500; // Rough annual savings

    return {
      rebates: rebateDifference,
      paybackPeriod: newPayback,
      confidence: 0.8 // Fixed confidence for now
    };
  }

  private getBasicSuggestions(state: AIState, catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }, intent: UserIntent): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Basic rule-based suggestions
    const totalPanelKw = state.panels.reduce((sum, p) => sum + (p.power_rating || 0), 0) / 1000;
    
    if (totalPanelKw > 0 && totalPanelKw < 6.6 && intent === 'maximize-rebates') {
      suggestions.push({
        type: 'add',
        productType: 'panel',
        reason: 'Consider increasing to 6.6kW for maximum STC rebates',
        expectedImpact: {
          rebates: 2000,
          paybackPeriod: 7,
          confidence: 0.7
        }
      });
    }

    return suggestions;
  }
}

// Singleton instance
const rebateOptimizer = new RebateOptimizer();

export async function trainRebateOptimizer(catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }) {
  await rebateOptimizer.train(catalog);
}

export async function predictOptimalConfiguration(
  state: AIState,
  catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] },
  intent: UserIntent
): Promise<Suggestion[]> {
  return rebateOptimizer.predictOptimalConfigurations(state, catalog, intent);
}