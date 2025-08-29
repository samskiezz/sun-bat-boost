import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import { Calculator, TrendingUp, TrendingDown, DollarSign, Zap, Battery, Sun, Download, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import HolographicGraph from "./HolographicGraph";

interface SavingsAnalysisStepProps {
  billData: any;
  locationData: any;
  systemSize: any;
  selectedPlan?: any;
}

export default function SavingsAnalysisStep({ billData, locationData, systemSize, selectedPlan }: SavingsAnalysisStepProps) {
  const [includeEV, setIncludeEV] = useState(billData.hasEV || false);
  const [evChargingKwh, setEvChargingKwh] = useState(billData.evChargingKwh || 200);
  const [evChargingAtHome, setEvChargingAtHome] = useState(0.8); // 80% home charging
  
  // EV charging calculations
  const evAnnualChargingCost = includeEV ? evChargingKwh * 12 * (billData.averageRate / 100) * evChargingAtHome : 0;
  const evSolarChargingSavings = includeEV ? evChargingKwh * 12 * evChargingAtHome * 0.7 * (billData.averageRate / 100) : 0; // 70% solar charging potential

  // Use AI sizing results directly for accurate calculations
  const financialData = systemSize?.financial || {};
  let currentAnnualBill = financialData.current_annual_bill || (billData.quarterlyBill * 4);
  let newAnnualBill = financialData.new_annual_bill || currentAnnualBill;
  let annualSavings = financialData.annual_savings || 0;
  
  // Add EV costs and savings
  if (includeEV) {
    currentAnnualBill += evAnnualChargingCost;
    annualSavings += evSolarChargingSavings;
    newAnnualBill = currentAnnualBill - annualSavings;
  }
  
  const monthlySavings = Math.round(annualSavings / 12);
  const billReductionPercent = Math.round((annualSavings / currentAnnualBill) * 100);
  
  // Solar system performance from AI sizing
  const solarGeneration = financialData.annual_generation || 0;
  const solarSelfConsumption = financialData.self_consumption || 0;
  const solarExport = financialData.export_generation || 0;
  const exportIncome = financialData.export_income || 0;
  
  // System specifications
  const systemKw = systemSize?.recommendations?.panels?.totalKw || 0;
  const batteryKwh = systemSize?.recommendations?.battery?.capacity_kwh || 0;
  const annualUsage = billData.quarterlyUsage * 4;
  
  // Calculate component savings for breakdown display
  const gridOffsetSavings = solarSelfConsumption * (billData.averageRate / 100);
  const batteryTimeshiftSavings = Math.max(0, annualSavings - gridOffsetSavings - exportIncome);
  
  // Monthly breakdown data - ENERGY BILL FOCUS
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(0, i).toLocaleString('default', { month: 'short' });
    const seasonalFactor = [0.8, 0.9, 1.1, 1.2, 1.3, 1.0, 0.9, 0.9, 1.0, 1.1, 1.0, 0.8][i];
    
    return {
      month,
      currentBill: Math.round((currentAnnualBill / 12) * seasonalFactor),
      newBill: Math.round((newAnnualBill / 12) * seasonalFactor),
      savings: Math.round((annualSavings / 12) * seasonalFactor),
      solarGeneration: Math.round((solarGeneration / 12) * seasonalFactor)
    };
  });

  // Energy breakdown for pie chart - more accurate representation
  const energyBreakdown = [
    { 
      name: 'Grid Purchase', 
      value: Math.max(0, annualUsage - solarSelfConsumption), 
      color: '#ef4444' 
    },
    { 
      name: 'Solar Self-Use', 
      value: solarSelfConsumption, 
      color: '#22c55e' 
    },
    { 
      name: 'Solar Export', 
      value: solarExport, 
      color: '#3b82f6' 
    }
  ].filter(item => item.value > 0); // Only show non-zero values

  // 25-year energy savings projection (NO SYSTEM COSTS)
  const cumulativeSavings = [];
  let cumulativeTotal = 0;
  
  for (let year = 0; year < 25; year++) {
    const degradation = Math.pow(0.995, year); // 0.5% annual degradation
    const annualSaving = annualSavings * degradation;
    cumulativeTotal += annualSaving;
    
    cumulativeSavings.push({
      year: year + 1,
      annual: Math.round(annualSaving),
      cumulative: Math.round(cumulativeTotal)
    });
  }

  const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-6">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-white/20 bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-xl">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-500">
                ${annualSavings.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Annual Bill Savings</div>
              <Badge variant="default" className="mt-2">
                {billReductionPercent}% Bill Reduction
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-white/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-xl">
            <CardContent className="p-6 text-center">
              <Zap className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-500">
                        {solarGeneration > 0 ? Math.round((solarSelfConsumption / annualUsage) * 100) : 0}%
                      </div>
              <div className="text-sm text-muted-foreground">Energy Independence</div>
              <Badge variant="secondary" className="mt-2">
                {solarGeneration.toLocaleString()} kWh/year
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-white/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-xl">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-500">
                ${cumulativeSavings[24]?.cumulative.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">25-Year Savings</div>
              <Badge variant="outline" className="mt-2">
                25-Year Energy Savings
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-white/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-xl">
            <CardContent className="p-6 text-center">
              <Sun className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-500">
                {Math.round((solarGeneration * 0.4) / 1000)}t
              </div>
              <div className="text-sm text-muted-foreground">CO₂ Avoided/Year</div>
              <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                Carbon Neutral
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Analysis */}
      <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Comprehensive Savings Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-white/10 border border-white/20">
              <TabsTrigger value="monthly">Monthly Breakdown</TabsTrigger>
              <TabsTrigger value="energy">Energy Mix</TabsTrigger>
              <TabsTrigger value="ev">EV Analysis</TabsTrigger>
              <TabsTrigger value="longterm">Long-term Projection</TabsTrigger>
              <TabsTrigger value="comparison">Plan Comparison</TabsTrigger>
            </TabsList>
            
            <TabsContent value="monthly" className="space-y-4">
              <HolographicGraph 
                data={monthlyData} 
                title="Monthly Energy Bill Analysis"
              />
            </TabsContent>
            
            <TabsContent value="energy" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-white/20 bg-white/5">
                  <CardHeader>
                    <CardTitle className="text-lg">Energy Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={energyBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {energyBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.8)', 
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card className="border-white/20 bg-white/5">
                  <CardHeader>
                    <CardTitle className="text-lg">Savings Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                          <span className="text-sm">Solar Self-Consumption</span>
                          <span className="font-semibold text-green-500">+${Math.round(gridOffsetSavings).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                          <span className="text-sm">Solar Export Credits</span>
                          <span className="font-semibold text-green-500">+${Math.round(exportIncome).toLocaleString()}</span>
                        </div>
                        {batteryKwh > 0 && (
                          <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                            <span className="text-sm">Battery Time-Shift Savings</span>
                            <span className="font-semibold text-green-500">+${Math.round(batteryTimeshiftSavings).toLocaleString()}</span>
                          </div>
                        )}
                       <div className="border-t border-white/20 pt-3">
                         <div className="flex justify-between items-center">
                           <span className="font-semibold">Total Annual Bill Savings</span>
                           <span className="text-xl font-bold text-green-500">${annualSavings.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between items-center mt-2">
                           <span className="text-sm text-muted-foreground">Monthly Savings</span>
                           <span className="text-sm font-medium text-green-500">${monthlySavings.toLocaleString()}</span>
                         </div>
                       </div>
                     </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="ev" className="space-y-4">
              <Card className="border-white/20 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Electric Vehicle Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-ev" 
                      checked={includeEV}
                      onCheckedChange={(checked) => setIncludeEV(checked as boolean)}
                    />
                    <Label htmlFor="include-ev">Include Electric Vehicle charging in analysis</Label>
                  </div>
                  
                  {includeEV && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ev-kwh">Monthly EV charging (kWh)</Label>
                          <Input
                            id="ev-kwh"
                            type="number"
                            value={evChargingKwh}
                            onChange={(e) => setEvChargingKwh(parseInt(e.target.value) || 0)}
                            className="bg-white/5 border-white/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ev-home">Home charging %</Label>
                          <Input
                            id="ev-home"
                            type="number"
                            min="0"
                            max="100"
                            value={Math.round(evChargingAtHome * 100)}
                            onChange={(e) => setEvChargingAtHome((parseInt(e.target.value) || 0) / 100)}
                            className="bg-white/5 border-white/20"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5">
                          <CardContent className="p-4 text-center">
                            <Car className="h-6 w-6 mx-auto mb-2 text-red-500" />
                            <div className="text-xl font-bold text-red-500">
                              ${Math.round(evAnnualChargingCost).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">Annual EV Charging Cost</div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
                          <CardContent className="p-4 text-center">
                            <Sun className="h-6 w-6 mx-auto mb-2 text-green-500" />
                            <div className="text-xl font-bold text-green-500">
                              ${Math.round(evSolarChargingSavings).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">Annual Solar EV Savings</div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                          <CardContent className="p-4 text-center">
                            <Zap className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                            <div className="text-xl font-bold text-blue-500">
                              {Math.round((evSolarChargingSavings / evAnnualChargingCost) * 100) || 0}%
                            </div>
                            <div className="text-xs text-muted-foreground">EV Savings Rate</div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                        <div className="text-sm">
                          <strong>EV Solar Charging Benefits:</strong> With your solar system, you can charge your EV for approximately {Math.round((1 - (evSolarChargingSavings / evAnnualChargingCost)) * (billData.averageRate / 100) * 100)}c/kWh during solar generation hours, compared to {billData.averageRate}c/kWh from the grid.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="longterm" className="space-y-4">
              <Card className="border-white/20 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-lg">25-Year Cumulative Savings</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={cumulativeSavings}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="year" stroke="rgba(255,255,255,0.7)" />
                      <YAxis stroke="rgba(255,255,255,0.7)" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0,0,0,0.8)', 
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke="#22c55e" 
                        fill="rgba(34,197,94,0.2)"
                        name="Cumulative Savings"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="comparison" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-white/20 bg-white/5">
                  <CardHeader>
                    <CardTitle className="text-lg text-center">Current Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="text-3xl font-bold text-red-500">
                      ${currentAnnualBill.toLocaleString()}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>Retailer: {billData.currentRetailer || 'Current Provider'}</div>
                      <div>Plan: {billData.currentPlan || 'Current Plan'}</div>
                      <div>Rate: {billData.averageRate}c/kWh</div>
                    </div>
                    <Badge variant="destructive">Baseline</Badge>
                  </CardContent>
                </Card>
                
                 <Card className="border-white/20 bg-white/5">
                   <CardHeader>
                     <CardTitle className="text-lg text-center">Best Available Plan</CardTitle>
                   </CardHeader>
                   <CardContent className="text-center space-y-4">
                     <div className="text-3xl font-bold text-orange-500">
                       ${currentAnnualBill.toLocaleString()}
                     </div>
                     <div className="space-y-2 text-sm">
                       <div>Retailer: {selectedPlan?.retailer || 'Best Plan'}</div>
                       <div>Plan: {selectedPlan?.plan_name || 'Recommended'}</div>
                       <div>Rate: {selectedPlan?.usage_c_per_kwh_peak || billData.averageRate}c/kWh</div>
                     </div>
                     <Badge variant="secondary">
                       No Solar System
                     </Badge>
                   </CardContent>
                 </Card>
                
                <Card className="border-white/20 bg-white/5 ring-2 ring-green-500/50">
                  <CardHeader>
                    <CardTitle className="text-lg text-center">Complete Solution</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="text-3xl font-bold text-green-500">
                      ${newAnnualBill.toLocaleString()}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>Solar: {systemKw}kW System</div>
                      <div>Battery: {batteryKwh}kWh Storage</div>
                      <div>Optimized Energy Plan</div>
                    </div>
                    <Badge variant="default" className="bg-green-500">
                      Save ${annualSavings.toLocaleString()}/year
                    </Badge>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <h3 className="font-semibold mb-2">Ready to start saving?</h3>
              <p className="text-sm text-muted-foreground">
                Get quotes from certified installers and switch to your optimal energy plan
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="bg-white/5 border-white/20 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Report
              </Button>
              <Button className="bg-primary hover:bg-primary/90">
                Get Solar Quotes
              </Button>
              <Button variant="secondary">
                Switch Energy Plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}