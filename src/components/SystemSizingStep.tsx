import { motion } from "framer-motion";
import { Zap, Battery, Sun, TrendingUp, Calculator, Edit, Database, Cpu, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface SystemSize {
  recommendedKw: number;
  panels: number;
  battery: number;
  estimatedGeneration: number;
  confidence?: number;
  aiReasoning?: string;
  products?: {
    panel: { brand: string; model: string; wattage: number };
    battery?: { brand: string; model: string; capacity: number };
    inverter: { type: string; capacity: number };
  };
}

interface SystemSizingStepProps {
  billData: any;
  locationData: any;
  systemSize: SystemSize;
  onSystemUpdate: (system: SystemSize) => void;
  onNext: () => void;
}

export default function SystemSizingStep({ 
  billData, 
  locationData, 
  systemSize, 
  onSystemUpdate, 
  onNext 
}: SystemSizingStepProps) {
  const [customMode, setCustomMode] = useState(false);
  const [customSystem, setCustomSystem] = useState(systemSize);
  const [isCalculating, setIsCalculating] = useState(false);
  const [aiResults, setAiResults] = useState<any>(null);
  const { toast } = useToast();

  // Run AI sizing on component mount
  useEffect(() => {
    if (billData.quarterlyUsage > 0 && locationData.postcode && !aiResults) {
      calculateAIOptimalSize();
    }
  }, [billData, locationData]);

  const calculateAIOptimalSize = async () => {
    setIsCalculating(true);
    try {
      console.log('🤖 Calling AI system sizing...');
      
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke('ai-system-sizing', {
        body: {
          billData,
          locationData,
          preferences: {
            offsetGoal: 90, // Target 90% bill offset
            batteryRequired: billData.peakUsage && billData.offPeakUsage, // Battery if TOU data available
            roofSpace: 'average'
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('✅ AI sizing results:', data);
      setAiResults(data);

      const newSystem: SystemSize = {
        recommendedKw: data.recommendations.panels.totalKw,
        panels: data.recommendations.panels.count,
        battery: data.recommendations.battery?.capacity_kwh || 0,
        estimatedGeneration: data.financial.annual_generation,
        confidence: data.rationale.confidence,
        aiReasoning: data.rationale.ai_reasoning,
        products: {
          panel: {
            brand: data.recommendations.panels.brand,
            model: data.recommendations.panels.model,
            wattage: data.recommendations.panels.wattage
          },
          battery: data.recommendations.battery ? {
            brand: data.recommendations.battery.brand,
            model: data.recommendations.battery.model,
            capacity: data.recommendations.battery.capacity_kwh
          } : undefined,
          inverter: {
            type: data.recommendations.inverter.type,
            capacity: data.recommendations.inverter.capacity_kw
          }
        }
      };

      onSystemUpdate(newSystem);
      setCustomSystem(newSystem);

      toast({
        title: "AI Sizing Complete! 🤖",
        description: `Recommended ${newSystem.recommendedKw}kW system with ${Math.round(data.rationale.confidence * 100)}% confidence`
      });

    } catch (error) {
      console.error('❌ AI sizing failed:', error);
      
      toast({
        title: "AI Sizing Failed",
        description: "Using fallback calculations. Please check your inputs.",
        variant: "destructive"
      });
      
      // Fallback to basic calculation
      calculateBasicOptimalSize();
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateBasicOptimalSize = () => {
    const annualUsage = billData.quarterlyUsage * 4;
    const offsetPercentage = 100; // Default 100% offset
    
    // Smart sizing based on TOU data if available
    let sizingFactor = 1.0;
    if (billData.peakUsage && billData.offPeakUsage) {
      const peakRatio = billData.peakUsage / (billData.peakUsage + billData.offPeakUsage);
      sizingFactor = peakRatio > 0.6 ? 1.2 : 0.9; // Larger system if high peak usage
    }
    
    const recommendedKw = Math.ceil((annualUsage * sizingFactor * offsetPercentage / 100) / 1200);
    const panels = Math.ceil(recommendedKw / 0.4); // 400W panels
    const battery = Math.ceil(recommendedKw * 1.5); // 1.5x battery sizing
    const estimatedGeneration = recommendedKw * 1400; // Annual generation
    
    const newSystem = { 
      recommendedKw, 
      panels, 
      battery, 
      estimatedGeneration,
      confidence: 0.65,
      aiReasoning: "Basic calculation using industry standard ratios. For more accurate sizing, ensure all bill data is complete."
    };
    onSystemUpdate(newSystem);
    setCustomSystem(newSystem);
  };

  const handleSystemChange = (field: keyof SystemSize, value: number) => {
    const updated = { ...customSystem, [field]: value };
    if (field === 'recommendedKw') {
      updated.panels = Math.ceil(value / 0.4);
      updated.estimatedGeneration = value * 1400;
    }
    setCustomSystem(updated);
    onSystemUpdate(updated);
  };

  const annualBill = billData.quarterlyBill * 4;
  const offsetPercentage = Math.min((systemSize.estimatedGeneration / (billData.quarterlyUsage * 4)) * 100, 120);

  return (
    <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          AI-Optimized System Sizing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* AI Sizing Results */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5 border border-primary/20"
        >
          {isCalculating ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Cpu className="h-8 w-8 text-primary animate-pulse" />
                <div className="text-xl font-semibold">AI is analyzing your energy needs...</div>
              </div>
              <div className="text-muted-foreground">
                Calculating optimal system size using machine learning and solar irradiance data
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <div className="p-3 rounded-full bg-primary/20 w-fit mx-auto">
                    <Sun className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">{systemSize.recommendedKw}kW</div>
                  <div className="text-sm text-muted-foreground">Solar System</div>
                  <Badge variant="secondary">{systemSize.panels} panels</Badge>
                  {systemSize.products?.panel && (
                    <div className="text-xs text-muted-foreground">
                      {systemSize.products.panel.brand} {systemSize.products.panel.model}
                    </div>
                  )}
                </div>
                
                <div className="text-center space-y-2">
                  <div className="p-3 rounded-full bg-secondary/20 w-fit mx-auto">
                    <Battery className="h-6 w-6 text-secondary" />
                  </div>
                  <div className="text-2xl font-bold">{systemSize.battery}kWh</div>
                  <div className="text-sm text-muted-foreground">Battery Storage</div>
                  <Badge variant={systemSize.battery > 0 ? "default" : "secondary"}>
                    {systemSize.battery > 0 ? "AI Optimized" : "Not Required"}
                  </Badge>
                  {systemSize.products?.battery && (
                    <div className="text-xs text-muted-foreground">
                      {systemSize.products.battery.brand} {systemSize.products.battery.model}
                    </div>
                  )}
                </div>
                
                <div className="text-center space-y-2">
                  <div className="p-3 rounded-full bg-green-500/20 w-fit mx-auto">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold">{offsetPercentage.toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground">Bill Offset</div>
                  <Badge variant={offsetPercentage >= 90 ? "default" : "secondary"}>
                    {offsetPercentage >= 90 ? "Excellent" : "Good"}
                  </Badge>
                  {systemSize.confidence && (
                    <div className="text-xs text-muted-foreground">
                      AI Confidence: {Math.round(systemSize.confidence * 100)}%
                    </div>
                  )}
                </div>
              </div>

              {/* AI Reasoning */}
              {systemSize.aiReasoning && (
                <div className="mt-6 p-4 rounded-lg bg-white/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">AI Analysis</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {systemSize.aiReasoning}
                  </p>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Financial Projection */}
        {aiResults && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <h4 className="font-semibold">Financial Projection</h4>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-500">
                  ${aiResults.financial.system_cost.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">System Cost</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-500">
                  ${aiResults.financial.annual_savings.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Annual Savings</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-500">
                  {aiResults.financial.payback_period} years
                </div>
                <div className="text-xs text-muted-foreground">Payback Period</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-500">
                  {aiResults.financial.roi_25_year}%
                </div>
                <div className="text-xs text-muted-foreground">25-Year ROI</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Product Database Integration */}
        {aiResults && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-blue-500/20"
          >
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-blue-500" />
              <h4 className="font-semibold">Recommended Products</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Solar Panels</div>
                <div className="text-sm text-muted-foreground">
                  {aiResults.recommendations.panels.count}x {aiResults.recommendations.panels.brand} {aiResults.recommendations.panels.model}
                </div>
                <div className="text-sm text-muted-foreground">
                  {aiResults.recommendations.panels.wattage}W per panel • {aiResults.recommendations.panels.efficiency * 100}% efficiency
                </div>
              </div>
              
              {aiResults.recommendations.battery && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Battery Storage</div>
                  <div className="text-sm text-muted-foreground">
                    {aiResults.recommendations.battery.brand} {aiResults.recommendations.battery.model}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {aiResults.recommendations.battery.capacity_kwh}kWh total • {aiResults.recommendations.battery.usable_capacity}kWh usable
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Optimization Insights */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Sizing Rationale
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm font-medium mb-2">Energy Profile Analysis</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Annual Usage: {(billData.quarterlyUsage * 4).toLocaleString()} kWh</div>
                <div>Annual Bill: ${annualBill.toLocaleString()}</div>
                {billData.peakUsage && (
                  <div>Peak/Off-Peak Ratio: {((billData.peakUsage / (billData.peakUsage + billData.offPeakUsage)) * 100).toFixed(0)}%</div>
                )}
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm font-medium mb-2">Generation Estimate</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Expected Generation: {systemSize.estimatedGeneration.toLocaleString()} kWh/year</div>
                <div>Location: {locationData.postcode}, {locationData.state}</div>
                <div>System Efficiency: 85%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Sizing */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Customize System Size</h4>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCustomMode(!customMode)}
              className="bg-white/5 border-white/20"
            >
              <Edit className="h-4 w-4 mr-2" />
              {customMode ? 'Auto Mode' : 'Custom Mode'}
            </Button>
          </div>
          
          {customMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>System Size (kW)</Label>
                  <Input
                    type="number"
                    value={customSystem.recommendedKw}
                    onChange={(e) => handleSystemChange('recommendedKw', parseFloat(e.target.value) || 0)}
                    className="bg-white/5 border-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Battery Size (kWh)</Label>
                  <Input
                    type="number"
                    value={customSystem.battery}
                    onChange={(e) => handleSystemChange('battery', parseFloat(e.target.value) || 0)}
                    className="bg-white/5 border-white/20"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Recalculate Button */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={calculateAIOptimalSize}
            disabled={isCalculating}
            className="bg-white/5 border-white/20"
          >
            <Cpu className="h-4 w-4 mr-2" />
            {isCalculating ? "Analyzing..." : "AI Re-Analysis"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={calculateBasicOptimalSize}
            className="bg-white/5 border-white/20"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Basic Calculation
          </Button>
          
          <Button onClick={onNext} className="ml-auto" disabled={isCalculating}>
            Find Best Energy Plans
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}