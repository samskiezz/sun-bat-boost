import { type CatalogueProduct } from '@/utils/catalogClient';
import { type AIState, type Diagnostic, type AppMode } from './AICore';

interface DiagnosticRule {
  id: string;
  condition: (state: AIState, catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }) => boolean;
  severity: 'error' | 'warn' | 'info';
  message: string;
  suggestedAction?: string;
  relatedComponent?: 'panel' | 'inverter' | 'battery';
}

class DiagnosticEngine {
  private rules: DiagnosticRule[] = [
    // System completeness rules
    {
      id: 'NO_PANELS',
      condition: (state) => state.panels.length === 0,
      severity: 'error',
      message: 'No solar panels detected in the system',
      suggestedAction: 'Add at least one solar panel to proceed',
      relatedComponent: 'panel'
    },
    {
      id: 'NO_INVERTER',
      condition: (state) => state.inverters.length === 0,
      severity: 'error',
      message: 'No inverter detected in the system',
      suggestedAction: 'Add an inverter to convert DC power to AC',
      relatedComponent: 'inverter'
    },
    {
      id: 'MULTIPLE_INVERTERS',
      condition: (state) => state.inverters.length > 1,
      severity: 'warn',
      message: 'Multiple inverters detected - verify this is intentional',
      suggestedAction: 'Consider using a single larger inverter if possible'
    },

    // Size optimization rules
    {
      id: 'UNDERSIZED_SYSTEM',
      condition: (state) => {
        const totalKw = state.panels.reduce((sum, p) => sum + (p.power_rating || 0), 0) / 1000;
        return totalKw > 0 && totalKw < 3;
      },
      severity: 'warn',
      message: 'System may be undersized for typical household needs',
      suggestedAction: 'Consider increasing system size to 5-6.6kW for better economics',
      relatedComponent: 'panel'
    },
    {
      id: 'OPTIMAL_SIZE_6_6KW',
      condition: (state) => {
        const totalKw = state.panels.reduce((sum, p) => sum + (p.power_rating || 0), 0) / 1000;
        return totalKw >= 6.5 && totalKw <= 6.7;
      },
      severity: 'info',
      message: 'Excellent choice! 6.6kW systems maximize STC rebates',
      relatedComponent: 'panel'
    },
    {
      id: 'OVERSIZED_SYSTEM',
      condition: (state) => {
        const totalKw = state.panels.reduce((sum, p) => sum + (p.power_rating || 0), 0) / 1000;
        return totalKw > 15;
      },
      severity: 'warn',
      message: 'Large system detected - ensure adequate roof space and export approval',
      suggestedAction: 'Verify network export limits and required approvals',
      relatedComponent: 'panel'
    },

    // Battery rules
    {
      id: 'BATTERY_WITHOUT_HYBRID',
      condition: (state, catalog) => {
        if (state.batteries.length === 0) return false;
        
        // For now, assume hybrid inverters are properly configured
        // In a real implementation, this would check inverter specifications
        const hasHybridInverter = state.inverters.some(inv => 
          inv.model?.toLowerCase().includes('hybrid') || 
          inv.id?.includes('hybrid')
        );
        
        return !hasHybridInverter;
      },
      severity: 'error',
      message: 'Battery system requires a hybrid or battery-ready inverter',
      suggestedAction: 'Replace inverter with hybrid model or add battery inverter',
      relatedComponent: 'inverter'
    },
    {
      id: 'SMALL_BATTERY_SYSTEM',
      condition: (state) => {
        const totalBatteryKwh = state.batteries.reduce((sum, b) => sum + (b.capacity_kwh || 0), 0);
        return totalBatteryKwh > 0 && totalBatteryKwh < 5;
      },
      severity: 'warn',
      message: 'Small battery capacity may limit energy independence benefits',
      suggestedAction: 'Consider 10-13.5kWh battery for typical household needs',
      relatedComponent: 'battery'
    },

    // DC/AC ratio rules
    {
      id: 'HIGH_DC_AC_RATIO',
      condition: (state, catalog) => {
        const totalPanelKw = state.panels.reduce((sum, p) => sum + (p.power_rating || 0), 0) / 1000;
        const inverterKw = state.inverters.reduce((sum, inv) => {
          return sum + (inv.power_rating || 5); // Default 5kW if not specified
        }, 0);
        
        return totalPanelKw > 0 && inverterKw > 0 && (totalPanelKw / inverterKw) > 1.33;
      },
      severity: 'warn',
      message: 'DC/AC ratio exceeds 1.33 - may cause power clipping',
      suggestedAction: 'Consider larger inverter or reduce panel count',
      relatedComponent: 'inverter'
    },
    {
      id: 'LOW_DC_AC_RATIO',
      condition: (state, catalog) => {
        const totalPanelKw = state.panels.reduce((sum, p) => sum + (p.power_rating || 0), 0) / 1000;
        const inverterKw = state.inverters.reduce((sum, inv) => {
          return sum + (inv.power_rating || 5); // Default 5kW if not specified
        }, 0);
        
        return totalPanelKw > 0 && inverterKw > 0 && (totalPanelKw / inverterKw) < 0.8;
      },
      severity: 'warn',
      message: 'DC/AC ratio below 0.8 - inverter may be oversized',
      suggestedAction: 'Consider smaller inverter for better efficiency',
      relatedComponent: 'inverter'
    },

    // Data quality rules
    {
      id: 'MISSING_POSTCODE',
      condition: (state) => !state.postcode,
      severity: 'warn',
      message: 'Postcode not provided - using default rebate calculations',
      suggestedAction: 'Enter postcode for accurate rebate calculations'
    },
    {
      id: 'MISSING_INSTALL_DATE',
      condition: (state) => !state.installDate,
      severity: 'info',
      message: 'Installation date not specified - using current date',
      suggestedAction: 'Set planned installation date for accurate STC calculations'
    }
  ];

