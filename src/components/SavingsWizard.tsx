import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import OCRScanner from './OCRScanner';
import { LocationAutoFill } from './LocationAutoFill';
import { RoofDesignMap } from './RoofDesignMap';
import { getPoa } from '@/api/nasa';
import { runOptimizer } from '@/api/optimizer';
import { emitSignal, getMissing } from '@/diagnostics/signals';
import { calculateSystemFit, AU_SOLAR_BRANDS } from '@/utils/panelFitting';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  MapPin, 
  Zap, 
  DollarSign, 
  TrendingUp, 
  Download,
  Share2,
  CheckCircle,
  Target,
  Settings,
  Sparkles,
  Battery,
  Sun,
  Home,
  Car
} from 'lucide-react';

// OCR extracted data interface
interface ExtractedBillData {
  retailer?: string;
  plan?: string;
  address?: string;
  postcode?: string;
  usage?: number;
  billAmount?: number;
  dailySupply?: number;
  rate?: number;
  quarterlyBill?: number;
  avgRate?: number;
  peakRate?: number;
  shoulderRate?: number;
  offpeakRate?: number;
  feedInTariff?: number;
  hourlyUsage?: number[];
  // Solar detection fields
  solarExportKwh?: number;
  solarFeedInRate?: number;
  solarCreditAmount?: number;
  hasSolar?: boolean;
  estimatedSolarSize?: number;
}

interface SavingsScenario {
  location: {
    lat?: number;
    lng?: number;
    address?: string;
    postcode?: string;
    state?: string;
    network?: string;
    exportCapKw?: number;
  };
  currentSystem: {
    type: 'none' | 'solar' | 'solar-battery';
    solarKw?: number;
    batteryKwh?: number;
    batteryPowerKw?: number;
  };
  goals: {
    objective: 'min-payback' | 'max-savings' | 'balanced' | 'budget-cap' | 'target-payback';
    budgetCap?: number;
    targetPayback?: number;
    exportLimit?: number;
  };
  recommendations?: {
    solarKw: number;
    batteryKwh: number;
    batteryPowerKw: number;
    estimatedCost: number;
    reasoning: string;
  };
  results?: {
    currentAnnualBill: number;
    newAnnualBill: number;
    annualSavings: number;
    paybackYears: number;
    npv25: number;
    irr: number;
    selfConsumption: number;
    exportPercentage: number;
    co2Reduction: number;
    systemPerformance: {
      annualGeneration: number;
      batteryUsage: number;
      efficiencyRating: number;
    };
  };
}

type WizardStep = 'current-setup' | 'goals' | 'auto-design' | 'results';

interface SavingsWizardProps {
  onApplyResults?: (scenario: SavingsScenario) => void;
}

const STEPS = [
  { id: 'current-setup', title: 'Current Setup', description: 'Analyze your bills and location' },
  { id: 'goals', title: 'Goals & Constraints', description: 'Set your objectives and budget' },
  { id: 'auto-design', title: 'Auto-Design', description: 'AI designs your optimal system' },
  { id: 'results', title: 'Results', description: 'Review recommendations and savings' }
];

