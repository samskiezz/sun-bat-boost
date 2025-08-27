import { motion } from "framer-motion";
import { Zap, Battery, Sun, TrendingUp, Calculator, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

interface SystemSize {
  recommendedKw: number;
  panels: number;
  battery: number;
  estimatedGeneration: number;
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

  const calculateOptimalSize = () => {
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
    
    const newSystem = { recommendedKw, panels, battery, estimatedGeneration };
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
        
        {/* Auto Sizing Results */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5 border border-primary/20"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="p-3 rounded-full bg-primary/20 w-fit mx-auto">
                <Sun className="h-6 w-6 text-primary" />
              </div>
              <div className="text-2xl font-bold">{systemSize.recommendedKw}kW</div>
              <div className="text-sm text-muted-foreground">Solar System</div>
              <Badge variant="secondary">{systemSize.panels} panels</Badge>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-3 rounded-full bg-secondary/20 w-fit mx-auto">
                <Battery className="h-6 w-6 text-secondary" />
              </div>
              <div className="text-2xl font-bold">{systemSize.battery}kWh</div>
              <div className="text-sm text-muted-foreground">Battery Storage</div>
              <Badge variant="secondary">Optimized</Badge>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-3 rounded-full bg-green-500/20 w-fit mx-auto">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div className="text-2xl font-bold">{offsetPercentage.toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Bill Offset</div>
              <Badge variant={offsetPercentage >= 100 ? "default" : "secondary"}>
                {offsetPercentage >= 100 ? "Full Coverage" : "Partial"}
              </Badge>
            </div>
          </div>
        </motion.div>

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
            onClick={calculateOptimalSize}
            className="bg-white/5 border-white/20"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Recalculate Optimal Size
          </Button>
          
          <Button onClick={onNext} className="ml-auto">
            Find Best Energy Plans
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}