  private findProductInCatalog(id: string, catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }, type: 'panel' | 'inverter' | 'battery') {
    if (type === 'panel') return catalog.panels.find(p => p.id === id);
    if (type === 'battery') return catalog.batteries.find(p => p.id === id);
    if (type === 'inverter') return catalog.inverters.find(p => p.id === id);
    return null;
  }

  async diagnose(state: AIState, catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }, mode: AppMode): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    // Run all diagnostic rules
    for (const rule of this.rules) {
      try {
        if (rule.condition(state, catalog)) {
          diagnostics.push({
            code: rule.id,
            message: rule.message,
            severity: rule.severity,
            relatedComponent: rule.relatedComponent,
            suggestedAction: rule.suggestedAction
          });
        }
      } catch (error) {
        console.warn(`[DiagnosticEngine] Rule ${rule.id} failed:`, error);
      }
    }

    // Pro mode additional diagnostics
    if (mode === 'pro') {
      const advancedDiagnostics = await this.runAdvancedDiagnostics(state, catalog);
      diagnostics.push(...advancedDiagnostics);
    }

    // Sort by severity (errors first, then warnings, then info)
    return diagnostics.sort((a, b) => {
      const severityOrder = { error: 0, warn: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private async runAdvancedDiagnostics(state: AIState, catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    // Advanced compatibility checking
    if (state.panels.length > 0 && state.inverters.length > 0) {
      const compatibilityIssues = this.checkAdvancedCompatibility(state, catalog);
      diagnostics.push(...compatibilityIssues);
    }

    // Performance optimization suggestions
    const optimizationSuggestions = this.getOptimizationSuggestions(state, catalog);
    diagnostics.push(...optimizationSuggestions);

    // Future-proofing analysis
    const futureProofing = this.analyzeFutureProofing(state, catalog);
    diagnostics.push(...futureProofing);

    return diagnostics;
  }

  private checkAdvancedCompatibility(state: AIState, catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Check voltage compatibility
    const panels = state.panels.map(p => this.findProductInCatalog(p.id, catalog, 'panel')).filter(Boolean);
    const inverters = state.inverters.map(i => this.findProductInCatalog(i.id, catalog, 'inverter')).filter(Boolean);

    for (const inverter of inverters) {
      if (inverter.mppt_voltage_min && inverter.mppt_voltage_max) {
        for (const panel of panels) {
          if (panel.voltage_open_circuit) {
            const stringVoltage = panel.voltage_open_circuit * Math.ceil(inverter.power_rating / panel.power_rating);
            
            if (stringVoltage < inverter.mppt_voltage_min) {
              diagnostics.push({
                code: 'VOLTAGE_TOO_LOW',
                message: `String voltage (${stringVoltage}V) below inverter minimum (${inverter.mppt_voltage_min}V)`,
                severity: 'error',
                relatedComponent: 'panel',
                suggestedAction: 'Add more panels per string or choose different panel'
              });
            }
            
            if (stringVoltage > inverter.mppt_voltage_max) {
              diagnostics.push({
                code: 'VOLTAGE_TOO_HIGH',
                message: `String voltage (${stringVoltage}V) exceeds inverter maximum (${inverter.mppt_voltage_max}V)`,
                severity: 'error',
                relatedComponent: 'panel',
                suggestedAction: 'Reduce panels per string or choose different inverter'
              });
            }
          }
        }
      }
    }

    return diagnostics;
  }

  private getOptimizationSuggestions(state: AIState, catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const totalPanelKw = state.panels.reduce((sum, p) => sum + (p.power_rating || 0), 0) / 1000;
    const totalBatteryKwh = state.batteries.reduce((sum, b) => sum + (b.capacity_kwh || 0), 0);

    // Suggest battery if system is large enough
    if (totalPanelKw >= 5 && totalBatteryKwh === 0) {
      diagnostics.push({
        code: 'BATTERY_RECOMMENDATION',
        message: 'System size suitable for battery storage - consider adding battery',
        severity: 'info',
        relatedComponent: 'battery',
        suggestedAction: 'Add 10-13.5kWh battery for energy independence'
      });
    }

    // Suggest panel optimization
    if (totalPanelKw > 0 && totalPanelKw < 6.6) {
      const additionalKw = 6.6 - totalPanelKw;
      diagnostics.push({
        code: 'SIZE_OPTIMIZATION',
        message: `Adding ${additionalKw.toFixed(1)}kW would maximize STC rebates`,
        severity: 'info',
        relatedComponent: 'panel',
        suggestedAction: 'Consider increasing system size to 6.6kW'
      });
    }

    return diagnostics;
  }

  private analyzeFutureProofing(state: AIState, catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] }): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Check for EV charging readiness
    const totalBatteryKwh = state.batteries.reduce((sum, b) => sum + (b.capacity_kwh || 0), 0);
    const totalPanelKw = state.panels.reduce((sum, p) => sum + (p.power_rating || 0), 0) / 1000;

    if (totalPanelKw >= 8 && totalBatteryKwh >= 10) {
      diagnostics.push({
        code: 'EV_READY',
        message: 'System configuration suitable for future EV charging',
        severity: 'info',
        suggestedAction: 'Consider EV charger installation for complete energy solution'
      });
    }

    // Check for expansion capability
    const totalInverterKw = state.inverters.reduce((sum, inv) => sum + (inv.power_rating || 5), 0);
    
    if (totalInverterKw > totalPanelKw * 1.2) {
      diagnostics.push({
        code: 'EXPANSION_READY',
        message: 'Inverter capacity allows for future system expansion',
        severity: 'info',
        suggestedAction: 'System can accommodate additional panels in the future'
      });
    }

    return diagnostics;
  }
}

// Singleton instance
const diagnosticEngine = new DiagnosticEngine();

export async function diagnoseConfiguration(
  state: AIState,
  catalog: { panels: CatalogueProduct[]; batteries: CatalogueProduct[]; inverters: any[] },
  mode: AppMode
): Promise<Diagnostic[]> {
  return diagnosticEngine.diagnose(state, catalog, mode);
}