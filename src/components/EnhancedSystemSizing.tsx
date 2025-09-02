import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Battery, 
  Sun, 
  TrendingUp, 
  Calculator, 
  Database, 
  Cpu, 
  BarChart3, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Settings,
  ChevronRight,
  ChevronLeft,
  Edit,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import HolographicGraph from './HolographicGraph';
import { Glass } from './Glass';
import { useQueryPoa } from '@/hooks/useQueryPoa';
import { emitSignal } from '@/diagnostics/signals';
import { calculateSolarRebates } from '@/utils/solarCalculations';
import { calculateBatteryRebates } from '@/utils/rebateCalculations';

interface SystemSize {
  recommendedKw: number;
  panels: number;
  battery: number;
  estimatedGeneration: number;
  confidence: number;
  aiReasoning: string;
  products: {
    panel: { brand: string; model: string; wattage: number; efficiency: number };
    battery?: { brand: string; model: string; capacity: number; usableCapacity: number };
    inverter: { type: string; capacity: number; efficiency: number };
  };
  financial: {
    currentAnnualBill: number;
    newAnnualBill: number;
    annualSavings: number;
    billReductionPercent: number;
    paybackYears: number;
    npv25Year: number;
    irr: number;
    co2ReductionTonnes: number;
  };
}

interface EnhancedSystemSizingProps {
  billData: any;
  locationData: any;
  siteData: any;
  evData?: any;
  systemSize?: SystemSize;
  existingPvKw?: number; // New: existing PV system size
  onSystemUpdate: (system: SystemSize) => void;
  onNext: () => void;
  onPrevious: () => void;
  className?: string;
}

