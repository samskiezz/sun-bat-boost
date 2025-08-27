import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Battery, 
  Zap, 
  Calculator, 
  Upload, 
  TrendingUp,
  DollarSign,
  Home,
  Sun,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Glass } from './Glass';

export const BatteryROICalculator: React.FC = () => {
  const [systemType, setSystemType] = useState<string>('solar-battery');
  const [pvSize, setPvSize] = useState<number[]>([6.5]);
  const [batterySize, setBatterySize] = useState<number[]>([13.5]);
  const [dayNightSplit, setDayNightSplit] = useState<number[]>([60]);

  return (
    <div className="space-y-6">
      {/* Input Cards Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* System & Pricing Card */}
        <Glass className="p-6 hover-glass">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">System & Pricing</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="system-type">System Type</Label>
              <Select value={systemType} onValueChange={setSystemType}>
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

            {(systemType === 'solar-only' || systemType === 'solar-battery') && (
              <div>
                <Label>PV System Size: {pvSize[0]} kW</Label>
                <div className="hologram-track">
                  <Slider
                    value={pvSize}
                    onValueChange={setPvSize}
                    max={20}
                    min={3}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            {(systemType === 'battery-only' || systemType === 'solar-battery') && (
              <div>
                <Label>Battery Size: {batterySize[0]} kWh</Label>
                <div className="hologram-track">
                  <Slider
                    value={batterySize}
                    onValueChange={setBatterySize}
                    max={30}
                    min={5}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="system-price">System Price (inc. GST)</Label>
              <Input 
                id="system-price"
                type="number" 
                placeholder="e.g., 25000"
                className="bg-white/5 border-white/20"
              />
            </div>
          </div>
        </Glass>

        {/* Bill & Usage Card */}
        <Glass className="p-6 hover-glass">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Bill & Usage</h3>
          </div>
          
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full bg-white/5 border-white/20 border-dashed h-20"
            >
              <div className="text-center">
                <Upload className="w-6 h-6 mx-auto mb-1 opacity-60" />
                <div className="text-sm">Drop energy bill here</div>
                <div className="text-xs opacity-60">PDF, JPG, PNG</div>
              </div>
            </Button>

            <div className="text-center text-sm text-muted-foreground">or</div>

            <Button 
              variant="outline" 
              className="w-full bg-white/5 border-white/20"
            >
              Select Plan from Energy Made Easy
            </Button>

            <div>
              <Label>Day/Night Usage Split: {dayNightSplit[0]}% day</Label>
              <div className="hologram-track">
                <Slider
                  value={dayNightSplit}
                  onValueChange={setDayNightSplit}
                  max={80}
                  min={20}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="daily-usage">Average Daily Usage (kWh)</Label>
              <Input 
                id="daily-usage"
                type="number" 
                placeholder="e.g., 25"
                className="bg-white/5 border-white/20"
              />
            </div>
          </div>
        </Glass>

        {/* Site & Performance Card */}
        <Glass className="p-6 hover-glass">
          <div className="flex items-center gap-2 mb-4">
            <Home className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Site & Performance</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="postcode">Postcode</Label>
              <Input 
                id="postcode"
                placeholder="e.g., 2000"
                className="bg-white/5 border-white/20"
              />
            </div>

            <div>
              <Label htmlFor="roof-tilt">Roof Tilt (degrees)</Label>
              <Input 
                id="roof-tilt"
                type="number" 
                placeholder="e.g., 25"
                className="bg-white/5 border-white/20"
              />
            </div>

            <div>
              <Label htmlFor="roof-azimuth">Roof Azimuth (degrees)</Label>
              <Input 
                id="roof-azimuth"
                type="number" 
                placeholder="e.g., 0 (North)"
                className="bg-white/5 border-white/20"
              />
            </div>

            <div>
              <Label htmlFor="shading">Shading Factor (%)</Label>
              <Select>
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue placeholder="Select shading" />
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
        </Glass>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="bg-white/5 border-white/20"
          >
            Save Scenario
          </Button>
          <Button 
            variant="outline" 
            className="bg-white/5 border-white/20"
          >
            Compare Scenarios
          </Button>
        </div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button 
            className="bg-gradient-primary text-white px-8 py-3 text-base font-medium"
          >
            <Calculator className="w-5 h-5 mr-2" />
            Run Simulation
          </Button>
        </motion.div>
      </div>

      {/* Results Placeholder */}
      <div className="grid gap-6 md:grid-cols-3">
        <Glass className="p-6 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">ROI Analysis</h3>
          </div>
          
          <div className="h-64 flex items-center justify-center border border-white/10 rounded-lg bg-white/5">
            <div className="text-center text-muted-foreground">
              <Calculator className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p>Click "Run Simulation" to see detailed ROI analysis</p>
            </div>
          </div>
        </Glass>

        <Glass className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Key Metrics</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
              <span className="text-sm">Payback Period</span>
              <span className="font-medium text-muted-foreground">-</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
              <span className="text-sm">Annual Savings</span>
              <span className="font-medium text-muted-foreground">-</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
              <span className="text-sm">NPV (25 years)</span>
              <span className="font-medium text-muted-foreground">-</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
              <span className="text-sm">Self Consumption</span>
              <span className="font-medium text-muted-foreground">-</span>
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
};

export default BatteryROICalculator;