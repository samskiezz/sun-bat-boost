import React, { useState, useCallback } from 'react';
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
import { Glass } from './Glass';
import { useDropzone } from 'react-dropzone';
import { SavingsWizard } from './SavingsWizard';

interface ExtractedField {
  label: string;
  value: string | number;
  confidence: number;
  editable: boolean;
}

type Step = 'savings-wizard' | 'method' | 'bills' | 'system' | 'site' | 'results';

export const BatteryROICalculator: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('savings-wizard');
  const [inputMethod, setInputMethod] = useState<'bills' | 'manual'>('bills');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedField[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showManualSystem, setShowManualSystem] = useState(false);
  
  // Form data
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

  const steps: { key: Step; title: string; icon: React.ReactNode }[] = [
    { key: 'savings-wizard', title: 'Savings Wizard', icon: <Zap className="w-5 h-5" /> },
    { key: 'method', title: 'Method', icon: <Zap className="w-5 h-5" /> },
    { key: 'bills', title: 'Energy Data', icon: <FileText className="w-5 h-5" /> },
    { key: 'system', title: 'System Size', icon: <Calculator className="w-5 h-5" /> },
    { key: 'site', title: 'Site Details', icon: <Home className="w-5 h-5" /> },
    { key: 'results', title: 'ROI Analysis', icon: <TrendingUp className="w-5 h-5" /> },
  ];

  const getCurrentStepIndex = () => steps.findIndex(step => step.key === currentStep);
  const progress = ((getCurrentStepIndex() + 1) / steps.length) * 100;

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
      {/* Progress Header */}
      <Glass className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Battery ROI Calculator</h2>
          <Badge variant="outline">{getCurrentStepIndex() + 1} of {steps.length}</Badge>
        </div>
        
        <Progress value={progress} className="mb-4 hologram-track" />
        
        <div className="flex items-center justify-between text-sm">
          {steps.map((step, index) => {
            const isActive = step.key === currentStep;
            const isCompleted = getCurrentStepIndex() > index;
            
            return (
              <div 
                key={step.key}
                className={`flex items-center gap-2 ${
                  isActive ? 'text-primary' : isCompleted ? 'text-green-500' : 'text-muted-foreground'
                }`}
              >
                {step.icon}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            );
          })}
        </div>
      </Glass>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {currentStep === 'savings-wizard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <SavingsWizard onApplyToROI={(scenario) => {
              // Apply scenario data to ROI calculator
              setFormData(prev => ({
                ...prev,
                usage: scenario.results.billBefore / 12, // Monthly usage estimate
                retailer: scenario.currentSetup.retailer,
                plan: scenario.currentSetup.plan,
                systemSize: scenario.recommendations.pvSize,
                batterySize: scenario.recommendations.batterySize,
                batteryPower: scenario.recommendations.batteryPower
              }));
              setCurrentStep('site'); // Skip to site details after applying
            }} />
          </motion.div>
        )}
        {currentStep === 'method' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
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
          </motion.div>
        )}

        {currentStep === 'bills' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
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
          </motion.div>
        )}

        {currentStep === 'system' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
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
                      <Label>Solar System Size: {formData.solarSize} kW</Label>
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
                      <Label>Battery Size: {formData.batterySize} kWh</Label>
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
                      <Label>Total System Price (inc. GST)</Label>
                      <Input
                        type="number"
                        value={formData.systemPrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, systemPrice: parseFloat(e.target.value) }))}
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div className="p-4 rounded-lg bg-white/5">
                      <h4 className="font-medium mb-2">Quick Size Guide</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>• Small home (15-25 kWh/day): 6kW + 10kWh</p>
                        <p>• Medium home (25-35 kWh/day): 8kW + 13kWh</p>
                        <p>• Large home (35+ kWh/day): 10kW+ + 20kWh+</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Glass>
          </motion.div>
        )}

        {currentStep === 'site' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Glass className="p-6">
              <h3 className="text-lg font-semibold mb-6">Site & Location Details</h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label>Postcode</Label>
                    <Input
                      value={formData.postcode}
                      onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                  <div>
                    <Label>Roof Tilt (degrees)</Label>
                    <Input
                      type="number"
                      value={formData.roofTilt}
                      onChange={(e) => setFormData(prev => ({ ...prev, roofTilt: parseFloat(e.target.value) }))}
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Roof Direction (0° = North)</Label>
                    <Input
                      type="number"
                      value={formData.roofAzimuth}
                      onChange={(e) => setFormData(prev => ({ ...prev, roofAzimuth: parseFloat(e.target.value) }))}
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                  <div>
                    <Label>Shading Level</Label>
                    <Select value={formData.shading.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, shading: parseFloat(value) }))}>
                      <SelectTrigger className="bg-white/5 border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No shading (0%)</SelectItem>
                        <SelectItem value="10">Light shading (10%)</SelectItem>
                        <SelectItem value="20">Moderate shading (20%)</SelectItem>
                        <SelectItem value="30">Heavy shading (30%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Glass>
          </motion.div>
        )}

        {currentStep === 'results' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="space-y-6">
              <Glass className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">ROI Analysis Results</h3>
                </div>
                
                <div className="grid gap-6 md:grid-cols-4">
                  <div className="text-center p-4 rounded-lg bg-white/5">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <div className="text-2xl font-bold">8.2</div>
                    <div className="text-sm text-muted-foreground">Years Payback</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-white/5">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold">$2,840</div>
                    <div className="text-sm text-muted-foreground">Annual Savings</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-white/5">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                    <div className="text-2xl font-bold">$47,200</div>
                    <div className="text-sm text-muted-foreground">25-Year NPV</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-white/5">
                    <PieChart className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                    <div className="text-2xl font-bold">78%</div>
                    <div className="text-sm text-muted-foreground">Self Consumption</div>
                  </div>
                </div>
              </Glass>

              <Glass className="p-6">
                <h4 className="font-semibold mb-4">Detailed Analysis</h4>
                <div className="h-64 flex items-center justify-center border border-white/10 rounded-lg bg-white/5">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p>Interactive charts and detailed breakdown</p>
                    <p className="text-sm">(Coming soon)</p>
                  </div>
                </div>
              </Glass>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <Glass className="p-4">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="bg-white/5 border-white/20"
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
              className="bg-gradient-primary text-white"
            >
              <Calculator className="w-4 h-4 mr-1" />
              Calculate ROI
            </Button>
          ) : currentStep === 'results' ? (
            <Button
              variant="outline"
              className="bg-white/5 border-white/20"
            >
              <Download className="w-4 h-4 mr-1" />
              Export Report
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={currentStepIndex === steps.length - 1}
              className="bg-gradient-primary text-white"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </Glass>
    </div>
  );
};

export default BatteryROICalculator;