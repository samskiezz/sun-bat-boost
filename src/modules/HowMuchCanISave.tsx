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

  // Get plan count and retailers from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        // Get plan count
        const { count } = await supabase
          .from('energy_plans')
          .select('*', { count: 'exact', head: true });
        setPlanCount(count || 0);
        
        // Get unique retailers
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
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 backdrop-blur-xl border border-primary/20">
              <Calculator className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                How Much Can I Save?
              </h1>
              <p className="text-muted-foreground">
                Compare your bill with {planCount.toLocaleString()} live energy plans
              </p>
            </div>
          </div>
          <AccuracyToggle />
        </div>

        {/* Progress Bar */}
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