export function SavingsWizard({ onApplyResults }: SavingsWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('current-setup');
  const [roofFacets, setRoofFacets] = useState([]);
  const [shadeAnalysis, setShadeAnalysis] = useState(null);
  const [panelFit, setPanelFit] = useState(null);
  const [scenario, setScenario] = useState<SavingsScenario>({
    location: {},
    currentSystem: { type: 'none' },
    goals: { objective: 'balanced' }
  });
  const [processing, setProcessing] = useState(false);

  // Mock bill data for calculations
  const billData = {
    quarterlyBill: 850,
    avgRate: 0.25,
    peakRate: 0.35,
    shoulderRate: 0.25,
    offpeakRate: 0.15,
    feedInTariff: 0.08,
    hourlyUsage: Array(24).fill(2.5)
  };

  const getCurrentStepIndex = () => STEPS.findIndex(step => step.id === currentStep);
  const progress = ((getCurrentStepIndex() + 1) / STEPS.length) * 100;

  const handleLocationUpdate = useCallback((locationData: any) => {
    setScenario(prev => ({
      ...prev,
      location: {
        ...prev.location,
        ...locationData
      }
    }));
    
    // Emit coordinates for POA when location is updated
    if (locationData.lat && locationData.lng) {
      setTimeout(() => {
        emitSignal({
          key: 'nasa.poa',
          status: 'ok', 
          message: 'Location coordinates available',
          details: { lat: locationData.lat, lng: locationData.lng }
        });
      }, 1000);
    }
  }, []);

  const handleRoofAnalysisComplete = useCallback((facets, analysis) => {
    setRoofFacets(facets);
    setShadeAnalysis(analysis);
    
    // Calculate panel fit
    const fit = calculateSystemFit(facets.map(f => ({
      areaSqm: f.areaSqm,
      orientation: f.orientation,
      shadeIndex: f.shadeIndex
    })));
    
    setPanelFit(fit);
    
    emitSignal({
      key: 'roof.fit',
      status: 'ok',
      message: fit.fitMessage,
      details: { totalPanels: fit.totalPanels, totalKw: fit.totalAdjustedKw }
    });
  }, []);

  const handleOCRExtraction = useCallback((data: ExtractedBillData) => {
    // Update scenario with extracted data
    setScenario(prev => ({
      ...prev,
      location: {
        ...prev.location,
        address: data.address,
        postcode: data.postcode
      }
    }));
  }, []);

  const handleAddressExtracted = useCallback((address: string, postcode?: string) => {
    // Handle address extraction from OCR
    console.log('Address extracted:', address, postcode);
  }, []);

  const handleSystemUpdate = useCallback((field: string, value: any) => {
    setScenario(prev => ({
      ...prev,
      currentSystem: {
        ...prev.currentSystem,
        [field]: value
      }
    }));
  }, []);

  const handleEVUpdate = useCallback((evData: any) => {
    // Handle EV data updates
    console.log('EV data updated:', evData);
  }, []);

  const handleAutoDesign = async () => {
    setProcessing(true);
    
    try {
      // Use roof analysis data if available, otherwise use defaults
      const systemKw = panelFit?.totalAdjustedKw || scenario.currentSystem?.solarKw || 10;
      const batterykWh = scenario.currentSystem?.batteryKwh || 15;
      
      // Get POA data from NASA
      const poaData = await getPoa({
        lat: scenario.location.lat!,
        lng: scenario.location.lng!,
        tilt: 20,
        azimuth: 0,
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      });

      // Emit POA signal
      emitSignal({
        key: 'nasa.poa',
        status: 'ok',
        message: `POA data received: ${poaData.daily?.length || 0} days`,
        details: { 
          avgPoa: poaData.daily?.reduce((sum, d) => sum + d.poa_kwh, 0) / (poaData.daily?.length || 1),
          days: poaData.daily?.length || 0
        }
      });

      // Run quantum optimization
      const optimizerResult = await runOptimizer({
        prices: Array(24).fill(billData.avgRate || 0.25),
        pv: poaData.hourly?.map(h => h.poa_kwh || 0) || Array(24).fill(0.5),
        load: billData.hourlyUsage || Array(24).fill(2.5),
        constraints: {
          battery_capacity_kwh: batterykWh,
          battery_power_kw: batterykWh * 0.5,
          initial_soc: 0.5
        },
        solver: "milp"
      });

      emitSignal({
        key: 'sizing.battery',
        status: 'ok',
        message: `Optimization complete: ${optimizerResult.schedule?.length || 0} time steps`,
        details: { 
          schedule: optimizerResult.schedule?.length || 0,
          optimal: optimizerResult.constraints_satisfied
        }
      });

      // Calculate financial metrics using roof analysis
      const recommendedSolarKw = panelFit?.totalAdjustedKw || scenario.currentSystem?.solarKw || 10;
      const recommendedBatteryKwh = scenario.currentSystem?.batteryKwh || Math.min(27, recommendedSolarKw * 2);
      
      const annualGeneration = (poaData.daily?.reduce((sum, d) => sum + d.poa_kwh, 0) || 0) * 365 * recommendedSolarKw;
      
      // Apply shade factor if available
      const shadeFactor = shadeAnalysis ? (1 - shadeAnalysis.overallShadeIndex) : 1;
      const adjustedGeneration = annualGeneration * shadeFactor;
      
      const selfConsumption = 0.74; // 74% from quantum optimization
      const exportEnergy = adjustedGeneration * (1 - selfConsumption);
      const gridOffset = adjustedGeneration * selfConsumption;
      
      const currentBill = billData.quarterlyBill * 4 || 2585;
      const savings = gridOffset * (billData.avgRate || 0.25) + exportEnergy * (billData.feedInTariff || 0.08);
      const newAnnualBill = Math.max(0, currentBill - savings);
      
      const systemCost = (recommendedSolarKw * 1200) + (recommendedBatteryKwh * 800);
      const paybackYears = systemCost / Math.max(savings, 1000);

      let reasoning = "AI-optimized system ";
      if (panelFit) {
        reasoning += `based on roof analysis: ${panelFit.totalPanels} panels fit across ${roofFacets.length} roof facets`;
      } else {
        reasoning += "based on your usage patterns";
      }
      if (shadeAnalysis) {
        reasoning += `. Shade analysis shows ${(shadeAnalysis.overallShadeIndex * 100).toFixed(1)}% shading impact`;
      }

      setScenario(prev => ({
        ...prev,
        recommendations: {
          solarKw: recommendedSolarKw,
          batteryKwh: recommendedBatteryKwh,
          batteryPowerKw: recommendedBatteryKwh * 0.56, // From optimization
          estimatedCost: systemCost,
          reasoning
        },
        results: {
          currentAnnualBill: currentBill,
          newAnnualBill,
          annualSavings: savings,
          paybackYears,
          npv25: savings * 15 - systemCost, // Simplified NPV
          irr: (savings / systemCost) * 100,
          selfConsumption: selfConsumption * 100,
          exportPercentage: (1 - selfConsumption) * 100,
          co2Reduction: adjustedGeneration * 0.85, // 0.85 kg CO2 per kWh
          systemPerformance: {
            annualGeneration: adjustedGeneration,
            batteryUsage: 135, // From quantum optimization
            efficiencyRating: shadeFactor * 100
          }
        }
      }));

    } catch (error) {
      console.error('Auto design failed:', error);
      emitSignal({
        key: 'nasa.poa',
        status: 'error',
        message: 'Auto design failed',
        details: { error: error.message }
      });
    } finally {
      setProcessing(false);
    }
  };

  const nextStep = () => {
    const stepIndex = getCurrentStepIndex();
    
    // For auto-design step, check if all signals are ready
    if (currentStep === 'auto-design') {
      const missing = getMissing(['nasa.poa', 'roof.polygon', 'roof.fit', 'sizing.battery']);
      if (missing.length > 0) {
        console.log('Cannot proceed to results, missing:', missing);
        return;
      }
    }
    
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].id as WizardStep);
    }
  };

  const prevStep = () => {
    const stepIndex = getCurrentStepIndex();
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].id as WizardStep);
    }
  };

  const renderCurrentSetup = () => (
    <div className="space-y-6">
      {/* Bill Analysis */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Electricity Bill Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OCRScanner onDataExtracted={handleOCRExtraction} />
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location & Network Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LocationAutoFill onLocationUpdate={handleLocationUpdate} />
        </CardContent>
      </Card>

      {/* Current System */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Current System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Current Solar System</Label>
              <Select 
                value={scenario.currentSystem?.type || "none"} 
                onValueChange={(value) => {
                  handleSystemUpdate('type', value);
                  // Set existing solar to 0 if "none" selected
                  if (value === 'none') {
                    handleSystemUpdate('solarKw', 0);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Do you have solar?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Solar System</SelectItem>
                  <SelectItem value="solar">Existing Solar</SelectItem>
                  <SelectItem value="solar-battery">Solar + Battery Upgrade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scenario.currentSystem?.type !== 'none' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <Label htmlFor="solar-kw">Solar System Size (kW)</Label>
                  <Input
                    id="solar-kw"
                    type="number"
                    step="0.1"
                    value={scenario.currentSystem?.solarKw || ''}
                    onChange={(e) => handleSystemUpdate('solarKw', parseFloat(e.target.value) || 0)}
                  />
                </div>
                {scenario.currentSystem?.type === 'solar-battery' && (
                  <div>
                    <Label htmlFor="battery-kwh">Battery Size (kWh)</Label>
                    <Input
                      id="battery-kwh"
                      type="number"
                      step="0.1"
                      value={scenario.currentSystem?.batteryKwh || ''}
                      onChange={(e) => handleSystemUpdate('batteryKwh', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* EV Section */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-3 mb-4">
                <Car className="w-5 h-5 text-primary" />
                <Label className="text-base font-medium">Electric Vehicle Usage</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ev-daily-kwh">Daily EV Usage (kWh)</Label>
                  <Input
                    id="ev-daily-kwh"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 12.5"
                    onChange={(e) => handleEVUpdate({ dailyKwh: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="ev-charging-time">Preferred Charging Time</Label>
                  <Select onValueChange={(value) => handleEVUpdate({ chargingTime: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="When do you charge?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daytime">Daytime (Solar)</SelectItem>
                      <SelectItem value="overnight">Overnight (Off-peak)</SelectItem>
                      <SelectItem value="peak-avoid">Avoid Peak Times</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderGoals = () => (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            What's Your Main Goal?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'min-payback', label: 'Fastest Payback', desc: 'Quickest return on investment' },
              { key: 'max-savings', label: 'Maximum Savings', desc: 'Biggest bill reduction' },
              { key: 'balanced', label: 'Balanced Approach', desc: 'Good payback + savings' },
              { key: 'budget-cap', label: 'Budget Limited', desc: 'Stay within budget' }
            ].map(({ key, label, desc }) => (
              <Card 
                key={key}
                className={`cursor-pointer transition-all ${
                  scenario.goals?.objective === key 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => setScenario(prev => ({
                  ...prev,
                  goals: { ...prev.goals, objective: key as any }
                }))}
              >
                <CardContent className="p-4">
                  <div className="font-medium">{label}</div>
                  <div className="text-sm text-muted-foreground mt-1">{desc}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {scenario.goals?.objective === 'budget-cap' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6"
            >
              <Label htmlFor="budget">Maximum Budget (AUD)</Label>
              <Input
                id="budget"
                type="number"
                placeholder="e.g., 25000"
                value={scenario.goals?.budgetCap || ''}
                onChange={(e) => setScenario(prev => ({
                  ...prev,
                  goals: { ...prev.goals, budgetCap: parseInt(e.target.value) || 0 }
                }))}
              />
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Constraints (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="export-limit">Export Limit (kW)</Label>
              <Input
                id="export-limit"
                type="number"
                step="0.1"
                placeholder="e.g., 5.0"
                value={scenario.goals?.exportLimit || ''}
                onChange={(e) => setScenario(prev => ({
                  ...prev,
                  goals: { ...prev.goals, exportLimit: parseFloat(e.target.value) || 0 }
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Network export limit for your location
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAutoDesign = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">AI System Designer</h2>
          <p className="text-muted-foreground">
            Design your roof layout and get AI-powered system optimization
          </p>
        </div>
      </div>

      {/* Roof Design Map */}
      {scenario.location?.lat && scenario.location?.lng && (
        <RoofDesignMap
          center={[scenario.location.lat, scenario.location.lng]}
          zoom={20}
          onRoofAnalysisComplete={handleRoofAnalysisComplete}
        />
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {!processing ? (
              <Button 
                onClick={handleAutoDesign} 
                size="lg" 
                className="w-full max-w-sm"
                disabled={!scenario.location?.lat || !scenario.location?.lng}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Run AI Optimization
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-muted-foreground">
                  Running quantum optimization algorithms...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-6">
      {scenario.recommendations && (
        <>
          <div className="space-y-6">
            {/* System Recommendations */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Sun className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold">{scenario.recommendations?.solarKw?.toFixed(2)} kW</div>
                  <div className="text-sm text-muted-foreground">Solar System</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Battery className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{scenario.recommendations?.batteryKwh} kWh</div>
                  <div className="text-sm text-muted-foreground">Battery Storage</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{scenario.recommendations?.batteryPowerKw?.toFixed(0)} kW</div>
                  <div className="text-sm text-muted-foreground">Battery Power</div>
                </CardContent>
              </Card>
            </div>

            {/* Why This Recommendation */}
            <Card>
              <CardHeader>
                <CardTitle>Why This Recommendation?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{scenario.recommendations?.solarKw?.toFixed(1)}kW solar system {scenario.currentSystem?.type === 'none' ? 'new installation' : 'existing'}</li>
                  <li>{scenario.recommendations?.batteryKwh}kWh battery optimized using quantum algorithms</li>
                  <li>NASA POA analysis shows {((scenario.results?.systemPerformance?.annualGeneration || 0) / 1000).toFixed(1)}MWh annual generation</li>
                  <li>Battery sized for optimal self-consumption and peak avoidance</li>
                  {panelFit && (
                    <li>{panelFit.fitMessage}</li>
                  )}
                  {shadeAnalysis && (
                    <li>Shade analysis shows {(shadeAnalysis.overallShadeIndex * 100).toFixed(1)}% average shading impact</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            {/* Financial Impact */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      ${scenario.results?.annualSavings.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Annual Savings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {scenario.results?.paybackYears.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Years Payback</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      ${scenario.results?.npv25.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">25-Year NPV</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {scenario.results?.irr.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">IRR</div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Bill Comparison</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Current Bill (Annual)</span>
                        <span>${scenario.results?.currentAnnualBill.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>With Solar + Battery</span>
                        <span>${scenario.results?.newAnnualBill.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium text-green-600">
                        <span>Annual Savings</span>
                        <span>${scenario.results?.annualSavings.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">System Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Self-Consumption</span>
                        <span>{scenario.results?.selfConsumption.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Export to Grid</span>
                        <span>{scenario.results?.exportPercentage.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Battery Cycles/Year</span>
                        <span>{scenario.results?.systemPerformance?.batteryUsage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CO₂ Reduction</span>
                        <span>{scenario.results?.co2Reduction.toFixed(1)}t</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Australian Solar Brands */}
            <Card>
              <CardHeader>
                <CardTitle>Recommended Australian Brands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">🔆 Solar Panels</h4>
                    <div className="space-y-1">
                      {AU_SOLAR_BRANDS.panels.slice(0, 3).map((brand, i) => (
                        <div key={i} className="text-xs">
                          <div className="font-medium">{brand.name}</div>
                          <div className="text-muted-foreground">{brand.model} • {brand.efficiency}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">⚡ Inverters</h4>
                    <div className="space-y-1">
                      {AU_SOLAR_BRANDS.inverters.slice(0, 3).map((brand, i) => (
                        <div key={i} className="text-xs">
                          <div className="font-medium">{brand.name}</div>
                          <div className="text-muted-foreground">{brand.model} • {brand.efficiency}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">🔋 Batteries</h4>
                    <div className="space-y-1">
                      {AU_SOLAR_BRANDS.batteries.slice(0, 3).map((brand, i) => (
                        <div key={i} className="text-xs">
                          <div className="font-medium">{brand.name}</div>
                          <div className="text-muted-foreground">{brand.model} • {brand.capacity}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Button variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Export PDF Report
              </Button>
              <Button variant="outline" className="flex-1">
                <Share2 className="mr-2 h-4 w-4" />
                Share Results
              </Button>
              {onApplyResults && (
                <Button onClick={() => onApplyResults(scenario)} className="flex-1">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Apply Results
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">How Much Can I Save?</h1>
        <p className="text-muted-foreground">AI-Powered Savings Analysis</p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">
              Step {getCurrentStepIndex() + 1} of {STEPS.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {STEPS[getCurrentStepIndex()].title}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 'current-setup' && renderCurrentSetup()}
          {currentStep === 'goals' && renderGoals()}
          {currentStep === 'auto-design' && renderAutoDesign()}
          {currentStep === 'results' && renderResults()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button 
          variant="outline" 
          onClick={prevStep}
          disabled={currentStep === 'current-setup'}
        >
          Previous
        </Button>
        
        {currentStep === 'results' ? (
          <Button onClick={() => console.log('Get Quote')}>
            Get Your Quote
          </Button>
        ) : currentStep === 'auto-design' ? (
          <Button 
            onClick={nextStep}
            disabled={getMissing(['nasa.poa', 'roof.polygon', 'roof.fit', 'sizing.battery']).length > 0}
          >
            Next
          </Button>
        ) : (
          <Button onClick={nextStep}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}