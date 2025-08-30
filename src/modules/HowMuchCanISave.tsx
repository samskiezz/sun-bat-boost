import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, MapPin, Zap, TrendingDown, Upload, FileText, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import TopThreePlansCard from "@/components/TopThreePlansCard";
import BestRatesStep from "@/components/BestRatesStep";
import SavingsAnalysisStep from "@/components/SavingsAnalysisStep";
import SystemSizingStep from "@/components/SystemSizingStep";
import EnhancedOCRScanner from "@/components/EnhancedOCRScanner";
import { LocationAutoFill } from "@/components/LocationAutoFill";
import { Banner } from "@/features/shared/Banner";
import { MetricTile } from "@/features/shared/MetricTile";
import { StatusStrip } from "@/features/shared/StatusStrip";
import { useSolarROI } from "@/hooks/useModels";
import { formatCurrency, formatNumber } from "@/utils/format";
import type { RankContext } from "@/energy/rankPlans";

type Step = 'method' | 'current-bill' | 'location' | 'system-sizing' | 'best-rates' | 'savings-analysis';

interface BillData {
  currentRetailer: string;
  currentPlan: string;
  quarterlyUsage: number;
  quarterlyBill: number;
  dailySupply: number;
  averageRate: number;
  peakUsage?: number;
  offPeakUsage?: number;
  peakRate?: number;
  offPeakRate?: number;
  hasEV?: boolean;
  evChargingKwh?: number;
  siteAnalysis?: {
    roofSlope?: number;
    roofAzimuth?: number;
    shadingFactor?: number;
    solarAccess?: number;
    latitude?: number;
    longitude?: number;
  };
}

interface LocationData {
  postcode: string;
  state: string;
  network: string;
  meterType: 'Single' | 'TOU' | 'Demand';
}

const STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' }
];

const NETWORKS = {
  'NSW': ['Ausgrid', 'Endeavour Energy', 'Essential Energy'],
  'VIC': ['AusNet Services', 'CitiPower', 'Jemena', 'Powercor', 'United Energy'],
  'QLD': ['Energex', 'Ergon Energy', 'SPARQ Solutions'],
  'SA': ['SA Power Networks'],
  'TAS': ['TasNetworks'],
  'ACT': ['Evoenergy']
};

