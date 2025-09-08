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
  RefreshCw
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Glass } from '@/components/Glass';
import { useDropzone } from 'react-dropzone';
import { SavingsWizard } from '@/components/SavingsWizard';
import { subscribe } from "@/ai/orchestrator/bus";
import ComprehensiveShadeAnalyzer from '@/components/ComprehensiveShadeAnalyzer';
import { Banner } from "@/features/shared/Banner";
import { MetricTile } from "@/features/shared/MetricTile";
import { StatusStrip } from "@/features/shared/StatusStrip";
import { useBatteryROI } from "@/hooks/useModels";
import { useModelStore } from "@/state/modelStore";
import { tokens } from "@/theme/tokens";

interface ExtractedField {
  label: string;
  value: string | number;
  confidence: number;
  editable: boolean;
}

type Step = 'method' | 'bills' | 'system' | 'site' | 'results';

export default function BatteryRoi() {
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('method');
  const [inputMethod, setInputMethod] = useState<'bills' | 'manual'>('bills');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedField[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showManualSystem, setShowManualSystem] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [batteryCount, setBatteryCount] = useState(342);
  
  // Form data - moved here to avoid hooks violation
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
    shading: 0,
    
    // Additional site data from OCR
    address: '',
    latitude: undefined,
    longitude: undefined
  });
  
  // Listen for OCR completion to auto-advance
  useEffect(() => {
    const handleOCRCompleted = (event: any) => {
      const { mode: eventMode, fieldsExtracted } = event.detail;
      console.log(`🎯 OCR completed for ${eventMode} with ${fieldsExtracted} fields`);
      
      // Auto-advance to next step based on mode
      if (eventMode === 'bill' && fieldsExtracted > 0) {
        // Advance from bills step to system step
        setTimeout(() => nextStep(), 1000);
      } else if (eventMode === 'quote' && fieldsExtracted > 0) {
        // Advance from system step to site step
        setTimeout(() => nextStep(), 1000);
      }
    };

    window.addEventListener('ocrCompleted', handleOCRCompleted);
    return () => window.removeEventListener('ocrCompleted', handleOCRCompleted);
  }, []);

  // Auto-fetch battery count
  useEffect(() => {
    const fetchBatteryCount = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { count } = await supabase
          .from('batteries')
          .select('*', { count: 'exact', head: true });
        setBatteryCount(count || 342);
      } catch (error) {
        console.error('Error fetching battery count:', error);
        setBatteryCount(342);
      }
    };
    fetchBatteryCount();
  }, []);
  
  // Listen for plan selection from HowMuchCanISave
  useEffect(() => {
    subscribe("plan.selected", (event: any) => {
      if (event.plan) {
        setFormData(prev => ({
          ...prev,
          peakRate: event.plan.usage_c_per_kwh_peak || prev.peakRate,
          offPeakRate: event.plan.usage_c_per_kwh_offpeak || prev.offPeakRate,
          feedInTariff: event.plan.fit_c_per_kwh || prev.feedInTariff,
          dailySupply: event.plan.supply_c_per_day || prev.dailySupply,
        }));
        
        // Auto-advance to system step when plan is selected
        if (currentStep === 'bills') {
          setCurrentStep('system');
        }
      }
    });
  }, [currentStep]);

  const onDropBill = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    setProcessing(true);
    
    // Mock OCR processing
    setTimeout(() => {
      setProcessing(false);
      setExtractedData([
        { label: 'Daily Usage (kWh)', value: 25, confidence: 0.95, editable: true },
        { label: 'Peak Rate (c/kWh)', value: 28.6, confidence: 0.92, editable: true },
        { label: 'Off-Peak Rate (c/kWh)', value: 22.1, confidence: 0.91, editable: true },
        { label: 'Feed-in Tariff (c/kWh)', value: 8.2, confidence: 0.76, editable: true },
        { label: 'Daily Supply Charge (c)', value: 98.45, confidence: 0.94, editable: true },
      ]);
      setCurrentStep('system');
    }, 2000);
  }, []);

  const onDropQuote = useCallback((acceptedFiles: File[]) => {
    // Handle quote upload and extract system data
    console.log('Quote uploaded', acceptedFiles);
  }, []);

  const { getRootProps: getBillProps, getInputProps: getBillInputProps, isDragActive: isBillDragActive } = useDropzone({
    onDrop: onDropBill,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    }
  });

  const { getRootProps: getQuoteProps, getInputProps: getQuoteInputProps, isDragActive: isQuoteDragActive } = useDropzone({
    onDrop: onDropQuote,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    }
  });

  const { lastGoodResults } = useModelStore();
  
  // Mock battery ROI input for ML service
  const batteryInput = React.useMemo(() => ({
    usage_30min: Array.from({ length: 48 }, () => Math.random() * 2),
    tariff: {
      import: [{ price: formData.peakRate / 100, start: "00:00", end: "24:00" }],
      export: [{ price: formData.feedInTariff / 100, start: "00:00", end: "24:00" }]
    },
    battery_params: {
      capacity: formData.batterySize,
      power: formData.batterySize * 0.5, // Assume C/2 rate
      efficiency: 0.95
    },
    battery_size_kwh: formData.batterySize,
    system_size_kw: formData.solarSize,
    shading_index: formData.shading / 100,
    location: { postcode: formData.postcode }
  }), [formData]);

  const { data: roiData, isLoading: isCalculating, error: roiError } = useBatteryROI(batteryInput);

  if (!started) {
    return (
      <Banner
        title="Battery ROI Calculator"
        subtitle={`Analyze with ${batteryCount.toLocaleString()} battery models`}
        icon={Zap}
        variant="glassHolo"
      >
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <MetricTile
            title="Smart Bill Analysis"
            value="AI-Powered"
            subtitle="Upload bills for AI extraction of usage patterns & TOU rates"
            variant="glass"
          />
          <MetricTile
            title="ROI Optimization"
            value="Intelligent"
            subtitle="AI calculates optimal battery size for your energy profile"
            variant="glass"
          />
          <MetricTile
            title="Financial Analysis"
            value="Complete"
            subtitle="Payback period, savings projections, and ROI calculations"
            variant="glass"
          />
        </div>
        
        <Button
          onClick={() => setStarted(true)}
          size="lg"
          className={cn(tokens.buttonPrimary, "text-lg px-12 py-6 font-semibold")}
        >
          Start ROI Analysis
        </Button>
      </Banner>
    );
  }
  
  const steps = [
    { id: 'method', title: 'Input Method', icon: Upload },
    { id: 'bills', title: 'Energy Data', icon: FileText },
    { id: 'system', title: 'System Size', icon: Zap },
    { id: 'site', title: 'Site Details', icon: Home },
    { id: 'results', title: 'ROI Analysis', icon: TrendingUp }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const nextStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStepId = steps[currentIndex + 1].id as Step;
      setCurrentStep(nextStepId);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      const prevStepId = steps[currentIndex - 1].id as Step;
      setCurrentStep(prevStepId);
    }
  };

  const handleFieldEdit = (index: number, newValue: string) => {
    const updatedData = [...extractedData];
    updatedData[index].value = newValue;
    setExtractedData(updatedData);
  };

  const calculateROI = () => {
    console.log('🧮 Starting Battery ROI calculation with data:', formData);
    setCurrentStep('results');
  };

  // Calculate mock results for display
  const mockResults = React.useMemo(() => {
    const annualSavings = formData.batterySize * 365 * (formData.peakRate - formData.offPeakRate) / 100;
    const paybackYears = formData.systemPrice / Math.max(annualSavings, 1000);
    const totalROI = (annualSavings * 10 - formData.systemPrice) / formData.systemPrice * 100;
    
    return {
      annual_savings_AUD: Math.round(annualSavings),
      payback_years: Math.round(paybackYears * 10) / 10,
      total_roi_percent: Math.round(totalROI)
    };
  }, [formData]);

  return (
    <div className="space-y-6">
      {/* Status Strip */}
      <StatusStrip
        model={roiData?.sourceModel || lastGoodResults?.battery_roi?.sourceModel || "battery_roi_v1"}
        version={roiData?.version || lastGoodResults?.battery_roi?.version || "1.0"}
        p95={roiData?.telemetry?.p95 || 95}
        delta={roiData?.telemetry?.delta || 1.8}
        error={roiError ? "Service unavailable" : undefined}
      />

      {/* ROI Results - Show when on results step */}
      {currentStep === 'results' && (
        <div className="grid md:grid-cols-3 gap-6">
          <MetricTile
            title="Annual Savings"
            value={roiData?.value?.annual_savings_AUD ? `$${roiData.value.annual_savings_AUD.toLocaleString()}` : `$${mockResults.annual_savings_AUD.toLocaleString()}`}
            subtitle="Battery storage savings"
          />
          <MetricTile
            title="Payback Period"
            value={roiData?.value?.payback_years ? `${roiData.value.payback_years} years` : `${mockResults.payback_years} years`}
            subtitle="Investment recovery time"
          />
          <MetricTile
            title="Total ROI"
            value={roiData?.value?.total_roi_percent ? `${roiData.value.total_roi_percent}%` : `${mockResults.total_roi_percent}%`}
            subtitle="20-year return on investment"
          />
        </div>
      )}

      {/* Selected Plan Integration */}
      {selectedPlan && (
        <Glass className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="font-medium">Using Selected Plan</p>
              <p className="text-sm text-muted-foreground">
                {selectedPlan.plan_name} - {selectedPlan.retailer}
              </p>
            </div>
          </div>
        </Glass>
      )}

      {/* Progress Header - Only show when started */}
      {currentStep !== 'method' && (
        <Glass className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Battery ROI Calculator</h2>
            <Badge variant="outline">{currentStepIndex + 1} of {steps.length}</Badge>
          </div>
          
          <Progress value={progress} className="mb-4 hologram-track" />
          
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
        </Glass>
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
          {/* Step 1: Input Method */}
          {currentStep === 'method' && (
            <Glass className="p-6">
              <h3 className="text-lg font-semibold mb-6">How would you like to input your data?</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <motion.button
                  onClick={() => {
                    setInputMethod('bills');
                    setCurrentStep('bills');
                  }}
                  className={`p-6 rounded-xl border text-left transition-all duration-200 ${
                    inputMethod === 'bills' 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Upload className="w-6 h-6 text-primary" />
                    <div>
                      <h4 className="font-medium">Upload Bills & Quotes</h4>
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
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Edit className="w-6 h-6 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">Manual Entry</h4>
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
            </Glass>
          )}

          {/* Step 2: Bills/Energy Data */}
          {currentStep === 'bills' && (
            <Glass className="p-6">
              <h3 className="text-lg font-semibold mb-6">Energy Usage & Rates</h3>
              
              {inputMethod === 'bills' ? (
                <div className="space-y-6">
                  <div 
                    {...getBillProps()} 
                    className={`
                      border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer
                      transition-all duration-200 hover:border-white/40 hover:bg-white/5
                      ${isBillDragActive ? 'border-primary/50 bg-primary/5' : ''}
                    `}
                  >
                    <input {...getBillInputProps()} />
                    <motion.div
                      animate={isBillDragActive ? { scale: 1.05 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-60" />
                      <h4 className="text-lg font-medium mb-2">
                        {isBillDragActive ? 'Drop your energy bill here' : 'Upload Energy Bill'}
                      </h4>
                      <p className="text-muted-foreground mb-4">
                        PDF, JPG, PNG • Automatically extracts usage and rates
                      </p>
                      <Button variant="outline" className="bg-white/5 border-white/20">
                        Choose Files
                      </Button>
                    </motion.div>
                  </div>

                  {processing && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Processing your energy bill...</p>
                    </div>
                  )}

                  {extractedData.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Extracted Data - Please Review</h4>
                      {extractedData.map((field, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
                          <div className="flex-1">
                            <Label className="text-sm font-medium">{field.label}</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                value={field.value}
                                onChange={(e) => handleFieldEdit(index, e.target.value)}
                                className="bg-transparent"
                              />
                              <Badge variant={field.confidence > 0.9 ? "default" : "secondary"}>
                                {Math.round(field.confidence * 100)}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dailyUsage">Daily Usage (kWh)</Label>
                      <Input
                        id="dailyUsage"
                        type="number"
                        value={formData.dailyUsage}
                        onChange={(e) => setFormData(prev => ({ ...prev, dailyUsage: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="peakRate">Peak Rate (c/kWh)</Label>
                      <Input
                        id="peakRate"
                        type="number"
                        step="0.1"
                        value={formData.peakRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, peakRate: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="offPeakRate">Off-Peak Rate (c/kWh)</Label>
                      <Input
                        id="offPeakRate"
                        type="number"
                        step="0.1"
                        value={formData.offPeakRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, offPeakRate: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="feedInTariff">Feed-in Tariff (c/kWh)</Label>
                      <Input
                        id="feedInTariff"
                        type="number"
                        step="0.1"
                        value={formData.feedInTariff}
                        onChange={(e) => setFormData(prev => ({ ...prev, feedInTariff: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dailySupply">Daily Supply Charge (c)</Label>
                      <Input
                        id="dailySupply"
                        type="number"
                        step="0.01"
                        value={formData.dailySupply}
                        onChange={(e) => setFormData(prev => ({ ...prev, dailySupply: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dayNightSplit">Day/Night Split (%)</Label>
                      <Slider
                        value={[formData.dayNightSplit]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, dayNightSplit: value[0] }))}
                        max={100}
                        step={5}
                        className="mt-2"
                      />
                      <div className="text-sm text-muted-foreground mt-1">
                        {formData.dayNightSplit}% day usage, {100 - formData.dayNightSplit}% night usage
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Glass>
          )}

          {/* Step 3: System Configuration */}
          {currentStep === 'system' && (
            <Glass className="p-6">
              <h3 className="text-lg font-semibold mb-6">System Configuration</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="solarSize">Solar System Size (kW)</Label>
                    <Input
                      id="solarSize"
                      type="number"
                      step="0.1"
                      value={formData.solarSize}
                      onChange={(e) => setFormData(prev => ({ ...prev, solarSize: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="batterySize">Battery Size (kWh)</Label>
                    <Input
                      id="batterySize"
                      type="number"
                      step="0.5"
                      value={formData.batterySize}
                      onChange={(e) => setFormData(prev => ({ ...prev, batterySize: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="systemPrice">System Price (AUD)</Label>
                    <Input
                      id="systemPrice"
                      type="number"
                      value={formData.systemPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, systemPrice: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      value={formData.postcode}
                      onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </Glass>
          )}

          {/* Step 4: Site Details */}
          {currentStep === 'site' && (
            <Glass className="p-6">
              <h3 className="text-lg font-semibold mb-6">Site Details</h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="roofTilt">Roof Tilt (degrees)</Label>
                  <Input
                    id="roofTilt"
                    type="number"
                    value={formData.roofTilt}
                    onChange={(e) => setFormData(prev => ({ ...prev, roofTilt: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="roofAzimuth">Roof Azimuth (degrees)</Label>
                  <Input
                    id="roofAzimuth"
                    type="number"
                    value={formData.roofAzimuth}
                    onChange={(e) => setFormData(prev => ({ ...prev, roofAzimuth: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="shading">Shading (%)</Label>
                  <Slider
                    value={[formData.shading]}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, shading: value[0] }))}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                  <div className="text-sm text-muted-foreground mt-1">
                    {formData.shading}% shading
                  </div>
                </div>
              </div>
            </Glass>
          )}

          {/* Step 5: Results */}
          {currentStep === 'results' && (
            <div className="space-y-6">
              <Glass className="p-6">
                <h3 className="text-lg font-semibold mb-6">Battery ROI Analysis</h3>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-medium mb-4">Financial Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Annual Savings</span>
                        <span className="font-medium text-green-600">
                          ${roiData?.value?.annual_savings_AUD?.toLocaleString() || mockResults.annual_savings_AUD.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payback Period</span>
                        <span className="font-medium">
                          {roiData?.value?.payback_years || mockResults.payback_years} years
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>20-Year ROI</span>
                        <span className="font-medium text-blue-600">
                          {roiData?.value?.total_roi_percent || mockResults.total_roi_percent}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-4">System Overview</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Solar System</span>
                        <span className="font-medium">{formData.solarSize} kW</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Battery Storage</span>
                        <span className="font-medium">{formData.batterySize} kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>System Cost</span>
                        <span className="font-medium">${formData.systemPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4 justify-center mt-8">
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                  <Button>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Get Quote
                  </Button>
                </div>
              </Glass>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      {currentStep !== 'method' && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={currentStepIndex === 0}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          {currentStep === 'results' ? (
            <Button onClick={() => console.log('Complete')}>
              Complete Analysis
            </Button>
          ) : currentStep === 'site' ? (
            <Button onClick={calculateROI}>
              <Calculator className="w-4 h-4 mr-2" />
              Calculate ROI
            </Button>
          ) : (
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}