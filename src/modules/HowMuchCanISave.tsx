import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, MapPin, Zap, TrendingDown, Upload, Calculator, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import TopThreePlansCard from "@/components/TopThreePlansCard";
import AccuracyToggle from "@/components/AccuracyToggle";
import { publish } from "@/ai/orchestrator/bus";
import type { RankContext } from "@/energy/rankPlans";
import EnhancedOCRScanner from "@/components/EnhancedOCRScanner";
import SystemSizingStep from "@/components/SystemSizingStep";
import BestRatesStep from "@/components/BestRatesStep";
import SavingsAnalysisStep from "@/components/SavingsAnalysisStep";

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
    averageRate: 28
  });
  const [locationData, setLocationData] = useState<LocationData>({
    postcode: '',
    state: 'NSW',
    network: 'Ausgrid',
    meterType: 'TOU'
  });
  const [planCount, setPlanCount] = useState(0);
  const [retailers, setRetailers] = useState<string[]>([]);
  const [isProcessingBill, setIsProcessingBill] = useState(false);

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

  const [systemSize, setSystemSize] = useState({ 
    recommendedKw: 0, 
    panels: 0, 
    battery: 0, 
    estimatedGeneration: 0 
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

  const calculateSystemSize = () => {
    const annualUsage = billData.quarterlyUsage * 4;
    const recommendedKw = Math.ceil(annualUsage / 1200); // Rough sizing
    const panels = Math.ceil(recommendedKw / 0.4); // 400W panels
    const battery = Math.ceil(recommendedKw * 1.5); // 1.5x battery sizing
    const estimatedGeneration = recommendedKw * 1400; // Annual generation estimate
    
    setSystemSize({
      recommendedKw,
      panels,
      battery,
      estimatedGeneration
    });
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Introduction */}
        <div className="relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-background opacity-80">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
          </div>
          
          {/* Floating Animation Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ 
                y: [-20, 20, -20],
                rotate: [0, 5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 left-10 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 backdrop-blur-3xl"
            />
            <motion.div
              animate={{ 
                y: [20, -20, 20],
                rotate: [0, -3, 0],
                scale: [1.1, 1, 1.1]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-20 right-20 w-24 h-24 rounded-full bg-gradient-to-r from-green-400/20 to-blue-400/20 backdrop-blur-3xl"
            />
            <motion.div
              animate={{ 
                y: [0, -30, 0],
                x: [-10, 10, -10],
                rotate: [0, 2, 0]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute bottom-20 left-1/3 w-20 h-20 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-3xl"
            />
          </div>
          
          {/* Main Content */}
          <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="text-center space-y-6">
              
              {/* Header with Icon */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center justify-center gap-4"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-xl border border-primary/30"
                >
                  <Calculator className="h-10 w-10 text-primary" />
                </motion.div>
                <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                  How Much Can I Save?
                </h1>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="flex items-center justify-center gap-2 mt-2"
                >
                  <span className="text-lg text-muted-foreground">Going solar with</span>
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
                    className="text-lg font-bold text-primary"
                  >
                    {planCount.toLocaleString()}
                  </motion.span>
                  <span className="text-lg text-muted-foreground">solar & battery options</span>
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
                <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
                  Calculate your potential savings from solar panels, batteries, or both with our AI-powered analysis
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  
                  {/* Feature 1 */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all group"
                  >
                    <motion.div
                      className="p-3 rounded-xl bg-blue-500/20 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform"
                    >
                      <Upload className="h-6 w-6 text-blue-400" />
                    </motion.div>
                    <h3 className="font-semibold text-lg mb-2">Smart Bill Analysis</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Upload your electricity bill for AI-powered extraction of usage patterns and baseline costs for solar comparison
                    </p>
                  </motion.div>
                  
                  {/* Feature 2 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all group"
                  >
                    <motion.div
                      className="p-3 rounded-xl bg-green-500/20 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform"
                    >
                      <Zap className="h-6 w-6 text-green-400" />
                    </motion.div>
                    <h3 className="font-semibold text-lg mb-2">Solar System Sizing</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      AI calculates optimal solar and battery size based on your energy profile, or upload your solar quote
                    </p>
                  </motion.div>
                  
                  {/* Feature 3 */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0, duration: 0.5 }}
                    className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all group"
                  >
                    <motion.div
                      className="p-3 rounded-xl bg-purple-500/20 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform"
                    >
                      <TrendingDown className="h-6 w-6 text-purple-400" />
                    </motion.div>
                    <h3 className="font-semibold text-lg mb-2">Solar Savings & ROI</h3>
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

        {/* Progress Bar */}
        {currentStep !== 'method' && (
          <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
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
                      onExtraction={(data) => {
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
                              onValueChange={(value) => setBillData(prev => ({ ...prev, currentRetailer: value }))}
                            >
                              <SelectTrigger className="bg-white/10 border-white/20">
                                <SelectValue placeholder="Select retailer..." />
                              </SelectTrigger>
                              <SelectContent className="bg-background/95 backdrop-blur-xl border-white/20 z-50">
                                {retailers.map(retailer => (
                                  <SelectItem key={retailer} value={retailer}>
                                    {retailer}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="plan">Current Plan</Label>
                            <Input
                              id="plan"
                              value={billData.currentPlan}
                              onChange={(e) => setBillData(prev => ({ ...prev, currentPlan: e.target.value }))}
                              placeholder="e.g., Essentials Plan"
                              className="bg-white/10 border-white/20"
                            />
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
              <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Your Location & Meter Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="postcode">Postcode</Label>
                        <Input
                          id="postcode"
                          value={locationData.postcode}
                          onChange={(e) => setLocationData(prev => ({ ...prev, postcode: e.target.value }))}
                          placeholder="e.g., 2000"
                          className="bg-white/10 border-white/20"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Select 
                          value={locationData.state} 
                          onValueChange={(value) => setLocationData(prev => ({ 
                            ...prev, 
                            state: value,
                            network: NETWORKS[value as keyof typeof NETWORKS]?.[0] || ''
                          }))}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background/95 backdrop-blur-xl border-white/20 z-50">
                            {STATES.map(state => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="network">Distribution Network</Label>
                        <Select 
                          value={locationData.network} 
                          onValueChange={(value) => setLocationData(prev => ({ ...prev, network: value }))}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background/95 backdrop-blur-xl border-white/20 z-50">
                            {NETWORKS[locationData.state as keyof typeof NETWORKS]?.map(network => (
                              <SelectItem key={network} value={network}>
                                {network}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="meter">Meter Type</Label>
                        <Select 
                          value={locationData.meterType} 
                          onValueChange={(value: 'Single' | 'TOU' | 'Demand') => setLocationData(prev => ({ ...prev, meterType: value }))}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background/95 backdrop-blur-xl border-white/20 z-50">
                            <SelectItem value="Single">Single Rate</SelectItem>
                            <SelectItem value="TOU">Time of Use (TOU)</SelectItem>
                            <SelectItem value="Demand">Demand Tariff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'system-sizing' && (
              <SystemSizingStep
                billData={billData}
                locationData={locationData}
                systemSize={systemSize}
                onSystemUpdate={(system) => setSystemSize(system)}
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
                    (currentStep === 'current-bill' && (!billData.quarterlyBill || !billData.quarterlyUsage)) ||
                    (currentStep === 'location' && (!locationData.postcode || !locationData.state))
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
      </div>
    </div>
  );
}