export default function HowMuchCanISave() {
  const [currentStep, setCurrentStep] = useState<Step>('method');
  const [inputMethod, setInputMethod] = useState<'manual' | 'upload'>('manual');
  const [billData, setBillData] = useState<BillData>({
    currentRetailer: '',
    currentPlan: '',
    quarterlyUsage: 0,
    quarterlyBill: 0,
    dailySupply: 100,
    averageRate: 28,
    hasEV: false,
    evChargingKwh: 0
  });
  const [locationData, setLocationData] = useState<LocationData>({
    postcode: '',
    state: 'NSW',
    network: 'Ausgrid',
    meterType: 'TOU'
  });
  const [planCount, setPlanCount] = useState(0);
  const [systemSize, setSystemSize] = useState({ 
    recommendedKw: 0, 
    panels: 0, 
    battery: 0, 
    estimatedGeneration: 0,
    confidence: 0,
    aiReasoning: ''
  });

  // ML-powered predictions
  const roiInput = useMemo(() => {
    if (!billData.quarterlyUsage || !locationData.postcode) return null;
    
    // Convert to 30-min usage data (simplified)
    const usage30min = Array.from({ length: 48 }, (_, i) => {
      const hour = Math.floor(i / 2);
      const baseUsage = billData.quarterlyUsage / (365 * 24 / 4); // Convert to hourly then 30-min
      
      // Apply daily pattern
      if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 21) {
        return baseUsage * 1.5; // Peak usage
      }
      return baseUsage * 0.8; // Base usage
    });
    
    return {
      usage_30min: usage30min,
      tariff: {
        import: [{
          price: billData.averageRate / 100, // Convert c/kWh to $/kWh
          start: "00:00",
          end: "24:00"
        }]
      },
      shading_index: billData.siteAnalysis?.shadingFactor || 0.1,
      system_size_kw: systemSize.recommendedKw
    };
  }, [billData, locationData.postcode, systemSize.recommendedKw]);
  
  const solarROIQuery = useSolarROI(roiInput || {} as any);
  
  // Get model telemetry
  const modelVersion = solarROIQuery.data?.version || "v1.0";
  const modelError = solarROIQuery.data?.error;

  // Get solar equipment count
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        const { count: panelCount } = await supabase
          .from('pv_modules')
          .select('*', { count: 'exact', head: true });
        
        const { count: batteryCount } = await supabase
          .from('batteries')
          .select('*', { count: 'exact', head: true });
        
        setPlanCount((panelCount || 0) + (batteryCount || 0));
        
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const steps = [
    { id: 'method', title: 'Input Method', icon: Upload },
    { id: 'current-bill', title: 'Energy Analysis', icon: FileText },
    { id: 'location', title: 'Location', icon: MapPin },
    { id: 'system-sizing', title: 'Auto Size', icon: Zap },
    { id: 'best-rates', title: 'Best Rates', icon: TrendingDown },
    { id: 'savings-analysis', title: 'Savings', icon: Calculator }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const nextStep = () => {
    const stepOrder: Step[] = ['method', 'current-bill', 'location', 'system-sizing', 'best-rates', 'savings-analysis'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const stepOrder: Step[] = ['method', 'current-bill', 'location', 'system-sizing', 'best-rates', 'savings-analysis'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const calculateSystemSize = async () => {
    console.log('🔧 Starting AI system sizing calculation...');
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke('ai-system-sizing', {
        body: {
          billData: {
            quarterlyUsage: billData.quarterlyUsage,
            quarterlyBill: billData.quarterlyBill,
            dailySupply: billData.dailySupply,
            averageRate: billData.averageRate,
            currentRetailer: billData.currentRetailer,
            currentPlan: billData.currentPlan,
            hasEV: billData.hasEV,
            evChargingKwh: billData.evChargingKwh || 0
          },
          locationData: {
            postcode: locationData.postcode,
            state: locationData.state,
            network: locationData.network,
            meterType: locationData.meterType
          },
          preferences: {
            offsetGoal: 90,
            roofSpace: 'average',
            includeBattery: true,
            budgetRange: 'mid'
          }
        }
      });

      if (error) {
        console.error('❌ AI sizing error:', error);
        throw new Error('AI sizing failed');
      }

      console.log('✅ AI sizing result:', data);
      
      setSystemSize({
        recommendedKw: data.recommendations.panels.totalKw,
        panels: data.recommendations.panels.count,
        battery: data.recommendations.battery ? data.recommendations.battery.capacity_kwh : 0,
        estimatedGeneration: data.financial.annual_generation,
        confidence: data.rationale.confidence,
        aiReasoning: data.rationale.ai_reasoning
      });
      
    } catch (error) {
      console.warn('⚠️ AI sizing failed, using ML prediction:', error);
      
      // Use ML prediction if available
      if (solarROIQuery.data) {
        setSystemSize({
          recommendedKw: solarROIQuery.data.value.system_size_kw || 6.6,
          panels: Math.ceil((solarROIQuery.data.value.system_size_kw || 6.6) * 1000 / 400),
          battery: 13.5,
          estimatedGeneration: (solarROIQuery.data.value.system_size_kw || 6.6) * 1400,
          confidence: 0.85,
          aiReasoning: `ML-enhanced calculation: ${formatCurrency(solarROIQuery.data.value.annual_savings_AUD)} annual savings projected`
        });
      }
    }
    
    setCurrentStep('system-sizing');
  };

  // Create context for plan ranking
  const rankingContext: RankContext = {
    postcode: parseInt(locationData.postcode) || 2000,
    state: locationData.state,
    network: locationData.network,
    meter_type: locationData.meterType,
    baseline_cost_aud: billData.quarterlyBill * 4
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Updated Hero with Banner Component */}
        <Banner
          title="How Much Can I Save?"
          subtitle={`Model-backed estimates with ${planCount.toLocaleString()} solar & battery options`}
          icon={Calculator}
          variant="glassHolo"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* Feature cards using MetricTile */}
            <MetricTile
              title="Smart Bill Analysis"
              value="AI-Powered"
              subtitle="Upload your electricity bill for automated pattern recognition"
              icon={Upload}
              variant="glass"
            />
            <MetricTile
              title="Real-Time Sizing"
              value={formatNumber(systemSize.recommendedKw)}
              subtitle="AI calculates optimal system size based on your usage"
              icon={Zap}
              variant="glass"
              format="custom"
            />
            <MetricTile
              title="Predicted Savings"
              value={solarROIQuery.data?.value?.annual_savings_AUD || 0}
              format="currency"
              subtitle="Annual savings projection with confidence bands"
              icon={TrendingDown}
              variant="glass"
            />
          </div>
        </Banner>

        {/* Progress Steps */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Solar Savings Calculator</h2>
              <Badge variant="outline" className="text-white border-white/20">
                {currentStepIndex + 1} of {steps.length}
              </Badge>
            </div>
            
            <Progress value={progress} className="mb-4 hologram-track" />
            
            <div className="flex items-center justify-between text-sm">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div 
                    key={step.id}
                    className={`flex items-center gap-2 ${
                      index <= currentStepIndex ? 'text-primary' : 'text-white/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{step.title}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 'method' && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Choose Input Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Button
                      onClick={() => {
                        setInputMethod('manual');
                        nextStep();
                      }}
                      variant="outline"
                      className="h-24 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <div className="text-center">
                        <FileText className="h-6 w-6 mx-auto mb-2" />
                        <div>Manual Entry</div>
                        <div className="text-sm text-white/70">Enter bill details manually</div>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setInputMethod('upload');
                        nextStep();
                      }}
                      variant="outline"
                      className="h-24 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <div className="text-center">
                        <Upload className="h-6 w-6 mx-auto mb-2" />
                        <div>Upload Bill</div>
                        <div className="text-sm text-white/70">AI-powered bill analysis</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'current-bill' && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Energy Bill Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {inputMethod === 'upload' ? (
                    <EnhancedOCRScanner 
                      mode="bill" 
                      onExtraction={(data) => setBillData(prev => ({...prev, ...data}))}
                      onProcessing={(processing) => console.log('Processing:', processing)}
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="usage" className="text-white">Quarterly Usage (kWh)</Label>
                          <Input
                            id="usage"
                            type="number"
                            value={billData.quarterlyUsage}
                            onChange={(e) => setBillData(prev => ({
                              ...prev,
                              quarterlyUsage: Number(e.target.value)
                            }))}
                            className="bg-white/10 border-white/20 text-white"
                            placeholder="e.g. 2500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bill" className="text-white">Quarterly Bill ($)</Label>
                          <Input
                            id="bill"
                            type="number"
                            value={billData.quarterlyBill}
                            onChange={(e) => setBillData(prev => ({
                              ...prev,
                              quarterlyBill: Number(e.target.value)
                            }))}
                            className="bg-white/10 border-white/20 text-white"
                            placeholder="e.g. 750"
                          />
                        </div>
                      </div>
                      <Button onClick={nextStep} className="w-full">
                        Continue to Location
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentStep === 'location' && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Location & Network</CardTitle>
                </CardHeader>
                <CardContent>
                  <LocationAutoFill
                    onLocationUpdate={(data) => {
                      setLocationData(data);
                    }}
                  />
                  <div className="mt-6">
                    <Button onClick={nextStep} className="w-full">
                      Continue to System Sizing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'system-sizing' && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">System Sizing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <MetricTile
                      title="Recommended System Size"
                      value={`${formatNumber(systemSize.recommendedKw)}kW`}
                      subtitle="Based on your usage and ML analysis"
                      icon={Zap}
                      variant="glass"
                    />
                    <Button onClick={() => { calculateSystemSize(); }} className="w-full">
                      Calculate Optimal Size
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'best-rates' && (
              <BestRatesStep 
                locationData={locationData}
                billData={billData}
                systemSize={systemSize}
                onNext={() => setCurrentStep('savings-analysis')} 
              />
            )}

            {currentStep === 'savings-analysis' && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Savings Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <MetricTile
                      title="Annual Savings"
                      value={solarROIQuery.data?.value?.annual_savings_AUD || 0}
                      format="currency"
                      subtitle="ML-predicted savings"
                      variant="glass"
                    />
                    <MetricTile
                      title="System Size"
                      value={`${formatNumber(systemSize.recommendedKw)}kW`}
                      subtitle="Optimized for your usage"
                      variant="glass"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={currentStepIndex === steps.length - 1}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Status Strip with Model Info */}
        <StatusStrip
          model="solar_roi"
          version={modelVersion}
          dataDate="2025-08-30"
          p95={solarROIQuery.data?.telemetry?.p95}
          mae={120}
          delta={solarROIQuery.data?.telemetry?.delta}
          error={modelError}
        />
      </div>
    </div>
  );
}