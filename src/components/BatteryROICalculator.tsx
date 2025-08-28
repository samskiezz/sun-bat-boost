import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Eye, 
  Download,
  CheckCircle,
  AlertCircle,
  Edit,
  ChevronRight,
  ChevronLeft,
  Calculator,
  Zap,
  Home,
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart,
  ArrowRight,
  Plus,
  Minus,
  RefreshCw,
  MapPin,
  Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import EnhancedOCRScanner from '@/components/EnhancedOCRScanner';
import SiteAnalyzer from '@/components/SiteAnalyzer';

interface ExtractedData {
  // Address & Location
  address?: string;
  postcode?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  
  // Bill Data
  retailer?: string;
  planName?: string;
  usage?: number;
  billAmount?: number;
  dailySupply?: number;
  rate?: number;
  
  // Time of Use Data
  peakUsage?: number;
  offPeakUsage?: number;
  shoulderUsage?: number;
  peakRate?: number;
  offPeakRate?: number;
  shoulderRate?: number;
  
  // System Data (from proposals)
  systemSize?: number;
  panelCount?: number;
  panelBrand?: string;
  panelModel?: string;
  panelWattage?: number;
  
  inverterBrand?: string;
  inverterModel?: string;
  inverterSize?: number;
  inverterCount?: number;
  
  batteryBrand?: string;
  batteryModel?: string;
  batterySize?: number;
  batteryCount?: number;
  
  // Site Data
  roofTilt?: number;
  roofAzimuth?: number;
  shadingFactor?: number;
  
  // Financial
  systemPrice?: number;
  estimatedGeneration?: number;
  paybackPeriod?: number;
}

type Step = 'method' | 'bills' | 'system' | 'site' | 'results';

interface BatteryROICalculatorProps {
  preExtractedData?: ExtractedData;
}