export const EnhancedSystemSizing: React.FC<EnhancedSystemSizingProps> = ({
  billData,
  locationData,
  siteData,
  evData,
  systemSize,
  existingPvKw = 0,
  onSystemUpdate,
  onNext,
  onPrevious,
  className = ''
}) => {
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [aiResults, setAiResults] = useState<any>(null);
  const [modelStatus, setModelStatus] = useState<string>('checking');
  const [customSystem, setCustomSystem] = useState<SystemSize | null>(null);
  const [vppEnabled, setVppEnabled] = useState(false);
  const [vppResults, setVppResults] = useState<SystemSize | null>(null);
  const [nonVppResults, setNonVppResults] = useState<SystemSize | null>(null);

  // Track POA data with signals
  const poaQuery = useQueryPoa({
    lat: locationData?.latitude || 0,
    lng: locationData?.longitude || 0,
    tilt: siteData?.roofTilt || 20,
    azimuth: siteData?.roofAzimuth || 0,
    start: '2024-01-01',
    end: '2024-12-31'
  });

  // Emit signals for diagnostics
  useEffect(() => {
    if (poaQuery.data) {
      emitSignal({
        key: 'nasa.poa',
        status: 'ok',
        message: `POA data loaded: ${poaQuery.data.daily?.length || 0} days`,
        details: { 
          annual_kwh: poaQuery.data.daily?.reduce((sum, d) => sum + d.poa_kwh, 0) || 0,
          avg_daily: poaQuery.data.daily?.length ? 
            poaQuery.data.daily.reduce((sum, d) => sum + d.poa_kwh, 0) / poaQuery.data.daily.length : 0
        }
      });
    } else if (poaQuery.error) {
      emitSignal({
        key: 'nasa.poa',
        status: 'error',
        message: `POA fetch failed: ${poaQuery.error.message}`
      });
    }

    // Emit roof polygon signal (mock for now)
    if (siteData?.roofArea) {
      emitSignal({
        key: 'roof.polygon',
        status: 'ok',
        message: `Roof area: ${siteData.roofArea}m²`,
        details: { area_m2: siteData.roofArea, max_panels: siteData.maxPanels }
      });
    }
  }, [poaQuery.data, poaQuery.error, siteData]);

  // Auto-trigger AI sizing when component loads
  useEffect(() => {
    if (billData && locationData && siteData && !aiResults) {
      calculateAIOptimalSize();
    }
  }, [billData, locationData, siteData]);

  const calculateAIOptimalSize = async () => {
    setIsCalculating(true);
    setModelStatus('analyzing');
    
    try {
      console.log('🤖 Calling AI system sizing with enhanced data...');
      
      // Prepare comprehensive input data
      const sizingRequest = {
        billData: {
          quarterlyUsage: billData.quarterlyUsage || billData.monthlyUsage * 3,
          quarterlyBill: billData.quarterlyBill || billData.monthlyBill * 3,
          dailySupply: billData.dailySupply || 85,
          averageRate: billData.averageRate || 0.30,
          peakUsage: billData.peakUsage,
          offPeakUsage: billData.offPeakUsage,
          peakRate: billData.peakRate,
          offPeakRate: billData.offPeakRate,
          meterType: locationData.meterType
        },
        locationData: {
          postcode: locationData.postcode,
          state: locationData.state,
          network: locationData.network,
          meterType: locationData.meterType,
          exportCapKw: locationData.exportCapKw
        },
        siteData: {
          shadingFactor: siteData.shadingFactor,
          roofTilt: siteData.roofTilt,
          roofAzimuth: siteData.roofAzimuth,  
          solarIrradiance: siteData.solarIrradiance,
          roofArea: siteData.roofArea,
          maxPanels: siteData.maxPanels
        },
        evData: evData && evData.hasEV ? {
          dailyKm: evData.dailyKm,
          chargerType: evData.chargerType,
          chargingHours: evData.chargingHours,
          estimatedDailyKwh: Math.round(evData.dailyKm * 0.18)
        } : null,
        preferences: {
          offsetGoal: 90, // Target 90% bill offset
          batteryRequired: billData.peakUsage && billData.offPeakUsage,
          roofSpace: siteData.roofArea > 120 ? 'large' : siteData.roofArea > 80 ? 'average' : 'limited',
          budget: 50000, // Default budget cap
          includeEV: evData?.hasEV || false
        }
      };

      const { data, error } = await supabase.functions.invoke('ai-system-sizing', {
        body: sizingRequest
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('✅ Enhanced AI sizing results:', data);
      setAiResults(data);
      setModelStatus('completed');

      // Create enhanced system object
      const newSystem: SystemSize = {
        recommendedKw: data.recommendations.panels.totalKw,
        panels: data.recommendations.panels.count,
        battery: data.recommendations.battery?.capacity_kwh || 0,
        estimatedGeneration: data.financial.annual_generation,
        confidence: data.rationale.confidence || 0.95,
        aiReasoning: data.rationale.ai_reasoning,
        products: {
          panel: {
            brand: data.recommendations.panels.brand,
            model: data.recommendations.panels.model,
            wattage: data.recommendations.panels.wattage,
            efficiency: data.recommendations.panels.efficiency
          },
          battery: data.recommendations.battery ? {
            brand: data.recommendations.battery.brand,
            model: data.recommendations.battery.model,
            capacity: data.recommendations.battery.capacity_kwh,
            usableCapacity: data.recommendations.battery.usable_capacity
          } : undefined,
          inverter: {
            type: data.recommendations.inverter.type,
            capacity: data.recommendations.inverter.capacity_kw,
            efficiency: data.recommendations.inverter.efficiency
          }
        },
        financial: {
          currentAnnualBill: data.financial.current_annual_bill,
          newAnnualBill: data.financial.new_annual_bill,
          annualSavings: data.financial.annual_savings,
          billReductionPercent: data.financial.bill_reduction_percent,
          paybackYears: data.financial.payback_years || 8.5,
          npv25Year: data.financial.npv_25_year || 150000,
          irr: data.financial.irr || 180,
          co2ReductionTonnes: Math.round((data.recommendations.panels.totalKw * 1400 * 0.82) / 1000)
        }
      };

      setCustomSystem(newSystem);
      onSystemUpdate(newSystem);

      toast({
        title: "AI Sizing Complete! 🤖",
        description: `Recommended ${newSystem.recommendedKw}kW system with ${Math.round(newSystem.confidence * 100)}% confidence`
      });

    } catch (error) {
      console.error('❌ AI sizing failed:', error);
      setModelStatus('fallback');
      
      toast({
        title: "Using Enhanced Fallback",
        description: "AI service unavailable, using intelligent fallback calculations",
        variant: "default"
      });
      
      // Enhanced fallback calculation
      calculateEnhancedFallback();
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateEnhancedFallback = () => {
    const annualUsage = (billData.quarterlyUsage || billData.monthlyUsage * 3) * 4;
    const annualBill = (billData.quarterlyBill || billData.monthlyBill * 3) * 4;
    
    // Calculate optimal system size based on usage and site conditions
    let sizingFactor = 1.0;
    
    // Adjust for TOU usage patterns
    if (billData.peakUsage && billData.offPeakUsage) {
      const peakRatio = billData.peakUsage / (billData.peakUsage + billData.offPeakUsage);
      sizingFactor = peakRatio > 0.6 ? 1.3 : 1.1;
    }
    
    // Adjust for site conditions using POA data if available
    let actualGeneration = 1400; // Default kWh/kW/year
    if (poaQuery.data?.daily) {
      actualGeneration = poaQuery.data.daily.reduce((sum, d) => sum + d.poa_kwh, 0);
    }
    
    if (siteData) {
      const shadingAdjustment = 1 + (siteData.shadingFactor * 0.5);
      sizingFactor *= shadingAdjustment;
    }
    
    // EV adjustment
    if (evData?.hasEV) {
      const evAnnualUsage = evData.dailyKm * 0.18 * 365;
      sizingFactor *= 1 + (evAnnualUsage / annualUsage);
    }
    
    // Calculate system size considering existing PV
    const totalNeededKw = (annualUsage * sizingFactor) / actualGeneration;
    const additionalKw = Math.max(0, totalNeededKw - existingPvKw);
    const recommendedKw = Math.min(
      Math.round(additionalKw * 2) / 2,
      Math.floor(siteData?.maxPanels / 2.5) || 13.3
    );
    
    const panels = Math.ceil(recommendedKw / 0.55);
    
    // Enhanced battery sizing - minimum size needed
    let batterySize = 0;
    if (billData.peakUsage || evData?.hasEV) {
      const nightUsage = billData.offPeakUsage || (annualUsage * 0.4) / 365;
      const evNightUsage = evData?.hasEV && evData.chargingHours === 'overnight' ? evData.dailyKm * 0.18 : 0;
      batterySize = Math.round((nightUsage + evNightUsage) * 1.0); // Minimum size
      batterySize = Math.max(batterySize, 5); // Min 5kWh
      batterySize = Math.min(batterySize, 20); // Max 20kWh for residential
    }

    // Emit sizing.battery signal
    emitSignal({
      key: 'sizing.battery',
      status: 'ok',
      message: `Battery sized: ${batterySize}kWh minimum`,
      details: { 
        size_kwh: batterySize, 
        night_usage: billData.offPeakUsage,
        ev_usage: evData?.hasEV ? evData.dailyKm * 0.18 : 0
      }
    });
    
    // Calculate rebates for both VPP and non-VPP scenarios
    const baseSystem = calculateSystemFinancials(recommendedKw, batterySize, annualUsage, annualBill, actualGeneration);
    const vppSystem = calculateSystemFinancials(recommendedKw, batterySize, annualUsage, annualBill, actualGeneration, true);
    
    const fallbackSystem: SystemSize = {
      ...baseSystem,
      recommendedKw: existingPvKw > 0 ? recommendedKw : recommendedKw,
      panels,
      battery: batterySize,
      confidence: 0.82,
      aiReasoning: existingPvKw > 0 
        ? `${existingPvKw}kW existing + ${recommendedKw}kW additional solar recommended for ${annualUsage.toLocaleString()} kWh annual usage${
            evData?.hasEV ? ` plus EV charging` : ''
          }. Battery: ${batterySize}kWh minimum size suggested for peak avoidance.`
        : `${recommendedKw}kW solar system for ${annualUsage.toLocaleString()} kWh annual usage${
            evData?.hasEV ? ` plus EV charging` : ''
          }. Battery: ${batterySize}kWh minimum size suggested.`,
      products: getRecommendedProducts(recommendedKw, batterySize)
    };
    
    setCustomSystem(fallbackSystem);
    setNonVppResults(fallbackSystem);
    setVppResults(vppSystem);
    onSystemUpdate(vppEnabled ? vppSystem : fallbackSystem);
  };

  const calculateSystemFinancials = (pvKw: number, batteryKwh: number, annualUsage: number, annualBill: number, generation: number, withVpp = false): SystemSize => {
    // Calculate rebates
    const solarRebates = calculateSolarRebates({
      install_date: '2025-08-01',
      postcode: locationData?.postcode || '5000',
      pv_dc_size_kw: pvKw,
      stc_price_aud: 40,
      battery_capacity_kwh: batteryKwh,
      vpp_provider: withVpp ? 'tesla' : null
    });

    const batteryRebates = batteryKwh > 0 ? calculateBatteryRebates({
      install_date: '2025-08-01',
      state_or_territory: locationData?.state || 'SA',
      has_rooftop_solar: true,
      battery: {
        usable_kWh: batteryKwh,
        vpp_capable: true,
        battery_on_approved_list: true
      },
      joins_vpp: withVpp
    }) : { total_cash_incentive: 0 };

    const totalRebates = solarRebates.total_rebate_aud + batteryRebates.total_cash_incentive;
    
    // Financial calculations
    const currentRate = annualBill / annualUsage;
    const generationValue = pvKw * generation * currentRate * 0.8;
    const batteryValue = batteryKwh * 365 * currentRate * (withVpp ? 0.4 : 0.3);
    const totalSavings = generationValue + batteryValue;
    const newBill = Math.max(annualBill - totalSavings, annualBill * 0.1);
    
    const systemCost = pvKw * 2500 + batteryKwh * 1200 - totalRebates;
    const paybackYears = systemCost > 0 ? systemCost / (annualBill - newBill) : 0;
    
    return {
      recommendedKw: pvKw,
      panels: Math.ceil(pvKw / 0.55),
      battery: batteryKwh,
      estimatedGeneration: Math.round(pvKw * generation),
      confidence: 0.85,
      aiReasoning: '',
      products: getRecommendedProducts(pvKw, batteryKwh),
      financial: {
        currentAnnualBill: annualBill,
        newAnnualBill: newBill,
        annualSavings: annualBill - newBill,
        billReductionPercent: Math.round(((annualBill - newBill) / annualBill) * 100),
        paybackYears: Math.round(paybackYears * 10) / 10,
        npv25Year: Math.round((annualBill - newBill) * 15 - systemCost),
        irr: Math.round((totalSavings / systemCost) * 100 * 10) / 10,
        co2ReductionTonnes: Math.round((pvKw * generation * 0.82) / 1000)
      }
    };
  };

  const getRecommendedProducts = (pvKw: number, batteryKwh: number) => {
    // High-quality product selection based on size
    const panelWattage = pvKw < 5 ? 440 : pvKw < 8 ? 550 : 600;
    const panelBrand = pvKw > 10 ? "SunPower" : pvKw > 6 ? "Tier1 Solar" : "Jinko Solar";
    
    return {
      panel: {
        brand: panelBrand,
        model: `${panelBrand === "SunPower" ? "Maxeon" : panelBrand === "Tier1 Solar" ? "Tier1" : "Tiger Neo"}-${panelWattage}W-Pro`,
        wattage: panelWattage,
        efficiency: panelWattage >= 600 ? 0.228 : panelWattage >= 550 ? 0.22 : 0.215
      },
      battery: batteryKwh > 0 ? {
        brand: batteryKwh >= 15 ? "Tesla" : batteryKwh >= 10 ? "Sungrow" : "BYD",
        model: batteryKwh >= 15 ? "Powerwall 3" : batteryKwh >= 10 ? "SBR HV" : "Battery-Box Premium",
        capacity: batteryKwh,
        usableCapacity: Math.round(batteryKwh * 0.95 * 10) / 10
      } : undefined,
      inverter: {
        type: batteryKwh > 0 ? "Hybrid" : "String",
        capacity: Math.ceil(pvKw * 1.2), // 20% oversizing
        efficiency: 0.975
      }
    };
  };

  const handleCustomChange = (field: string, value: number) => {
    if (!customSystem) return;
    
    const updated = { ...customSystem };
    if (field === 'recommendedKw') {
      updated.recommendedKw = value;
      updated.panels = Math.ceil(value / 0.55);
      updated.estimatedGeneration = Math.round(value * 1400);
    } else if (field === 'battery') {
      updated.battery = value;
    }
    
    setCustomSystem(updated);
    onSystemUpdate(updated);
  };

  const handleVppToggle = (enabled: boolean) => {
    setVppEnabled(enabled);
    if (vppResults && nonVppResults) {
      onSystemUpdate(enabled ? vppResults : nonVppResults);
    }
  };

  const currentSystem = customSystem || systemSize;

  if (!currentSystem) {
    return (
      <div className={`${className}`}>
        <Glass className="p-8 text-center">
          <Cpu className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Preparing AI Analysis</h3>
          <p className="text-muted-foreground">
            Loading your location and site data for optimal system sizing...
          </p>
        </Glass>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">AI-Optimized System Sizing</h2>
        <p className="text-muted-foreground">
          Intelligent recommendations based on your specific energy profile and site conditions
        </p>
      </div>

      {/* Model Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-3 rounded-lg text-center text-sm font-medium ${
          modelStatus === 'completed' 
            ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
            : modelStatus === 'fallback'
            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
            : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
        }`}
      >
        {modelStatus === 'completed' && (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            AI Analysis Complete - Using Latest ML Models
          </div>
        )}
        {modelStatus === 'fallback' && (
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Enhanced Fallback Active - Intelligent Calculations Applied
          </div>
        )}
        {modelStatus === 'analyzing' && (
          <div className="flex items-center justify-center gap-2">
            <Cpu className="w-4 h-4 animate-pulse" />
            AI Processing Your Data...
          </div>
        )}
      </motion.div>

      {/* Main System Sizing Results */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5 border border-primary/20 overflow-hidden"
      >
        {/* Holographic Background Animation */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse" />
          <motion.div
            className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {isCalculating ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Cpu className="h-8 w-8 text-primary animate-pulse" />
              <div className="text-xl font-semibold">AI is analyzing your energy needs...</div>
            </div>
            <div className="text-muted-foreground">
              Processing site conditions, usage patterns, and product database...
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <div className="text-center space-y-2">
                <div className="p-3 rounded-full bg-primary/20 w-fit mx-auto">
                  <Sun className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold">
                  {existingPvKw > 0 && currentSystem.recommendedKw > 0 
                    ? `${existingPvKw}kW existing + ${currentSystem.recommendedKw}kW additional`
                    : `${currentSystem.recommendedKw}kW`
                  }
                </div>
                <div className="text-sm text-muted-foreground">Solar System</div>
                <Badge variant="secondary">{currentSystem.panels} panels</Badge>
                <div className="text-xs text-muted-foreground">
                  {currentSystem.products.panel.brand} {currentSystem.products.panel.model}
                </div>
                <div className="text-xs text-muted-foreground">
                  {currentSystem.products.panel.wattage}W • {Math.round(currentSystem.products.panel.efficiency * 100)}% efficiency
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <div className="p-3 rounded-full bg-secondary/20 w-fit mx-auto">
                  <Battery className="h-6 w-6 text-secondary" />
                </div>
                <div className="text-2xl font-bold">{currentSystem.battery}kWh</div>
                <div className="text-sm text-muted-foreground">Minimum Size Suggested</div>
                <Badge variant={currentSystem.battery > 0 ? "default" : "secondary"}>
                  {currentSystem.battery > 0 ? "Recommended" : "Not Required"}
                </Badge>
                {currentSystem.products.battery && (
                  <>
                    <div className="text-xs text-muted-foreground">
                      {currentSystem.products.battery.brand} {currentSystem.products.battery.model}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currentSystem.products.battery.usableCapacity}kWh usable capacity
                    </div>
                  </>
                )}
              </div>
              
              <div className="text-center space-y-2">
                <div className="p-3 rounded-full bg-green-500/20 w-fit mx-auto">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div className="text-2xl font-bold">{currentSystem.financial.billReductionPercent}%</div>
                <div className="text-sm text-muted-foreground">Bill Reduction</div>
                <Badge variant={currentSystem.financial.billReductionPercent >= 80 ? "default" : "secondary"}>
                  {currentSystem.financial.billReductionPercent >= 80 ? "Excellent" : "Good"}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  AI Confidence: {Math.round(currentSystem.confidence * 100)}%
                </div>
              </div>
            </div>

            {/* Monthly Savings Chart */}
            <div className="mt-8 relative z-10">
              <HolographicGraph
                data={Array.from({ length: 12 }, (_, i) => ({
                  month: new Date(0, i).toLocaleString('default', { month: 'short' }),
                  currentBill: Math.round(currentSystem.financial.currentAnnualBill / 12),
                  newBill: Math.round(currentSystem.financial.newAnnualBill / 12),
                  savings: Math.round(currentSystem.financial.annualSavings / 12)
                }))}
                title="Monthly Savings Projection"
              />
            </div>

            {/* AI Reasoning */}
            <div className="mt-6 p-4 rounded-lg bg-white/5 border border-primary/20 relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">AI Analysis</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentSystem.aiReasoning}
              </p>
            </div>
          </>
        )}
      </motion.div>

      {/* Financial Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-green-500" />
          <h4 className="font-semibold">Financial Analysis</h4>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-red-500">
              ${currentSystem.financial.currentAnnualBill.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Current Bill (Annual)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-500">
              ${currentSystem.financial.newAnnualBill < 0 ? '-' : ''}${Math.abs(currentSystem.financial.newAnnualBill).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">With Solar + Battery</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-500">
              ${currentSystem.financial.annualSavings.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Annual Savings</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-500">
              {currentSystem.financial.paybackYears}
            </div>
            <div className="text-xs text-muted-foreground">Years Payback</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-500">
              ${currentSystem.financial.npv25Year.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">25-Year NPV</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-500">
              {currentSystem.financial.irr}%
            </div>
            <div className="text-xs text-muted-foreground">IRR</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {currentSystem.financial.co2ReductionTonnes}t
            </div>
            <div className="text-xs text-muted-foreground">CO₂ Reduction</div>
          </div>
        </div>
      </motion.div>

      {/* VPP Comparison Toggle */}
      <Glass className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h4 className="font-semibold">VPP Comparison</h4>
            <Badge variant="outline" className="text-purple-600 border-purple-600">
              New Feature
            </Badge>
          </div>
          <Switch
            checked={vppEnabled}
            onCheckedChange={handleVppToggle}
          />
        </div>
        
        {vppEnabled && vppResults && nonVppResults && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-gray-300 bg-gray-50/50">
                <h5 className="font-medium mb-2">Without VPP</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Annual Savings:</span>
                    <span className="font-medium">${nonVppResults.financial.annualSavings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payback:</span>
                    <span className="font-medium">{nonVppResults.financial.paybackYears} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bill Reduction:</span>
                    <span className="font-medium">{nonVppResults.financial.billReductionPercent}%</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border border-purple-300 bg-purple-50/50">
                <h5 className="font-medium mb-2 text-purple-700">With VPP</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Annual Savings:</span>
                    <span className="font-medium text-green-600">
                      ${vppResults.financial.annualSavings.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payback:</span>
                    <span className="font-medium text-green-600">
                      {vppResults.financial.paybackYears} years
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bill Reduction:</span>
                    <span className="font-medium text-green-600">{vppResults.financial.billReductionPercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VPP Bonus:</span>
                    <span className="font-medium text-purple-600">
                      +${Math.round((vppResults.financial.annualSavings - nonVppResults.financial.annualSavings))}/year
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground p-3 bg-purple-50/30 rounded-lg">
              <strong>VPP Benefits:</strong> Virtual Power Plant participation provides additional revenue 
              through grid services, peak demand response, and energy trading optimization. Rebate differences included.
            </div>
          </div>
        )}
      </Glass>

      {/* Customization Panel */}
      <Glass className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Customize System Size</h4>
          </div>
          <Switch
            checked={customMode}
            onCheckedChange={setCustomMode}
          />
        </div>
        
        <AnimatePresence>
          {customMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Solar System Size: {currentSystem.recommendedKw}kW</Label>
                  <Slider
                    value={[currentSystem.recommendedKw]}
                    onValueChange={([value]) => handleCustomChange('recommendedKw', value)}
                    max={Math.min(20, (siteData?.maxPanels || 40) * 0.55)}
                    min={2}
                    step={0.5}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Max roof capacity: {Math.round((siteData?.maxPanels || 40) * 0.55 * 10) / 10}kW
                  </div>
                </div>
                
                <div>
                  <Label>Battery Storage: {currentSystem.battery}kWh</Label>
                  <Slider
                    value={[currentSystem.battery]}
                    onValueChange={([value]) => handleCustomChange('battery', value)}
                    max={25}
                    min={0}
                    step={2.5}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    0kWh = No battery, 25kWh = Maximum residential
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button onClick={calculateAIOptimalSize} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  AI Re-Analysis
                </Button>
                <Button onClick={calculateEnhancedFallback} variant="outline" size="sm">
                  <Calculator className="w-4 h-4 mr-2" />
                  Basic Calculation
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Glass>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button onClick={onPrevious} variant="outline" size="lg">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <Button onClick={onNext} className="bg-gradient-primary" size="lg">
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default EnhancedSystemSizing;