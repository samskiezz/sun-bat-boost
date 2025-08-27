import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Zap,
  Home,
  Target,
  Brain,
  BarChart3,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Download,
  Share,
  RefreshCw,
  Plus,
  Minus,
  Car,
  Settings,
  AlertCircle,
  CheckCircle
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

interface SavingsScenario {
  currentSetup: {
    retailer: string;
    plan: string;
    meterType: 'TOU' | 'Single' | 'Demand';
    hasEV: boolean;
    evKwhPerDay: number;
    currentSystem: 'none' | 'solar' | 'solar-battery';
    pvSize: number;
    batterySize: number;
    batteryPower: number;
  };
  goals: {
    objective: 'min-payback' | 'max-savings' | 'balanced' | 'budget-cap' | 'target-payback';
    budgetCap: number;
    targetPayback: number;
    roofLimits: boolean;
    exportCap: number;
  };
  recommendations: {
    pvSize: number;
    batterySize: number;
    batteryPower: number;
    planSwitch: string;
    rationale: string[];
  };
  results: {
    billBefore: number;
    billAfter: number;
    annualSavings: number;
    paybackYears: number;
    npv: number;
    irr: number;
    selfConsumption: number;
    exportPercent: number;
    batteryCycles: number;
    co2Reduction: number;
  };
}

type WizardStep = 'current-setup' | 'goals' | 'auto-design' | 'results';

interface SavingsWizardProps {
  onApplyToROI?: (scenario: SavingsScenario) => void;
  className?: string;
}

