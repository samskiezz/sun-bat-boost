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
  
  // Fetch battery count for display
  useEffect(() => {
    const fetchBatteryCount = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { count } = await supabase
          .from('batteries')
          .select('*', { count: 'exact', head: true });
        setBatteryCount(count || 342); // fallback to demo number
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

  if (!started) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-orange-400/30 to-amber-500/30 rounded-full blur-3xl"
            animate={{
              x: [0, 60, 0],
              y: [0, -25, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-1/3 right-1/3 w-48 h-48 bg-gradient-to-l from-yellow-400/25 to-orange-500/25 rounded-full blur-2xl"
            animate={{
              x: [0, -35, 0],
              y: [0, 45, 0],
              scale: [1, 0.8, 1],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-br from-red-400/20 to-orange-500/20 rounded-full blur-3xl"
            animate={{
              x: [0, 25, 0],
              y: [0, -55, 0],
              rotate: [0, 270, 360],
            }}
            transition={{
              duration: 11,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-12 shadow-2xl"
          >
            {/* Header */}
            <motion.div 
              className="flex items-center justify-center gap-4 mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-600/20 border border-orange-400/30 backdrop-blur-sm">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  🔋
                </motion.div>
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-orange-100 to-amber-300 bg-clip-text text-transparent">
                  Battery ROI Calculator
                </h1>
                <p className="text-lg text-orange-100 mt-2">
                  Analyze with <motion.span 
                    className="font-semibold text-orange-300"
                    animate={{ color: ["#fed7aa", "#fb923c", "#fed7aa"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {batteryCount.toLocaleString()}
                  </motion.span> battery models
                </p>
              </div>
            </motion.div>

            {/* Description */}
            <motion.p 
              className="text-xl text-white/80 mb-12 leading-relaxed max-w-3xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              Get comprehensive ROI analysis for your battery investment with our AI-powered calculator
            </motion.p>

            {/* Feature Cards */}
            <motion.div 
              className="grid md:grid-cols-3 gap-6 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <motion.div 
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-400/30 w-fit mx-auto mb-4">
                  📄
                </div>
                <h3 className="text-lg font-semibold mb-3 text-white">Smart Bill Analysis</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  Upload your electricity bill for AI-powered extraction of usage patterns, TOU rates, and tariff details
                </p>
              </motion.div>

              <motion.div 
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-600/20 border border-orange-400/30 w-fit mx-auto mb-4">
                  ⚡
                </div>
                <h3 className="text-lg font-semibold mb-3 text-white">ROI Optimization</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  AI calculates optimal battery size based on your energy profile, or upload your battery quote
                </p>
              </motion.div>

              <motion.div 
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-400/30 w-fit mx-auto mb-4">
                  💰
                </div>
                <h3 className="text-lg font-semibold mb-3 text-white">Financial Analysis</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  Complete payback period, savings projections, and total return on investment calculations
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
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-lg px-12 py-6 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                Start ROI Analysis
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
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
      setCurrentStep(steps[currentIndex + 1].id as Step);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as Step);
    }
  };

  const handleFieldEdit = (index: number, newValue: string) => {
    const updatedData = [...extractedData];
    updatedData[index].value = newValue;
    setExtractedData(updatedData);
  };

  const calculateROI = () => {
    setCurrentStep('results');
  };

  return (
    <div className="space-y-6">
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
                        Choose File
                      </Button>
                    </motion.div>
                  </div>

                  {extractedData.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Extracted Data (Review & Edit)</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        {extractedData.map((field, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">{field.label}</Label>
                              <div className="flex items-center gap-2">
                                {field.confidence >= 0.9 ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-amber-500" />
                                )}
                                <Badge variant={field.confidence >= 0.8 ? "default" : "destructive"} className="text-xs">
                                  {Math.round(field.confidence * 100)}%
                                </Badge>
                              </div>
                            </div>
                            <Input
                              value={field.value}
                              onChange={(e) => handleFieldEdit(index, e.target.value)}
                              className="bg-white/5 border-white/20"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {processing && (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin opacity-60" />
                      <p className="text-muted-foreground">Processing your energy bill...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <Label>Daily Usage (kWh)</Label>
                      <Input
                        type="number"
                        value={formData.dailyUsage}
                        onChange={(e) => setFormData(prev => ({ ...prev, dailyUsage: parseFloat(e.target.value) }))}
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div>
                      <Label>Peak Rate (c/kWh)</Label>
                      <Input
                        type="number"
                        value={formData.peakRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, peakRate: parseFloat(e.target.value) }))}
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div>
                      <Label>Off-Peak Rate (c/kWh)</Label>
                      <Input
                        type="number"
                        value={formData.offPeakRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, offPeakRate: parseFloat(e.target.value) }))}
                        className="bg-white/5 border-white/20"
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
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div>
                      <Label>Daily Supply Charge (c)</Label>
                      <Input
                        type="number"
                        value={formData.dailySupply}
                        onChange={(e) => setFormData(prev => ({ ...prev, dailySupply: parseFloat(e.target.value) }))}
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div>
                      <Label>Day/Night Usage Split: {formData.dayNightSplit}% day</Label>
                      <div className="hologram-track">
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
                </div>
              )}
            </Glass>
          )}

          {currentStep === 'system' && (
            <Glass className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">System Configuration</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualSystem(!showManualSystem)}
                  className="bg-white/5 border-white/20"
                >
                  {showManualSystem ? 'Upload Quote' : 'Manual Entry'}
                </Button>
              </div>

              {!showManualSystem ? (
                <div 
                  {...getQuoteProps()} 
                  className={`
                    border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer
                    transition-all duration-200 hover:border-white/40 hover:bg-white/5
                    ${isQuoteDragActive ? 'border-primary/50 bg-primary/5' : ''}
                  `}
                >
                  <input {...getQuoteInputProps()} />
                  <motion.div
                    animate={isQuoteDragActive ? { scale: 1.05 } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 opacity-60" />
                    <h4 className="text-lg font-medium mb-2">
                      {isQuoteDragActive ? 'Drop your solar quote here' : 'Upload Solar Quote'}
                    </h4>
                    <p className="text-muted-foreground mb-4">
                      PDF, JPG, PNG • Extracts system size and pricing automatically
                    </p>
                    <Button variant="outline" className="bg-white/5 border-white/20">
                      Choose File
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <Label>Solar System Size: {formData.solarSize}kW</Label>
                      <div className="hologram-track">
                        <Slider
                          value={[formData.solarSize]}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, solarSize: value[0] }))}
                          max={20}
                          min={3}
                          step={0.5}
                          className="mt-2"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Battery Size: {formData.batterySize}kWh</Label>
                      <div className="hologram-track">
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
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Total System Price ($)</Label>
                      <Input
                        type="number"
                        value={formData.systemPrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, systemPrice: parseFloat(e.target.value) }))}
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    
                    <div className="p-4 bg-white/5 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        System includes {formData.solarSize}kW solar + {formData.batterySize}kWh battery
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Glass>
          )}

          {/* Site Step */}
          {currentStep === 'site' && (
            <Glass className="p-6">
              <ComprehensiveShadeAnalyzer
                billData={{
                  address: formData.address,
                  postcode: formData.postcode
                }}
                proposalData={{
                  roofTilt: formData.roofTilt,
                  roofAzimuth: formData.roofAzimuth,
                  shadingFactor: formData.shading
                }}
                onFinalDataUpdate={(siteData) => {
                  setFormData(prev => ({
                    ...prev,
                    address: siteData.address || prev.address,
                    postcode: siteData.postcode || prev.postcode,
                    roofTilt: siteData.roofTilt || prev.roofTilt,
                    roofAzimuth: siteData.roofAzimuth || prev.roofAzimuth,
                    shading: siteData.shadingFactor || prev.shading,
                    latitude: siteData.latitude || prev.latitude,
                    longitude: siteData.longitude || prev.longitude
                  }));
                }}
              />
            </Glass>
          )}

          {currentStep === 'results' && (
            <div className="space-y-6">
              <Glass className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold">Battery ROI Analysis</h3>
                </div>
                
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-2xl font-bold text-emerald-500">$2,450</p>
                    <p className="text-sm text-muted-foreground">Annual Savings</p>
                  </div>
                  
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold text-blue-500">8.2 years</p>
                    <p className="text-sm text-muted-foreground">Payback Period</p>
                  </div>
                  
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <PieChart className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold text-purple-500">15.8%</p>
                    <p className="text-sm text-muted-foreground">IRR</p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-white/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Excellent Investment Opportunity</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your battery system shows strong financial returns with a payback period under 10 years and healthy ongoing savings.
                      </p>
                    </div>
                  </div>
                </div>
              </Glass>
              
              <SavingsWizard />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {currentStep !== 'results' && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 'method'}
            className="bg-white/5 border-white/20"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          {currentStep === 'site' ? (
            <Button onClick={calculateROI} className="bg-gradient-to-r from-primary to-secondary">
              Calculate ROI
              <Calculator className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={currentStep === 'method' && !inputMethod}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}