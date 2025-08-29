import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, MapPin, Zap, TrendingDown, Upload, Calculator, ArrowLeft, ArrowRight, Camera, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import TopThreePlansCard from "@/components/TopThreePlansCard";
import EnergyPlanStats from "@/components/EnergyPlanStats";
import BatteryROICalculator from "@/components/BatteryROICalculator";
import AIAssistant from "@/components/AIAssistant";
import { SavingsWizard } from "@/components/SavingsWizard";
import BestRatesStep from "@/components/BestRatesStep";
import SavingsAnalysisStep from "@/components/SavingsAnalysisStep";
import SystemSizingStep from "@/components/SystemSizingStep";
import EnhancedOCRScanner from "@/components/EnhancedOCRScanner";
import { LocationAutoFill } from "@/components/LocationAutoFill";
import SiteAnalysisPopup from "@/components/SiteAnalysisPopup";
import { publish } from "@/ai/orchestrator/bus";
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
  shoulderUsage?: number;
  peakRate?: number;
  offPeakRate?: number;
  shoulderRate?: number;
  touWindows?: Array<{
    period: string;
    hours: string;
    rate: number;
    usage: number;
  }>;
  hasEV?: boolean;
  evChargingKwh?: number;
  evChargingCost?: number;
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
    evChargingKwh: 0,
    evChargingCost: 0
  });
  const [locationData, setLocationData] = useState<LocationData>({
    postcode: '',
    state: 'NSW',
    network: 'Ausgrid',
    meterType: 'TOU'
  });
  const [planCount, setPlanCount] = useState(0);
  const [retailers, setRetailers] = useState<string[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Array<{id: string; plan_name: string; retailer: string}>>([]);
  const [isProcessingBill, setIsProcessingBill] = useState(false);
  const [showSiteAnalysis, setShowSiteAnalysis] = useState(false);

  // Get solar equipment count for display instead of energy plans
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        // Get solar panel count for display
        const { count: panelCount } = await supabase
          .from('pv_modules')
          .select('*', { count: 'exact', head: true });
        
        // Get battery count
        const { count: batteryCount } = await supabase
          .from('batteries')
          .select('*', { count: 'exact', head: true });
        
        // Show combined solar equipment count
        setPlanCount((panelCount || 0) + (batteryCount || 0));
        
        // Get unique retailers for bill analysis
        const { data: retailerData } = await supabase
          .from('energy_plans')
          .select('retailer')
          .order('retailer');
        
        const uniqueRetailers = [...new Set(retailerData?.map(r => r.retailer) || [])];
        setRetailers(uniqueRetailers);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Fetch plans when retailer is selected
  const fetchPlansForRetailer = async (retailer: string) => {
    if (!retailer) {
      setAvailablePlans([]);
      return;
    }
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: plans, error } = await supabase
        .from('energy_plans')
        .select('id, plan_name, retailer')
        .eq('retailer', retailer)
        .order('plan_name');
      
      if (error) {
        console.error('Error fetching plans:', error);
        return;
      }
      
      setAvailablePlans(plans || []);
    } catch (error) {
      console.error('Error fetching plans for retailer:', error);
    }
  };

  // Handle retailer selection
  const handleRetailerChange = (retailer: string) => {
    setBillData(prev => ({ 
      ...prev, 
      currentRetailer: retailer,
      currentPlan: '' // Reset plan when retailer changes
    }));
    fetchPlansForRetailer(retailer);
  };

  const [systemSize, setSystemSize] = useState({ 
    recommendedKw: 0, 
    panels: 0, 
    battery: 0, 
    estimatedGeneration: 0,
    confidence: 0,
    aiReasoning: '',
    products: undefined as any
  });
  const [topRates, setTopRates] = useState([]);

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
    
    // Don't auto-skip location - let users verify/edit
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
    console.log('📊 Input data:', { billData, locationData });
    
    try {
      // Use the AI system sizing edge function for more accurate calculations
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
            evChargingKwh: billData.evChargingKwh || 0,
            evChargingCost: billData.evChargingCost || 0,
            peakRate: billData.peakRate,
            offPeakRate: billData.offPeakRate,
            shoulderRate: billData.shoulderRate
          },
          locationData: {
            postcode: locationData.postcode,
            state: locationData.state,
            network: locationData.network,
            meterType: locationData.meterType
          },
          preferences: {
            offsetGoal: 90, // Target 90% offset
            roofSpace: 'average',
            includeBattery: true,
            budgetRange: 'mid'
          }
        }
      });

      if (error) {
        console.error('❌ AI sizing error:', error);
        // Fall back to basic calculation
        throw new Error('AI sizing failed');
      }

      console.log('✅ AI sizing result:', data);
      
      setSystemSize({
        recommendedKw: data.recommendations.panels.totalKw,
        panels: data.recommendations.panels.count,
        battery: data.recommendations.battery ? data.recommendations.battery.capacity_kwh : 0,
        estimatedGeneration: data.financial.annual_generation,
        confidence: data.rationale.confidence,
        aiReasoning: data.rationale.ai_reasoning,
        products: {
          panels: data.recommendations.panels,
          battery: data.recommendations.battery,
          inverter: data.recommendations.inverter
        }
      });
      
    } catch (error) {
      console.warn('⚠️ AI sizing failed, using basic calculation:', error);
      
      // Enhanced basic calculation as fallback
      const annualUsage = billData.quarterlyUsage * 4;
      const dailyUsage = annualUsage / 365;
      
      // More sophisticated basic sizing based on Australian standards
      const peakSunHours = locationData.state === 'QLD' ? 5.2 : locationData.state === 'WA' ? 5.0 : 4.5;
      const systemEfficiency = 0.8; // Account for losses
      
      // Size system to cover 100-120% of usage
      const recommendedKw = Math.ceil((annualUsage * 1.1) / (peakSunHours * 365 * systemEfficiency));
      const panels = Math.ceil(recommendedKw * 1000 / 400); // Assume 400W panels
      
      // Battery sizing based on evening consumption (30-40% of daily usage)
      const eveningUsage = dailyUsage * 0.35;
      const battery = Math.ceil(eveningUsage * 1.2); // 20% buffer
      
      const estimatedGeneration = recommendedKw * peakSunHours * 365 * systemEfficiency;
      
      setSystemSize({
        recommendedKw,
        panels,
        battery: Math.min(battery, 15), // Cap at 15kWh for rebate eligibility
        estimatedGeneration,
        confidence: 0.65,
        aiReasoning: `Basic calculation for ${locationData.state}: ${recommendedKw}kW system should generate ${Math.round(estimatedGeneration).toLocaleString()}kWh/year vs ${annualUsage.toLocaleString()}kWh usage`,
        products: undefined
      });
    }
    
    setCurrentStep('system-sizing');
  };

  const calculateSavings = () => {
    setCurrentStep('savings-analysis');
  };

  // Create context for plan ranking
  const rankingContext: RankContext = {
    postcode: parseInt(locationData.postcode) || 2000,
    state: locationData.state,
    network: locationData.network,
    meter_type: locationData.meterType,
    baseline_cost_aud: billData.quarterlyBill * 4 // Convert quarterly to annual
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Introduction */}
        <div className="relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-secondary/10 opacity-90">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.2),rgba(255,255,255,0))]"></div>
          </div>
          
          {/* Main Content */}
          <div className="relative z-10 glass-card p-8 md:p-12">
            <div className="text-center space-y-6">
              
              {/* Header with Icon */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-xl border border-primary/30"
                >
                  <Calculator className="h-10 w-10 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent leading-tight">
                    How Much Can I Save?
                  </h1>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-2"
                  >
                    <span className="text-base md:text-lg text-muted-foreground">Going solar with</span>
                    <motion.span 
                      key={planCount}
                      initial={{ scale: 1.2, color: "#3b82f6" }}
                      animate={{ 
                        scale: 1,
                        color: ["#3b82f6", "#8b5cf6", "#3b82f6"]
                      }}
                      transition={{
                        scale: { duration: 0.5 },
                        color: { duration: 2, repeat: Infinity }
                      }}
                      className="text-base md:text-lg font-bold text-primary"
                    >
                      {planCount.toLocaleString()}
                    </motion.span>
                    <span className="text-base md:text-lg text-muted-foreground">solar & battery options</span>
                  </motion.div>
                </div>
              </motion.div>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="max-w-4xl mx-auto space-y-4"
              >
                <p className="text-lg md:text-xl text-foreground/80 leading-relaxed">
                  Calculate your potential savings from solar panels, batteries, or both with our AI-powered analysis
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  
                   {/* Feature 1 */}
                   <motion.div
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.6, duration: 0.5 }}
                     className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all group"
                   >
                     <motion.div
                       className="p-3 rounded-xl bg-blue-500/20 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform"
                     >
                       <Upload className="h-6 w-6 text-blue-600" />
                     </motion.div>
                     <h3 className="font-semibold text-lg mb-2 text-foreground">Smart Bill Analysis</h3>
                     <p className="text-sm text-muted-foreground leading-relaxed">
                       Upload your electricity bill for AI-powered extraction of usage patterns and baseline costs for solar comparison
                     </p>
                   </motion.div>
                   
                   {/* Feature 2 */}
                   <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.8, duration: 0.5 }}
                     className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all group"
                   >
                     <motion.div
                       className="p-3 rounded-xl bg-green-500/20 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform"
                     >
                       <Zap className="h-6 w-6 text-green-600" />
                     </motion.div>
                     <h3 className="font-semibold text-lg mb-2 text-foreground">Solar System Sizing</h3>
                     <p className="text-sm text-muted-foreground leading-relaxed">
                       AI calculates optimal solar and battery size based on your energy profile, or upload your solar quote
                     </p>
                   </motion.div>
                   
                   {/* Feature 3 */}
                   <motion.div
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 1.0, duration: 0.5 }}
                     className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all group"
                   >
                     <motion.div
                       className="p-3 rounded-xl bg-purple-500/20 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform"
                     >
                       <TrendingDown className="h-6 w-6 text-purple-600" />
                     </motion.div>
                     <h3 className="font-semibold text-lg mb-2 text-foreground">Solar Savings & ROI</h3>
                     <p className="text-sm text-muted-foreground leading-relaxed">
                       Calculate total savings, payback period, and ROI from solar panels, batteries, or combined systems
                     </p>
                   </motion.div>
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="pt-6"
              >
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                  onClick={() => setCurrentStep('method')}
                >
                  Start Solar Savings Analysis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Progress Header */}
        {currentStep !== 'method' && (
          <Card className="glass-card mb-6">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Step {currentStepIndex + 1} of {steps.length}</span>
                  <span>{Math.round(progress)}% Complete</span>
                </div>
                <Progress value={progress} className="h-2" />
                 <div className="flex justify-between">
                   {steps.map((step, index) => {
                     const Icon = step.icon;
                     const isActive = index === currentStepIndex;
                     const isCompleted = index < currentStepIndex;
                     
                     return (
                      <div key={step.id} className="flex flex-col items-center space-y-2">
                        <div className={`p-2 rounded-full transition-all ${
                          isActive 
                            ? 'bg-primary text-primary-foreground' 
                            : isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className={`text-xs text-center ${
                          isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                        }`}>
                          {step.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    How would you like to enter your bill details?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className={`cursor-pointer transition-all border-2 ${
                      inputMethod === 'manual' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`} onClick={() => setInputMethod('manual')}>
                      <CardContent className="p-6 text-center space-y-4">
                        <div className="p-4 rounded-2xl bg-primary/20 w-fit mx-auto">
                          <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Manual Entry</h3>
                          <p className="text-sm text-muted-foreground">
                            Enter your bill details manually for quick comparison
                          </p>
                        </div>
                        <Badge variant={inputMethod === 'manual' ? 'default' : 'secondary'}>
                          {inputMethod === 'manual' ? 'Selected' : 'Select'}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card className={`cursor-pointer transition-all border-2 ${
                      inputMethod === 'upload' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`} onClick={() => setInputMethod('upload')}>
                      <CardContent className="p-6 text-center space-y-4">
                        <div className="p-4 rounded-2xl bg-secondary/20 w-fit mx-auto">
                          <Upload className="h-8 w-8 text-secondary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Upload Bill</h3>
                          <p className="text-sm text-muted-foreground">
                            Upload your electricity bill for automatic extraction
                          </p>
                        </div>
                        <Badge variant={inputMethod === 'upload' ? 'default' : 'secondary'}>
                          {inputMethod === 'upload' ? 'Selected' : 'Smart Analysis'}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'current-bill' && (
              <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Your Current Electricity Bill
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {inputMethod === 'upload' ? (
                    <EnhancedOCRScanner
                      mode="bill"
                      onExtraction={async (data) => {
                        setBillData({
                          currentRetailer: data.retailer || '',
                          currentPlan: data.plan || '',
                          quarterlyUsage: data.usage || 0,
                          quarterlyBill: data.billAmount || 0,
                          dailySupply: data.dailySupply || 100,
                          averageRate: data.rate || 28,
                          peakUsage: data.peakUsage,
                          offPeakUsage: data.offPeakUsage,
                          shoulderUsage: data.shoulderUsage,
                          peakRate: data.peakRate,
                          offPeakRate: data.offPeakRate,
                          shoulderRate: data.shoulderRate
                        });
                        
                        // Auto-detect location from OCR extracted data
                        if (data.postcode || data.address) {
                          const postcode = data.postcode;
                          if (postcode) {
                            try {
                              // Import the DNSP resolver function
                              const { getDnspByPostcode } = await import('@/utils/dnspResolver');
                              const dnspDetails = await getDnspByPostcode(postcode);
                              
                              // Auto-populate location data
                              setLocationData({
                                postcode: postcode,
                                state: dnspDetails.state,
                                network: dnspDetails.network,
                                meterType: 'TOU' // Default for most areas
                              });
                              
                              console.log(`Auto-detected DNSP: ${dnspDetails.network}, ${dnspDetails.state}`);
                            } catch (error) {
                              console.error('DNSP auto-detection failed:', error);
                              // Still set postcode if DNSP lookup fails
                              if (data.postcode) {
                                setLocationData(prev => ({
                                  ...prev,
                                  postcode: data.postcode
                                }));
                              }
                            }
                          }
                        }
                        
                        setIsProcessingBill(false);
                      }}
                      onProcessing={setIsProcessingBill}
                    />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="retailer">Current Retailer</Label>
                            <Select
                              value={billData.currentRetailer}
                              onValueChange={handleRetailerChange}
                            >
                              <SelectTrigger className="bg-white/10 border-white/20 backdrop-blur-sm">
                                <SelectValue placeholder="Select your energy retailer..." />
                              </SelectTrigger>
                              <SelectContent className="bg-background/95 backdrop-blur-xl border-white/20 z-50">
                                {retailers.map(retailer => (
                                  <SelectItem 
                                    key={retailer} 
                                    value={retailer}
                                    className="hover:bg-primary/10 focus:bg-primary/10"
                                  >
                                    {retailer}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="plan">Current Plan</Label>
                            <Select
                              value={billData.currentPlan}
                              onValueChange={(value) => setBillData(prev => ({ ...prev, currentPlan: value }))}
                              disabled={!billData.currentRetailer}
                            >
                              <SelectTrigger className="bg-white/10 border-white/20 backdrop-blur-sm">
                                <SelectValue 
                                  placeholder={
                                    !billData.currentRetailer 
                                      ? "Select retailer first..." 
                                      : availablePlans.length === 0
                                      ? "Loading plans..."
                                      : "Select your current plan..."
                                  } 
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-background/95 backdrop-blur-xl border-white/20 z-50 max-h-60">
                                {availablePlans.map(plan => (
                                  <SelectItem 
                                    key={plan.id} 
                                    value={plan.plan_name}
                                    className="hover:bg-primary/10 focus:bg-primary/10"
                                  >
                                    {plan.plan_name}
                                  </SelectItem>
                                ))}
                                {billData.currentRetailer && availablePlans.length === 0 && (
                                  <SelectItem value="custom" className="text-muted-foreground">
                                    No plans found - Enter custom plan
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="usage">Quarterly Usage (kWh)</Label>
                            <Input
                              id="usage"
                              type="number"
                              value={billData.quarterlyUsage || ''}
                              onChange={(e) => setBillData(prev => ({ ...prev, quarterlyUsage: parseFloat(e.target.value) || 0 }))}
                              placeholder="e.g., 2400"
                              className="bg-white/10 border-white/20"
                            />
                           </div>
                         </div>
                         <div className="space-y-4">
                           <div>
                             <Label htmlFor="bill">Quarterly Bill Amount ($)</Label>
                             <Input
                               id="bill"
                               type="number"
                               value={billData.quarterlyBill || ''}
                               onChange={(e) => setBillData(prev => ({ ...prev, quarterlyBill: parseFloat(e.target.value) || 0 }))}
                               placeholder="e.g., 650"
                               className="bg-white/10 border-white/20"
                             />
                           </div>
                           <div>
                             <Label htmlFor="supply">Daily Supply Charge (c/day)</Label>
                             <Input
                               id="supply"
                               type="number"
                               value={billData.dailySupply || ''}
                               onChange={(e) => setBillData(prev => ({ ...prev, dailySupply: parseFloat(e.target.value) || 0 }))}
                               placeholder="e.g., 110"
                               className="bg-white/10 border-white/20"
                             />
                           </div>
                           <div>
                             <Label>Average Rate (calculated)</Label>
                             <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                               <span className="text-lg font-semibold">
                                 {billData.quarterlyUsage > 0 
                                   ? ((billData.quarterlyBill * 100 - billData.dailySupply * 91.25) / billData.quarterlyUsage).toFixed(1)
                                   : '0.0'
                                 } c/kWh
                               </span>
                             </div>
                           </div>
                         </div>
                       </div>
                       
                       {/* EV Section */}
                       <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                         <h4 className="font-semibold mb-4 flex items-center gap-2">
                           <Zap className="h-5 w-5" />
                           Electric Vehicle Details (Optional)
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div>
                             <Label htmlFor="hasEV">Do you have an EV?</Label>
                             <Select
                               value={billData.hasEV ? 'yes' : 'no'}
                               onValueChange={(value) => setBillData(prev => ({ 
                                 ...prev, 
                                 hasEV: value === 'yes',
                                 evChargingKwh: value === 'no' ? 0 : prev.evChargingKwh,
                                 evChargingCost: value === 'no' ? 0 : prev.evChargingCost
                               }))}
                             >
                               <SelectTrigger className="bg-white/10 border-white/20">
                                 <SelectValue placeholder="Select..." />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="no">No</SelectItem>
                                 <SelectItem value="yes">Yes</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                           
                           {billData.hasEV && (
                             <>
                               <div>
                                 <Label htmlFor="evKwh">Monthly EV Charging (kWh)</Label>
                                 <Input
                                   id="evKwh"
                                   type="number"
                                   value={billData.evChargingKwh || ''}
                                   onChange={(e) => setBillData(prev => ({ ...prev, evChargingKwh: parseFloat(e.target.value) || 0 }))}
                                   placeholder="e.g., 400"
                                   className="bg-white/10 border-white/20"
                                 />
                               </div>
                               
                               <div>
                                 <Label htmlFor="evCost">Monthly EV Charging Cost ($)</Label>
                                 <Input
                                   id="evCost"
                                   type="number"
                                   value={billData.evChargingCost || ''}
                                   onChange={(e) => setBillData(prev => ({ ...prev, evChargingCost: parseFloat(e.target.value) || 0 }))}
                                   placeholder="e.g., 120"
                                   className="bg-white/10 border-white/20"
                                 />
                               </div>
                             </>
                           )}
                         </div>
                         {billData.hasEV && billData.evChargingKwh > 0 && (
                           <div className="mt-3 p-3 bg-white/5 rounded-lg">
                             <p className="text-sm text-muted-foreground">
                               Annual EV Usage: <span className="font-medium">{(billData.evChargingKwh * 12).toLocaleString()} kWh</span>
                               {' • '}
                               Annual EV Cost: <span className="font-medium">${(billData.evChargingCost * 12).toLocaleString()}</span>
                             </p>
                           </div>
                         )}
                      </div>
                    </>
                  )}
                  
                  {billData.quarterlyBill > 0 && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                      <h4 className="font-semibold mb-2">Annual Estimate</h4>
                      <div className="text-2xl font-bold text-primary">
                        ${(billData.quarterlyBill * 4).toLocaleString()} per year
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Based on {(billData.quarterlyUsage * 4).toLocaleString()} kWh annually
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentStep === 'location' && (
              <Card className="border-primary/20 bg-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location & Site Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-lg">
                      <Satellite className="h-6 w-6 text-primary" />
                      <span>Ready for AI-powered site analysis</span>
                    </div>
                    <p className="text-muted-foreground">
                      Our AI will analyze satellite imagery, detect shading patterns, measure roof dimensions, 
                      and determine optimal solar panel placement for your location.
                    </p>
                    
                    {locationData.postcode && (
                      <div className="p-4 bg-white/5 rounded-lg">
                        <h4 className="font-semibold mb-2">Current Location</h4>
                        <div className="text-sm space-y-1">
                          <div>Postcode: <span className="font-medium">{locationData.postcode}</span></div>
                          {locationData.state && <div>State: <span className="font-medium">{locationData.state}</span></div>}
                          {locationData.network && <div>Network: <span className="font-medium">{locationData.network}</span></div>}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => setShowSiteAnalysis(true)}
                      className="bg-primary hover:bg-primary/90 px-8 py-3"
                      size="lg"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Start Site Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'system-sizing' && (
              <SystemSizingStep
                billData={billData}
                locationData={locationData}
                systemSize={systemSize}
                onSystemUpdate={(system) => setSystemSize({
                  ...system,
                  confidence: system.confidence || 0,
                  aiReasoning: system.aiReasoning || '',
                  products: system.products
                })}
                onNext={nextStep}
              />
            )}

            {currentStep === 'best-rates' && (
              <BestRatesStep
                billData={billData}
                locationData={locationData}
                systemSize={systemSize}
                onNext={nextStep}
              />
            )}

            {currentStep === 'savings-analysis' && (
              <SavingsAnalysisStep
                billData={billData}
                locationData={locationData}
                systemSize={systemSize}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={prevStep}
                disabled={currentStep === 'method'}
                className="bg-white/10 border-white/20 hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <div className="text-sm text-muted-foreground">
                {currentStep === 'savings-analysis' ? 'Review your comprehensive savings analysis' : `Step ${currentStepIndex + 1} of ${steps.length}`}
              </div>
              
              {currentStep !== 'savings-analysis' ? (
                <Button 
                  onClick={() => {
                    if (currentStep === 'method') nextStep();
                    else if (currentStep === 'current-bill') nextStep();
                    else if (currentStep === 'location') calculateSystemSize();
                    else if (currentStep === 'system-sizing') nextStep();
                    else if (currentStep === 'best-rates') nextStep();
                  }}
                  disabled={
                    (currentStep === 'method' && !inputMethod) ||
                    (currentStep === 'current-bill' && (!billData.quarterlyBill || !billData.quarterlyUsage)) ||
                    (currentStep === 'location' && (!locationData.postcode || !locationData.state)) ||
                    (currentStep === 'system-sizing' && (!systemSize || systemSize.confidence < 0.3))
                  }
                  className="bg-primary hover:bg-primary/90"
                >
                  {currentStep === 'method' && 'Start Analysis'}
                  {currentStep === 'current-bill' && 'Next: Location'}
                  {currentStep === 'location' && 'Auto-Size System'}
                  {currentStep === 'system-sizing' && 'Find Best Rates'}
                  {currentStep === 'best-rates' && 'View Savings'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    setBillData({
                      currentRetailer: '',
                      currentPlan: '',
                      quarterlyUsage: 0,
                      quarterlyBill: 0,
                      dailySupply: 100,
                      averageRate: 28
                    });
                    setLocationData({
                      postcode: '',
                      state: 'NSW',
                      network: 'Ausgrid',
                      meterType: 'TOU'
                    });
                    setCurrentStep('method');
                  }}
                  variant="outline"
                  className="bg-white/10 border-white/20 hover:bg-white/20"
                >
                  Start Over
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Site Analysis Popup */}
        <SiteAnalysisPopup
          isOpen={showSiteAnalysis}
          onClose={() => setShowSiteAnalysis(false)}
          initialPostcode={locationData.postcode}
          onLocationUpdate={(data) => {
            setLocationData({
              postcode: data.postcode,
              state: data.state,
              network: data.network,
              meterType: data.meterType || 'TOU'
            });
          }}
          onSiteUpdate={(data) => {
            setBillData(prev => ({
              ...prev,
              siteAnalysis: {
                roofSlope: data.roofSlope,
                roofAzimuth: data.roofAzimuth,
                shadingFactor: data.shadingFactor,
                solarAccess: data.solarAccess,
                latitude: data.latitude,
                longitude: data.longitude
              }
            }));
          }}
        />
      </div>
    </div>
  );
}