export const SavingsWizard: React.FC<SavingsWizardProps> = ({ onApplyToROI, className = '' }) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('current-setup');
  const [scenario, setScenario] = useState<SavingsScenario>({
    currentSetup: {
      retailer: '',
      plan: '',
      meterType: 'TOU',
      hasEV: false,
      evKwhPerDay: 0,
      currentSystem: 'none',
      pvSize: 0,
      batterySize: 0,
      batteryPower: 0,
    },
    goals: {
      objective: 'balanced',
      budgetCap: 30000,
      targetPayback: 7,
      roofLimits: false,
      exportCap: 5,
    },
    recommendations: {
      pvSize: 6.6,
      batterySize: 13.5,
      batteryPower: 5,
      planSwitch: '',
      rationale: [],
    },
    results: {
      billBefore: 2400,
      billAfter: 680,
      annualSavings: 1720,
      paybackYears: 6.8,
      npv: 12500,
      irr: 15.2,
      selfConsumption: 85,
      exportPercent: 15,
      batteryCycles: 320,
      co2Reduction: 4.2,
    },
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [ocrHistory, setOCRHistory] = useState<any[]>([]);

  const steps: { key: WizardStep; title: string; icon: React.ReactNode }[] = [
    { key: 'current-setup', title: 'Current Setup', icon: <Home className="w-5 h-5" /> },
    { key: 'goals', title: 'Goals & Constraints', icon: <Target className="w-5 h-5" /> },
    { key: 'auto-design', title: 'Auto-Design', icon: <Brain className="w-5 h-5" /> },
    { key: 'results', title: 'Results', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  const getCurrentStepIndex = () => steps.findIndex(step => step.key === currentStep);
  const progress = ((getCurrentStepIndex() + 1) / steps.length) * 100;

  const onDropBill = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    setProcessing(true);
    
    // Simulate OCR processing
    setTimeout(() => {
      setProcessing(false);
      // Mock extracted data
      setScenario(prev => ({
        ...prev,
        currentSetup: {
          ...prev.currentSetup,
          retailer: 'AGL',
          plan: 'Solar Savers',
          meterType: 'TOU',
        }
      }));
    }, 2000);
  }, []);

  const { getRootProps: getBillProps, getInputProps: getBillInputProps, isDragActive: isBillDragActive } = useDropzone({
    onDrop: onDropBill,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    multiple: true
  });

  const handleAutoDesign = () => {
    setProcessing(true);
    // Simulate ML optimization
    setTimeout(() => {
      setProcessing(false);
      setScenario(prev => ({
        ...prev,
        recommendations: {
          pvSize: 8.8,
          batterySize: 16.2,
          batteryPower: 6.4,
          planSwitch: 'Origin Solar Boost',
          rationale: [
            'Optimal PV size for roof space and shading',
            'Battery sized for 80% TOU avoidance',
            'Plan switch saves additional $280/year',
            'Expected 310 cycles/year within warranty'
          ]
        }
      }));
      setCurrentStep('results');
    }, 3000);
  };

  const nextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key);
    }
  };

  const prevStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key);
    }
  };

  const renderCurrentSetup = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Bill Upload Section */}
      <Glass className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold">Energy Bill Upload</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Area */}
          <div>
            <div
              {...getBillProps()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${isBillDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              `}
            >
              <input {...getBillInputProps()} />
              <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Drop your latest energy bill</p>
              <p className="text-muted-foreground mb-4">PDF, JPG, PNG supported</p>
              <Button variant="outline" type="button">
                Choose Files
              </Button>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4" />
                    <span>{file.name}</span>
                    {processing ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* OCR History */}
          <div>
            <h4 className="font-medium mb-3">Recent Bills</h4>
            <div className="space-y-2">
              {['AGL March 2024', 'Origin February 2024', 'AGL January 2024'].map((bill, index) => (
                <button
                  key={index}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  onClick={() => {
                    setScenario(prev => ({
                      ...prev,
                      currentSetup: {
                        ...prev.currentSetup,
                        retailer: bill.split(' ')[0],
                        plan: 'Solar Savers'
                      }
                    }));
                  }}
                >
                  <div className="font-medium">{bill}</div>
                  <div className="text-sm text-muted-foreground">TOU • $420.50</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Manual Fallback */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-4">Manual Entry (Fallback)</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="retailer">Retailer</Label>
              <Input
                id="retailer"
                placeholder="e.g., AGL, Origin"
                value={scenario.currentSetup.retailer}
                onChange={(e) => setScenario(prev => ({
                  ...prev,
                  currentSetup: { ...prev.currentSetup, retailer: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="plan">Plan Name</Label>
              <Input
                id="plan"
                placeholder="e.g., Solar Savers"
                value={scenario.currentSetup.plan}
                onChange={(e) => setScenario(prev => ({
                  ...prev,
                  currentSetup: { ...prev.currentSetup, plan: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="meter-type">Meter Type</Label>
              <Select
                value={scenario.currentSetup.meterType}
                onValueChange={(value: 'TOU' | 'Single' | 'Demand') => 
                  setScenario(prev => ({
                    ...prev,
                    currentSetup: { ...prev.currentSetup, meterType: value }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOU">Time of Use (TOU)</SelectItem>
                  <SelectItem value="Single">Single Rate</SelectItem>
                  <SelectItem value="Demand">Demand</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Glass>

      {/* Current System */}
      <Glass className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold">Current System</h3>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-3 block">What do you currently have?</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'none', label: 'No Solar', icon: Home },
                { key: 'solar', label: 'Solar Only', icon: Zap },
                { key: 'solar-battery', label: 'Solar + Battery', icon: Sparkles }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={`
                    p-4 rounded-xl border-2 transition-all text-center
                    ${scenario.currentSetup.currentSystem === key 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  onClick={() => setScenario(prev => ({
                    ...prev,
                    currentSetup: { ...prev.currentSetup, currentSystem: key as any }
                  }))}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="font-medium">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {scenario.currentSetup.currentSystem !== 'none' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pv-size">Solar System Size (kW)</Label>
                  <Input
                    id="pv-size"
                    type="number"
                    step="0.1"
                    value={scenario.currentSetup.pvSize}
                    onChange={(e) => setScenario(prev => ({
                      ...prev,
                      currentSetup: { ...prev.currentSetup, pvSize: parseFloat(e.target.value) || 0 }
                    }))}
                  />
                </div>
                {scenario.currentSetup.currentSystem === 'solar-battery' && (
                  <div>
                    <Label htmlFor="battery-size">Battery Size (kWh)</Label>
                    <Input
                      id="battery-size"
                      type="number"
                      step="0.1"
                      value={scenario.currentSetup.batterySize}
                      onChange={(e) => setScenario(prev => ({
                        ...prev,
                        currentSetup: { ...prev.currentSetup, batterySize: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* EV Section */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-3 mb-4">
              <Car className="w-5 h-5 text-primary" />
              <Label className="text-base font-medium">Electric Vehicle</Label>
              <button
                className={`
                  px-3 py-1 rounded-full text-sm transition-all
                  ${scenario.currentSetup.hasEV 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                  }
                `}
                onClick={() => setScenario(prev => ({
                  ...prev,
                  currentSetup: { ...prev.currentSetup, hasEV: !prev.currentSetup.hasEV }
                }))}
              >
                {scenario.currentSetup.hasEV ? 'Yes' : 'No'}
              </button>
            </div>

            {scenario.currentSetup.hasEV && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="ev-usage">Daily EV Usage (kWh/day)</Label>
                  <Slider
                    value={[scenario.currentSetup.evKwhPerDay]}
                    onValueChange={(value) => setScenario(prev => ({
                      ...prev,
                      currentSetup: { ...prev.currentSetup, evKwhPerDay: value[0] }
                    }))}
                    max={50}
                    step={1}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>0 kWh</span>
                    <span className="font-medium">{scenario.currentSetup.evKwhPerDay} kWh</span>
                    <span>50 kWh</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </Glass>
    </motion.div>
  );

  const renderGoals = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <Glass className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold">Your Objective</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { key: 'min-payback', label: 'Min Payback', desc: 'Fastest return on investment' },
            { key: 'max-savings', label: 'Max Bill Reduction', desc: 'Biggest annual savings' },
            { key: 'balanced', label: 'Balanced', desc: 'Best overall value' },
            { key: 'budget-cap', label: 'Budget Cap', desc: 'Stay within budget' },
            { key: 'target-payback', label: 'Target Payback', desc: 'Specific payback period' }
          ].map(({ key, label, desc }) => (
            <button
              key={key}
              className={`
                p-4 rounded-xl border-2 transition-all text-left
                ${scenario.goals.objective === key 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
                }
              `}
              onClick={() => setScenario(prev => ({
                ...prev,
                goals: { ...prev.goals, objective: key as any }
              }))}
            >
              <div className="font-medium">{label}</div>
              <div className="text-sm text-muted-foreground mt-1">{desc}</div>
            </button>
          ))}
        </div>

        {scenario.goals.objective === 'budget-cap' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6"
          >
            <Label htmlFor="budget-cap">Budget Cap (AUD)</Label>
            <Input
              id="budget-cap"
              type="number"
              value={scenario.goals.budgetCap}
              onChange={(e) => setScenario(prev => ({
                ...prev,
                goals: { ...prev.goals, budgetCap: parseInt(e.target.value) || 0 }
              }))}
            />
          </motion.div>
        )}

        {scenario.goals.objective === 'target-payback' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6"
          >
            <Label htmlFor="target-payback">Target Payback (Years)</Label>
            <Input
              id="target-payback"
              type="number"
              step="0.1"
              value={scenario.goals.targetPayback}
              onChange={(e) => setScenario(prev => ({
                ...prev,
                goals: { ...prev.goals, targetPayback: parseFloat(e.target.value) || 0 }
              }))}
            />
          </motion.div>
        )}
      </Glass>

      <Glass className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold">Constraints (Optional)</h3>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Roof/Space Limits</Label>
              <button
                className={`
                  px-3 py-1 rounded-full text-sm transition-all
                  ${scenario.goals.roofLimits 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                  }
                `}
                onClick={() => setScenario(prev => ({
                  ...prev,
                  goals: { ...prev.goals, roofLimits: !prev.goals.roofLimits }
                }))}
              >
                {scenario.goals.roofLimits ? 'Apply' : 'None'}
              </button>
            </div>

            {scenario.goals.roofLimits && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="export-cap">Export Limit (kW)</Label>
                  <Input
                    id="export-cap"
                    type="number"
                    step="0.1"
                    value={scenario.goals.exportCap}
                    onChange={(e) => setScenario(prev => ({
                      ...prev,
                      goals: { ...prev.goals, exportCap: parseFloat(e.target.value) || 0 }
                    }))}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </Glass>
    </motion.div>
  );

  const renderAutoDesign = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <Glass className="p-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Brain className="w-8 h-8 text-primary" />
          <h3 className="text-2xl font-semibold">AI-Powered System Design</h3>
        </div>

        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Our AI will analyze your energy usage, goals, and constraints to recommend the optimal solar and battery system for maximum savings.
        </p>

        {!processing ? (
          <Button 
            onClick={handleAutoDesign}
            size="lg" 
            className="bg-gradient-to-r from-primary to-primary-glow text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Sparkles className="w-6 h-6 mr-2" />
            Auto-Size PV & Battery
          </Button>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span className="text-lg font-medium">Optimizing your system...</span>
            </div>
            
            <div className="max-w-md mx-auto space-y-3">
              {[
                'Analyzing energy patterns',
                'Calculating PV generation',
                'Optimizing battery dispatch',
                'Comparing tariff plans',
                'Finalizing recommendations'
              ].map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.5 }}
                  className="flex items-center gap-3 text-left"
                >
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>{step}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </Glass>
    </motion.div>
  );

  const renderResults = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Recommendations */}
      <Glass className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold">Recommended System</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 border border-primary/20">
            <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{scenario.recommendations.pvSize} kW</div>
            <div className="text-sm text-muted-foreground">Solar System</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 border border-primary/20">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{scenario.recommendations.batterySize} kWh</div>
            <div className="text-sm text-muted-foreground">Battery Storage</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 border border-primary/20">
            <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{scenario.recommendations.batteryPower} kW</div>
            <div className="text-sm text-muted-foreground">Battery Power</div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-accent/50">
          <h4 className="font-medium mb-3">Why This Recommendation?</h4>
          <ul className="space-y-2">
            {scenario.recommendations.rationale.map((reason, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </Glass>

      {/* KPIs */}
      <Glass className="p-6">
        <h3 className="text-xl font-semibold mb-6">Financial Impact</h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">
              ${scenario.results.annualSavings.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Annual Savings</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">
              {scenario.results.paybackYears}
            </div>
            <div className="text-sm text-muted-foreground">Years Payback</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              ${scenario.results.npv.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">25-Year NPV</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {scenario.results.irr}%
            </div>
            <div className="text-sm text-muted-foreground">IRR</div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-medium mb-4">Bill Comparison</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Current Bill (Annual)</span>
                <span className="font-medium">${scenario.results.billBefore.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>With Solar + Battery</span>
                <span className="font-medium text-green-600">${scenario.results.billAfter.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Annual Savings</span>
                <span className="text-green-600">${scenario.results.annualSavings.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">System Performance</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Self-Consumption</span>
                <span className="font-medium">{scenario.results.selfConsumption}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Export to Grid</span>
                <span className="font-medium">{scenario.results.exportPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Battery Cycles/Year</span>
                <span className="font-medium">{scenario.results.batteryCycles}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>CO₂ Reduction</span>
                <span className="font-medium text-green-600">{scenario.results.co2Reduction}t</span>
              </div>
            </div>
          </div>
        </div>
      </Glass>

      {/* Actions */}
      <Glass className="p-6">
        <div className="flex flex-wrap gap-4 justify-center">
          {onApplyToROI && (
            <Button 
              onClick={() => onApplyToROI(scenario)}
              size="lg"
              className="bg-gradient-to-r from-primary to-primary-glow text-white px-6 py-3"
            >
              <ChevronRight className="w-5 h-5 mr-2" />
              Apply to ROI Calculator
            </Button>
          )}
          <Button variant="outline" size="lg" className="px-6 py-3">
            <Download className="w-5 h-5 mr-2" />
            Export PDF Report
          </Button>
          <Button variant="outline" size="lg" className="px-6 py-3">
            <Share className="w-5 h-5 mr-2" />
            Share Results
          </Button>
        </div>
      </Glass>
    </motion.div>
  );

  return (
    <div className={`max-w-6xl mx-auto space-y-8 ${className}`}>
      {/* Progress Header */}
      <Glass className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">How much can I save? (Solar + Battery)</h2>
          <div className="text-sm text-muted-foreground">
            Step {getCurrentStepIndex() + 1} of {steps.length}
          </div>
        </div>
        
        <Progress value={progress} className="mb-4" />
        
        <div className="flex justify-between">
          {steps.map((step, index) => {
            const isActive = step.key === currentStep;
            const isCompleted = getCurrentStepIndex() > index;
            
            return (
              <div
                key={step.key}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                  ${isActive ? 'bg-primary text-primary-foreground' : 
                    isCompleted ? 'bg-green-100 text-green-800' : 
                    'text-muted-foreground'
                  }
                `}
              >
                {step.icon}
                <span className="font-medium hidden sm:inline">{step.title}</span>
              </div>
            );
          })}
        </div>
      </Glass>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {currentStep === 'current-setup' && renderCurrentSetup()}
        {currentStep === 'goals' && renderGoals()}
        {currentStep === 'auto-design' && renderAutoDesign()}
        {currentStep === 'results' && renderResults()}
      </AnimatePresence>

      {/* Navigation */}
      {currentStep !== 'results' && currentStep !== 'auto-design' && (
        <div className="flex justify-between">
          <Button
            onClick={prevStep}
            disabled={getCurrentStepIndex() === 0}
            variant="outline"
            size="lg"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={getCurrentStepIndex() === steps.length - 1}
            size="lg"
          >
            Next
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};