export const BatteryROICalculator: React.FC<BatteryROICalculatorProps> = ({ preExtractedData }) => {
  const [currentStep, setCurrentStep] = useState<Step>('method');
  const [started, setStarted] = useState(false);
  const [inputMethod, setInputMethod] = useState<'bills' | 'manual'>('bills');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(preExtractedData || null);
  const [processing, setProcessing] = useState(false);
  const [showManualSystem, setShowManualSystem] = useState(false);
  const [siteAnalysis, setSiteAnalysis] = useState<any>(null);
  
  // Form data - will be auto-populated from extracted data
  const [formData, setFormData] = useState({
    // Bill data
    dailyUsage: 25,
    peakRate: 28.6,
    offPeakRate: 22.1,
    feedInTariff: 8.2,
    dailySupply: 98.45,
    dayNightSplit: 60,
    
    // System data
    solarSize: 6.5,
    batterySize: 13.5,
    systemPrice: 25000,
    
    // Site data
    postcode: '2000',
    roofTilt: 25,
    roofAzimuth: 0,
    shading: 0
  });

  // Auto-populate form data and skip steps when pre-extracted data is provided
  useEffect(() => {
    if (preExtractedData) {
      console.log('🔍 Pre-extracted data received:', preExtractedData);
      setExtractedData(preExtractedData);
      
      // Auto-advance to site step if we have address data
      if (preExtractedData.address && currentStep === 'method') {
        setInputMethod('bills');
        setCurrentStep('site');
        console.log('🚀 Auto-advancing to site step with address:', preExtractedData.address);
      }
    }
  }, [preExtractedData, currentStep]);
  useEffect(() => {
    if (extractedData) {
      setFormData(prev => ({
        ...prev,
        ...(extractedData.usage && { dailyUsage: extractedData.usage }),
        ...(extractedData.peakRate && { peakRate: extractedData.peakRate }),
        ...(extractedData.offPeakRate && { offPeakRate: extractedData.offPeakRate }),
        ...(extractedData.dailySupply && { dailySupply: extractedData.dailySupply / 100 }), // convert cents to dollars
        ...(extractedData.systemSize && { solarSize: extractedData.systemSize }),
        ...(extractedData.batterySize && { batterySize: extractedData.batterySize }),
        ...(extractedData.systemPrice && { systemPrice: extractedData.systemPrice }),
        ...(extractedData.postcode && { postcode: extractedData.postcode }),
        ...(extractedData.roofTilt && { roofTilt: extractedData.roofTilt }),
        ...(extractedData.roofAzimuth && { roofAzimuth: extractedData.roofAzimuth }),
        ...(extractedData.shadingFactor && { shading: extractedData.shadingFactor * 100 }) // convert to percentage
      }));
    }
  }, [extractedData]);

  // Simplified auto-advance with debouncing
  useEffect(() => {
    if (!extractedData || inputMethod !== 'bills') return;
    
    const timeoutId = setTimeout(() => {
      if (currentStep === 'bills' && (extractedData.usage || extractedData.peakRate)) {
        setCurrentStep('system');
      } else if (currentStep === 'system' && (extractedData.systemSize || extractedData.batterySize)) {
        setCurrentStep('site');
      }
    }, 2000); // Longer delay to prevent rapid changes

    return () => clearTimeout(timeoutId);
  }, [extractedData, currentStep, inputMethod]);

  const steps = [
    { id: 'method', title: 'Input Method', icon: Upload },
    { id: 'bills', title: 'Energy Data', icon: FileText },
    { id: 'system', title: 'System Size', icon: Zap },
    { id: 'site', title: 'Site Details', icon: Home },
    { id: 'results', title: 'ROI Analysis', icon: TrendingUp }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Handle OCR data extraction with proper type conversion
  const handleExtraction = useCallback((data: any) => {
    console.log('🔍 Extracted data:', data);
    
    // Convert EnhancedBillData to ExtractedData format
    const convertedData: ExtractedData = {
      address: data.address,
      postcode: data.postcode,
      state: data.state,
      latitude: data.latitude,
      longitude: data.longitude,
      retailer: data.retailer,
      planName: data.plan,
      usage: data.usage,
      billAmount: data.billAmount,
      dailySupply: data.dailySupply,
      rate: data.rate,
      peakUsage: data.peakUsage,
      offPeakUsage: data.offPeakUsage,
      shoulderUsage: data.shoulderUsage,
      peakRate: data.peakRate,
      offPeakRate: data.offPeakRate,
      shoulderRate: data.shoulderRate,
      systemSize: data.systemSize,
      panelCount: data.panelCount,
      panelBrand: data.panelBrand,
      panelModel: data.panelModel,
      panelWattage: data.panelWattage,
      inverterBrand: data.inverterBrand,
      inverterModel: data.inverterModel,
      inverterSize: data.inverterSize,
      inverterCount: data.inverterCount,
      batteryBrand: data.batteryBrand,
      batteryModel: data.batteryModel,
      batterySize: data.batterySize,
      batteryCount: data.batteryCount,
      roofTilt: data.roofTilt,
      roofAzimuth: data.roofAzimuth,
      shadingFactor: data.shadingFactor,
      systemPrice: data.systemPrice,
      estimatedGeneration: data.estimatedGeneration,
      paybackPeriod: data.paybackPeriod
    };
    
    setExtractedData(convertedData);
  }, []);

  const handleProcessing = useCallback((processing: boolean) => {
    setProcessing(processing);
  }, []);

  const nextStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id as Step);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as Step);
    }
  };

  const handleFieldEdit = (field: keyof ExtractedData, newValue: string | number) => {
    if (extractedData) {
      setExtractedData(prev => prev ? { ...prev, [field]: newValue } : null);
    }
  };

  const calculateROI = () => {
    setCurrentStep('results');
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-background p-4">
        {/* Main Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="glass-card p-8 md:p-12"
          >
            {/* Header */}
            <motion.div 
              className="flex flex-col items-center gap-4 mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-400/30 backdrop-blur-sm">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  🔋
                </motion.div>
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                  Battery ROI Calculator
                </h1>
                <p className="text-lg text-foreground/80 mt-2">
                  Calculate your <motion.span 
                    className="font-semibold text-primary"
                    animate={{ color: ["hsl(270 91% 65%)", "hsl(280 100% 75%)", "hsl(270 91% 65%)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    battery investment
                  </motion.span> return on investment
                </p>
              </div>
            </motion.div>

            {/* Description */}
            <motion.p 
              className="text-xl text-foreground/70 mb-12 leading-relaxed max-w-3xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              Analyze your battery system's financial performance with AI-powered ROI calculations
            </motion.p>

            {/* Feature Cards */}
            <motion.div 
              className="grid md:grid-cols-3 gap-6 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <motion.div 
                className="group p-6 rounded-2xl bg-card border border-border hover:bg-card/80 transition-all duration-300"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-400/30 w-fit mx-auto mb-4">
                  📊
                </div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">Smart Analysis</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Upload energy bills for AI-powered extraction of usage patterns and costs
                </p>
              </motion.div>

              <motion.div 
                className="group p-6 rounded-2xl bg-card border border-border hover:bg-card/80 transition-all duration-300"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-400/30 w-fit mx-auto mb-4">
                  ⚡
                </div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">Battery Sizing</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Calculate optimal battery size based on your energy usage and solar generation
                </p>
              </motion.div>

              <motion.div 
                className="group p-6 rounded-2xl bg-card border border-border hover:bg-card/80 transition-all duration-300"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-400/30 w-fit mx-auto mb-4">
                  💰
                </div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">ROI Analysis</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Detailed payback period, savings analysis, and long-term investment returns
                </p>
              </motion.div>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6 }}
            >
              <Button
                onClick={() => setStarted(true)}
                size="lg"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg px-12 py-6 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                Calculate Battery ROI
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-400/30">
              🔋
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                Battery ROI Calculator
              </h2>
              <p className="text-sm text-muted-foreground">Calculate your battery investment return</p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit">
            Step {currentStepIndex + 1} of {steps.length}
          </Badge>
        </div>
        
        <Progress value={progress} className="mb-4" />
        
        <div className="flex items-center justify-between text-sm">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.id}
                className={`flex items-center gap-2 ${
                  index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-6"
        >
          {/* Step 1: Input Method */}
          {currentStep === 'method' && (
            <>
              <h3 className="text-lg font-semibold mb-6 text-foreground">How would you like to input your data?</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <motion.button
                  onClick={() => {
                    setInputMethod('bills');
                    setCurrentStep('bills');
                  }}
                  className={`p-6 rounded-xl border text-left transition-all duration-200 ${
                    inputMethod === 'bills' 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-border bg-card hover:bg-card/80'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Upload className="w-6 h-6 text-primary" />
                    <div>
                      <h4 className="font-medium text-foreground">Upload Bills & Quotes</h4>
                      <Badge variant="default" className="mt-1">Recommended</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload your energy bill and solar quote for automatic data extraction and accurate ROI calculation.
                  </p>
                  <div className="flex items-center text-sm text-primary">
                    <span>Most accurate results</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => {
                    setInputMethod('manual');
                    setCurrentStep('bills');
                  }}
                  className={`p-6 rounded-xl border text-left transition-all duration-200 ${
                    inputMethod === 'manual' 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-border bg-card hover:bg-card/80'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Edit className="w-6 h-6 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium text-foreground">Manual Entry</h4>
                      <Badge variant="outline" className="mt-1">Quick Option</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter your energy usage and system details manually if you don't have documents to upload.
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>Enter details yourself</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </motion.button>
              </div>
            </>
          )}

          {/* Step 2: Bills */}
          {currentStep === 'bills' && (
            <>
              <h3 className="text-lg font-semibold mb-6 text-foreground">Energy Usage & Rates</h3>
              
              {inputMethod === 'bills' ? (
                <EnhancedOCRScanner
                  onExtraction={handleExtraction}
                  onProcessing={handleProcessing}
                  mode="bill"
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <Label>Daily Usage (kWh)</Label>
                      <Input
                        type="number"
                        value={formData.dailyUsage}
                        onChange={(e) => setFormData(prev => ({ ...prev, dailyUsage: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>Peak Rate (c/kWh)</Label>
                      <Input
                        type="number"
                        value={formData.peakRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, peakRate: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>Off-Peak Rate (c/kWh)</Label>
                      <Input
                        type="number"
                        value={formData.offPeakRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, offPeakRate: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>Feed-in Tariff (c/kWh)</Label>
                      <Input
                        type="number"
                        value={formData.feedInTariff}
                        onChange={(e) => setFormData(prev => ({ ...prev, feedInTariff: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>Daily Supply Charge (c)</Label>
                      <Input
                        type="number"
                        value={formData.dailySupply}
                        onChange={(e) => setFormData(prev => ({ ...prev, dailySupply: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>Day/Night Usage Split: {formData.dayNightSplit}% day</Label>
                      <Slider
                        value={[formData.dayNightSplit]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, dayNightSplit: value[0] }))}
                        max={80}
                        min={20}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 3: System */}
          {currentStep === 'system' && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">System Configuration</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualSystem(!showManualSystem)}
                >
                  {showManualSystem ? 'Upload Quote' : 'Manual Entry'}
                </Button>
              </div>

              {!showManualSystem ? (
                <EnhancedOCRScanner
                  onExtraction={handleExtraction}
                  onProcessing={handleProcessing}
                  mode="quote"
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <Label>Solar System Size: {formData.solarSize} kW</Label>
                      <Slider
                        value={[formData.solarSize]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, solarSize: value[0] }))}
                        max={20}
                        min={3}
                        step={0.5}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Battery Size: {formData.batterySize} kWh</Label>
                      <Slider
                        value={[formData.batterySize]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, batterySize: value[0] }))}
                        max={30}
                        min={5}
                        step={0.5}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>Total System Price (inc. GST)</Label>
                      <Input
                        type="number"
                        value={formData.systemPrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, systemPrice: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2 text-foreground">Quick Size Guide</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>• Small home (15-25 kWh/day): 6kW + 10kWh</p>
                        <p>• Medium home (25-35 kWh/day): 8kW + 13kWh</p>
                        <p>• Large home (35+ kWh/day): 10kW+ + 20kWh+</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 4: Site */}
          {currentStep === 'site' && (
            <>
              <h3 className="text-lg font-semibold mb-6 text-foreground">Site & Location Analysis</h3>
              
              <SiteAnalyzer
                address={extractedData?.address}
                postcode={extractedData?.postcode || formData.postcode}
                onAnalysisComplete={(analysis) => {
                  setSiteAnalysis(analysis);
                  setFormData(prev => ({
                    ...prev,
                    postcode: analysis.postcode,
                    roofTilt: analysis.roofTilt,
                    roofAzimuth: analysis.roofAzimuth,
                    shading: Math.round(analysis.shadingFactor * 100)
                  }));
                }}
              />
              
              {siteAnalysis && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 text-blue-700 dark:text-blue-300">Manual Adjustments (if needed)</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Postcode</Label>
                        <Input
                          value={formData.postcode}
                          onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Roof Tilt (°)</Label>
                        <Input
                          type="number"
                          value={formData.roofTilt}
                          onChange={(e) => setFormData(prev => ({ ...prev, roofTilt: parseFloat(e.target.value) }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Roof Direction (° from North)</Label>
                        <Input
                          type="number"
                          value={formData.roofAzimuth}
                          onChange={(e) => setFormData(prev => ({ ...prev, roofAzimuth: parseFloat(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Shading Level (%)</Label>
                        <Input
                          type="number"
                          value={formData.shading}
                          onChange={(e) => setFormData(prev => ({ ...prev, shading: parseFloat(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 5: Results */}
          {currentStep === 'results' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">ROI Analysis Results</h3>
              </div>
              
              <div className="grid gap-6 md:grid-cols-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  <div className="text-2xl font-bold text-foreground">8.2</div>
                  <div className="text-sm text-muted-foreground">Years Payback</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold text-foreground">$2,840</div>
                  <div className="text-sm text-muted-foreground">Annual Savings</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold text-foreground">$47,200</div>
                  <div className="text-sm text-muted-foreground">25-Year NPV</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <PieChart className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold text-foreground">78%</div>
                  <div className="text-sm text-muted-foreground">Self Consumption</div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold mb-4 text-foreground">Detailed Analysis</h4>
                <div className="h-64 flex items-center justify-center border border-border rounded-lg bg-muted/20">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p>Interactive charts and detailed breakdown</p>
                    <p className="text-sm">(Coming soon)</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="glass-card p-4">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Step {currentStepIndex + 1} of {steps.length}
          </div>
          
          {currentStep === 'site' ? (
            <Button
              onClick={calculateROI}
              className="bg-gradient-to-r from-primary to-secondary text-white"
            >
              <Calculator className="w-4 h-4 mr-1" />
              Calculate ROI
            </Button>
          ) : currentStep === 'results' ? (
            <Button variant="outline">
              <Download className="w-4 h-4 mr-1" />
              Export Report
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={currentStepIndex === steps.length - 1}
              className="bg-gradient-to-r from-primary to-secondary text-white"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatteryROICalculator;