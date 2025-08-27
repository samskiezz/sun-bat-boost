import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Eye, 
  CheckCircle,
  AlertCircle,
  Edit,
  ChevronRight,
  ChevronLeft,
  Calculator,
  Zap,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Battery,
  Sun,
  ArrowRight,
  RefreshCw,
  Award,
  Search,
  Settings,
  Brain,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import UniversalOCRScanner from './UniversalOCRScanner';
import ComprehensiveTrainingDashboard from './ComprehensiveTrainingDashboard';
import { ProductPickerForm } from './forms/ProductPickerForm';
import { QuickSizesForm } from './forms/QuickSizesForm';
import { ResultCards } from './ResultCards';
import { LimitLine } from './LimitLine';
import { Glass } from './Glass';
import { useDropzone } from 'react-dropzone';
import { SavingsWizard } from './SavingsWizard';
import { SavingsCTACard } from './SavingsCTACard';

interface ExtractedField {
  label: string;
  value: string | number;
  confidence: number;
  editable: boolean;
}

type Step = 'method' | 'system' | 'location' | 'results';

interface RebatesCalculatorProps {
  onCalculate: (formData: any) => void;
  results: any;
  eligibility: any;
  onRequestCall: () => void;
  appMode: any;
  userTier: 'free' | 'lite' | 'pro';
  unlimitedTokens: boolean;
}

export const RebatesCalculator: React.FC<RebatesCalculatorProps> = ({
  onCalculate,
  results,
  eligibility,
  onRequestCall,
  appMode,
  userTier,
  unlimitedTokens
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('method');
  const [inputMethod, setInputMethod] = useState<'upload' | 'picker' | 'manual'>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedField[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showTraining, setShowTraining] = useState(false);
  
  const isProUser = unlimitedTokens || userTier === 'pro';
  
  // Form data
  const [formData, setFormData] = useState({
    // System data
    solarKw: 6.5,
    batteryKwh: 13.5,
    systemType: 'solar-battery',
    
    // Location & install
    postcode: '2000',
    installDate: new Date().toISOString().split('T')[0],
    stcPrice: 38,
    vppProvider: 'None'
  });

  const steps = [
    { id: 'method', title: 'Input Method', icon: Upload },
    { id: 'system', title: 'System Details', icon: Zap },
    { id: 'location', title: 'Location & Date', icon: MapPin },
    { id: 'results', title: 'Rebate Results', icon: Award }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const onDropQuote = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    setProcessing(true);
    
    // Mock OCR processing
    setTimeout(() => {
      setProcessing(false);
      setExtractedData([
        { label: 'Solar System Size (kW)', value: 6.6, confidence: 0.95, editable: true },
        { label: 'Battery Size (kWh)', value: 13.5, confidence: 0.92, editable: true },
        { label: 'Postcode', value: '2000', confidence: 0.98, editable: true },
        { label: 'Install Date', value: '2025-03-15', confidence: 0.89, editable: true },
        { label: 'Total System Cost', value: 25000, confidence: 0.87, editable: true },
      ]);
      
      // Auto-populate form data
      setFormData(prev => ({
        ...prev,
        solarKw: 6.6,
        batteryKwh: 13.5,
        postcode: '2000',
        installDate: '2025-03-15'
      }));
      
      setCurrentStep('location');
    }, 2000);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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

  const calculateRebates = () => {
    const calculationData = {
      mode: inputMethod,
      postcode: formData.postcode,
      solarKw: formData.solarKw,
      batteryKwh: formData.batteryKwh,
      installDate: formData.installDate,
      stcPrice: formData.stcPrice,
      vppProvider: formData.vppProvider,
      extractedData: extractedData.length > 0 ? extractedData : undefined
    };
    
    onCalculate(calculationData);
    setCurrentStep('results');
  };

  return (
    <div className="space-y-6">
      {/* Pro Features */}
      {isProUser && (
        <Glass className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">AI Tools</h3>
              <Badge variant="default" className="bg-gradient-primary">Pro</Badge>
            </div>
            <Button
              variant={showTraining ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTraining(!showTraining)}
              className="bg-white/5 border-white/20"
            >
              <Eye className="w-4 h-4 mr-1" />
              {showTraining ? 'Hide' : 'Show'} Training Dashboard
            </Button>
          </div>
          
          {showTraining && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <ComprehensiveTrainingDashboard />
            </div>
          )}
        </Glass>
      )}

      {/* Progress Header */}
      <Glass className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Australian Solar Rebates Calculator</h2>
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
              <h3 className="text-lg font-semibold mb-6">How would you like to calculate your rebates?</h3>
              
              <div className="grid gap-6">
                <motion.button
                  onClick={() => {
                    setInputMethod('upload');
                    setCurrentStep('system');
                  }}
                  className={`p-6 rounded-xl border text-left transition-all duration-200 ${
                    inputMethod === 'upload' 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-4">
                    <Upload className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-lg">Upload Solar Quote</h4>
                        <Badge variant="default" className="bg-gradient-primary">Recommended</Badge>
                        {isProUser && (
                          <Badge variant="secondary">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Enhanced OCR
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Upload your solar quote or proposal for automatic system detection and accurate rebate calculations.
                      </p>
                      <div className="flex items-center text-sm text-primary">
                        <span>Most accurate • Instant results • CEC verified products</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </div>
                    </div>
                  </div>
                </motion.button>

                <div className="grid md:grid-cols-2 gap-4">
                  <motion.button
                    onClick={() => {
                      setInputMethod('picker');
                      setCurrentStep('system');
                    }}
                    className={`p-6 rounded-xl border text-left transition-all duration-200 ${
                      inputMethod === 'picker' 
                        ? 'border-primary/50 bg-primary/5' 
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Search className="w-6 h-6 text-blue-500" />
                      <div>
                        <h4 className="font-medium">Product Picker</h4>
                        {isProUser && (
                          <Badge variant="secondary" className="mt-1">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Pro Features
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Browse and select specific solar panels and batteries from our CEC database.
                    </p>
                    <div className="flex items-center text-sm text-blue-500">
                      <span>Specific products</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() => {
                      setInputMethod('manual');
                      setCurrentStep('system');
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
                        <h4 className="font-medium">Quick Sizes</h4>
                        <Badge variant="outline" className="mt-1">Quick Entry</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Enter system sizes directly if you know your solar and battery specifications.
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span>Manual entry</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                  </motion.button>
                </div>
              </div>
            </Glass>
          )}

          {/* Step 2: System Details */}
          {currentStep === 'system' && (
            <Glass className="p-6">
              <h3 className="text-lg font-semibold mb-6">System Configuration</h3>
              
              {inputMethod === 'upload' ? (
                <div className="space-y-6">
                  <div 
                    {...getRootProps()} 
                    className={`
                      border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer
                      transition-all duration-200 hover:border-white/40 hover:bg-white/5
                      ${isDragActive ? 'border-primary/50 bg-primary/5' : ''}
                    `}
                  >
                    <input {...getInputProps()} />
                    <motion.div
                      animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-60" />
                      <h4 className="text-lg font-medium mb-2">
                        {isDragActive ? 'Drop your solar quote here' : 'Upload Solar Quote or Proposal'}
                      </h4>
                      <p className="text-muted-foreground mb-4">
                        PDF, JPG, PNG • Automatically extracts system details and pricing
                      </p>
                      <Button variant="outline" className="bg-white/5 border-white/20">
                        Choose File
                      </Button>
                    </motion.div>
                  </div>

                  {processing && (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin opacity-60" />
                      <p className="text-muted-foreground">Processing your solar quote...</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {isProUser ? 'Using enhanced AI models for maximum accuracy' : 'Extracting system details'}
                      </p>
                    </div>
                  )}

                  {extractedData.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <h4 className="font-medium">Extracted System Details</h4>
                        <Badge variant="default">Review & Confirm</Badge>
                      </div>
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
                </div>
              ) : inputMethod === 'picker' ? (
                <ProductPickerForm onSubmit={onCalculate} appMode={appMode} />
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <Label>System Type</Label>
                        <Select value={formData.systemType} onValueChange={(value) => setFormData(prev => ({ ...prev, systemType: value }))}>
                          <SelectTrigger className="bg-white/5 border-white/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solar-only">Solar Only</SelectItem>
                            <SelectItem value="battery-only">Battery Only</SelectItem>
                            <SelectItem value="solar-battery">Solar + Battery</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(formData.systemType === 'solar-only' || formData.systemType === 'solar-battery') && (
                        <div>
                          <Label>Solar System Size: {formData.solarKw} kW</Label>
                          <div className="hologram-track">
                            <Slider
                              value={[formData.solarKw]}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, solarKw: value[0] }))}
                              max={20}
                              min={1}
                              step={0.1}
                              className="mt-2"
                            />
                          </div>
                        </div>
                      )}

                      {(formData.systemType === 'battery-only' || formData.systemType === 'solar-battery') && (
                        <div>
                          <Label>Battery Size: {formData.batteryKwh} kWh</Label>
                          <div className="hologram-track">
                            <Slider
                              value={[formData.batteryKwh]}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, batteryKwh: value[0] }))}
                              max={30}
                              min={0}
                              step={0.5}
                              className="mt-2"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-lg bg-white/5">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        System Size Guide
                      </h4>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <div className="flex justify-between">
                          <span>Small home:</span>
                          <span>3-6kW + 10kWh</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Medium home:</span>
                          <span>6-10kW + 13kWh</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Large home:</span>
                          <span>10kW+ + 20kWh+</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Glass>
          )}

          {/* Step 3: Location & Date */}
          {currentStep === 'location' && (
            <Glass className="p-6">
              <h3 className="text-lg font-semibold mb-6">Installation Details</h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label>Postcode</Label>
                    <Input
                      value={formData.postcode}
                      onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
                      placeholder="e.g., 2000"
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                  
                  <div>
                    <Label>Install Date</Label>
                    <Input
                      type="date"
                      value={formData.installDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, installDate: e.target.value }))}
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                  
                  <div>
                    <Label>STC Price (AUD)</Label>
                    <Input
                      type="number"
                      value={formData.stcPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, stcPrice: parseFloat(e.target.value) || 38 }))}
                      className="bg-white/5 border-white/20"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Current market rate: $38</p>
                  </div>
                  
                  <div>
                    <Label>VPP Provider (Optional)</Label>
                    <Select value={formData.vppProvider} onValueChange={(value) => setFormData(prev => ({ ...prev, vppProvider: value }))}>
                      <SelectTrigger className="bg-white/5 border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">No VPP</SelectItem>
                        <SelectItem value="Tesla">Tesla Energy Plan</SelectItem>
                        <SelectItem value="AGL">AGL VPP</SelectItem>
                        <SelectItem value="Origin">Origin Loop</SelectItem>
                        <SelectItem value="EnergyAustralia">EnergyAustralia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-green-500/10 border border-blue-500/20">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-blue-500" />
                      Available Rebates
                    </h4>
                    <div className="text-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>Federal STC Rebate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>State Battery Rebate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>VPP Incentives</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5">
                    <h4 className="font-medium mb-2">System Summary</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {formData.solarKw > 0 && (
                        <div className="flex justify-between">
                          <span>Solar:</span>
                          <span>{formData.solarKw}kW</span>
                        </div>
                      )}
                      {formData.batteryKwh > 0 && (
                        <div className="flex justify-between">
                          <span>Battery:</span>
                          <span>{formData.batteryKwh}kWh</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Location:</span>
                        <span>{formData.postcode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Install:</span>
                        <span>{new Date(formData.installDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Glass>
          )}

          {/* Step 4: Results */}
          {currentStep === 'results' && (
            <div className="space-y-6">
              {results && <ResultCards results={results} />}
              
              {results && eligibility && (
                <div className="space-y-6">
                  <LimitLine 
                    status={eligibility.status}
                    reasons={eligibility.reasons}
                    suggestions={eligibility.suggestions}
                    onRequestCall={onRequestCall}
                  />
                  
                  <Glass className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      Figures use current published formulas and datasets.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Verified by a CEC-accredited designer before final quote.
                    </p>
                  </Glass>
                </div>
              )}
            </div>
          )}
        </motion.div>
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
          
          {currentStep === 'location' ? (
            <Button
              onClick={calculateRebates}
              className="bg-gradient-primary text-white"
            >
              <Calculator className="w-4 h-4 mr-1" />
              Calculate Rebates
            </Button>
          ) : currentStep === 'results' ? (
            <Button
              onClick={onRequestCall}
              className="bg-gradient-primary text-white"
            >
              <FileText className="w-4 h-4 mr-1" />
              Request Quote
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

export default RebatesCalculator;