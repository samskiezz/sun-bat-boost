import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Battery, DollarSign, TrendingUp, Clock, Calendar } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { GlassChart, GlassLine, GlassBar } from "@/features/shared/GlassChart";
import { createSeededRandom } from "@/utils/deterministicRandom";

interface TariffOptimization {
  id: string;
  site_id: string;
  tariff_data: {
    peak_rate: number;
    shoulder_rate: number;
    off_peak_rate: number;
    export_rate: number;
    daily_charge: number;
  };
  vpp_rules?: {
    export_limit_kw: number;
    dispatch_windows: Array<{
      start: string;
      end: string;
      rate: number;
    }>;
    participation_reward: number;
  };
  dispatch_schedule?: {
    hourly_plan: Array<{
      hour: number;
      charge_kw: number;
      discharge_kw: number;
      grid_export_kw: number;
      savings_aud: number;
    }>;
  };
  savings_projections?: {
    annual_savings_p50: number;
    annual_savings_p90: number;
    payback_years: number;
    roi_percent: number;
  };
}

export function TariffVPPOptimizerTab() {
  const { toast } = useToast();
  const [optimizations, setOptimizations] = useState<TariffOptimization[]>([]);
  const [selectedOpt, setSelectedOpt] = useState<TariffOptimization | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [vppEnabled, setVppEnabled] = useState(true);
  const [realTimeMode, setRealTimeMode] = useState(false);

  useEffect(() => {
    loadOptimizations();
    if (realTimeMode) {
      const interval = setInterval(loadOptimizations, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [realTimeMode]);

  const loadOptimizations = async () => {
    // For now, use existing compliance_checks data as demo until types regenerate
    const { data, error } = await supabase
      .from('compliance_checks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load optimizations",
        variant: "destructive",
      });
      return;
    }
    
    // Map the data to TariffOptimization format
    const mappedOptimizations: TariffOptimization[] = (data || []).map(item => ({
      id: item.id,
      site_id: item.site_id,
      tariff_data: {
        peak_rate: 0.45,
        shoulder_rate: 0.32,
        off_peak_rate: 0.18,
        export_rate: 0.06,
        daily_charge: 1.20
      },
      vpp_rules: vppEnabled ? {
        export_limit_kw: 5.0,
        dispatch_windows: [
          { start: '17:00', end: '21:00', rate: 0.85 }
        ],
        participation_reward: 350
      } : undefined,
      optimization_params: {
        battery_capacity_kwh: 13.5,
        max_charge_rate: 5.0,
        max_discharge_rate: 5.0,
        round_trip_efficiency: 0.9
      },
      created_at: item.created_at,
      updated_at: item.created_at
    }));
    
    setOptimizations(mappedOptimizations);
    if (mappedOptimizations.length > 0) {
      setSelectedOpt(mappedOptimizations[0]);
    }
  };

  const createDemoOptimization = async () => {
    const seed = `demo_opt_${Date.now()}`;
    const random = createSeededRandom(seed);
    
    const demoOpt = {
      site_id: `site_${Date.now()}`,
      tariff_data: {
        peak_rate: 0.45,
        shoulder_rate: 0.32,
        off_peak_rate: 0.18,
        export_rate: 0.06,
        daily_charge: 1.20
      },
      vpp_rules: vppEnabled ? {
        export_limit_kw: 5.0,
        dispatch_windows: [
          { start: '17:00', end: '21:00', rate: 0.85 },
          { start: '06:00', end: '09:00', rate: 0.75 }
        ],
        participation_reward: 350
      } : undefined,
      optimization_params: {
        battery_capacity_kwh: 13.5,
        max_charge_rate: 5.0,
        max_discharge_rate: 5.0,
        round_trip_efficiency: 0.9
      }
    };

    // For now, insert into compliance_checks as demo until types regenerate
    const { data, error } = await supabase
      .from('compliance_checks')
      .insert([{
        site_id: demoOpt.site_id,
        system_design: demoOpt,
        check_results: { status: 'optimized' },
        overall_status: 'compliant',
        evidence_package: {}
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create optimization",
        variant: "destructive",
      });
      return;
    }

    await runOptimization(data.id);
    loadOptimizations();
    toast({
      title: "Success",
      description: "Demo optimization created",
    });
  };

  const runOptimization = async (optId: string) => {
    setIsOptimizing(true);
    
    // Use seeded random for deterministic results
    const random = createSeededRandom(`opt_${optId}`);
    
    // Simulate multi-objective optimization
    const hourlyPlan = Array.from({ length: 24 }, (_, hour) => {
      const isPeak = hour >= 17 && hour <= 21;
      const isOffPeak = hour >= 23 || hour <= 6;
      const isVppDispatch = vppEnabled && (hour >= 17 && hour <= 21);
      
      let charge_kw = 0, discharge_kw = 0, grid_export_kw = 0;
      
      if (isOffPeak) {
        charge_kw = 3 + random.range(0, 2); // Charge during cheap times
      } else if (isPeak && isVppDispatch) {
        discharge_kw = 4 + random.range(0, 1); // Discharge during expensive/VPP times
        grid_export_kw = 2 + random.range(0, 3);
      }
      
      const savings_aud = isPeak ? (discharge_kw * 0.45 + grid_export_kw * 0.85) : 
                          isOffPeak ? -(charge_kw * 0.18) : 0;
      
      return {
        hour,
        charge_kw,
        discharge_kw,
        grid_export_kw,
        savings_aud
      };
    });

    const totalDailySavings = hourlyPlan.reduce((sum, h) => sum + h.savings_aud, 0);
    const annualSavingsP50 = totalDailySavings * 365;
    const vppBonus = vppEnabled ? 350 : 0;

    const savingsProjections = {
      annual_savings_p50: annualSavingsP50 + vppBonus,
      annual_savings_p90: (annualSavingsP50 + vppBonus) * 1.2,
      payback_years: 15000 / (annualSavingsP50 + vppBonus), // Assuming $15k system
      roi_percent: ((annualSavingsP50 + vppBonus) / 15000) * 100
    };

    const { error } = await supabase
      .from('compliance_checks')
      .update({ 
        system_design: { 
          ...selectedOpt,
          dispatch_schedule: { hourly_plan: hourlyPlan },
          savings_projections: savingsProjections 
        }
      })
      .eq('id', optId);

    if (error) {
      toast({
        title: "Error", 
        description: "Failed to save optimization results",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Multi-objective optimization completed",
      });
    }

    setIsOptimizing(false);
  };

  const renderDispatchChart = () => {
    if (!selectedOpt?.dispatch_schedule?.hourly_plan || !Array.isArray(selectedOpt.dispatch_schedule.hourly_plan)) {
      return null;
    }

    const chartData = selectedOpt.dispatch_schedule.hourly_plan.map(h => ({
      hour: `${h.hour}:00`,
      charge: -h.charge_kw, // Negative for charging
      discharge: h.discharge_kw,
      export: h.grid_export_kw,
      savings: h.savings_aud
    }));

    return (
      <GlassChart type="bar" data={chartData} height={300}>
        <GlassBar dataKey="discharge" name="Battery Discharge (kW)" />
        <GlassBar dataKey="charge" name="Battery Charge (kW)" fill="hsl(var(--destructive))" />
        <GlassBar dataKey="export" name="Grid Export (kW)" fill="hsl(var(--secondary))" />
      </GlassChart>
    );
  };

  const renderSavingsChart = () => {
    if (!selectedOpt?.dispatch_schedule?.hourly_plan || !Array.isArray(selectedOpt.dispatch_schedule.hourly_plan)) {
      return null;
    }

    const savingsData = selectedOpt.dispatch_schedule.hourly_plan.map(h => ({
      hour: `${h.hour}:00`,
      savings: h.savings_aud,
      cumulative: selectedOpt.dispatch_schedule!.hourly_plan
        .slice(0, h.hour + 1)
        .reduce((sum, hour) => sum + hour.savings_aud, 0)
    }));

    return (
      <GlassChart type="line" data={savingsData} height={300}>
        <GlassLine dataKey="savings" name="Hourly Savings ($)" />
        <GlassLine dataKey="cumulative" name="Cumulative Savings ($)" stroke="hsl(var(--secondary))" />
      </GlassChart>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-time Tariff/VPP Optimizer</h2>
          <p className="text-muted-foreground">
            Multi-objective optimization for cost, emissions, and grid services
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="vpp-mode"
              checked={vppEnabled}
              onCheckedChange={setVppEnabled}
            />
            <label htmlFor="vpp-mode" className="text-sm">VPP Mode</label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="real-time"
              checked={realTimeMode}
              onCheckedChange={setRealTimeMode}
            />
            <label htmlFor="real-time" className="text-sm">Real-time</label>
          </div>
          <Button onClick={createDemoOptimization} disabled={isOptimizing}>
            <Zap className="mr-2 h-4 w-4" />
            Create Demo
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {selectedOpt?.savings_projections && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">
                    ${selectedOpt.savings_projections.annual_savings_p50.toFixed(0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Annual Savings (P50)</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
                <div>
                  <div className="text-2xl font-bold">
                    {selectedOpt.savings_projections.roi_percent.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Annual ROI</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                <div>
                  <div className="text-2xl font-bold">
                    {selectedOpt.savings_projections.payback_years.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Payback Years</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Battery className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">
                    {vppEnabled ? 'Active' : 'Disabled'}
                  </div>
                  <div className="text-sm text-muted-foreground">VPP Participation</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Optimization Results */}
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Schedule & Savings</CardTitle>
          <CardDescription>
            Optimized battery and export schedule with projected savings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedOpt?.dispatch_schedule ? (
            <Tabs defaultValue="dispatch" className="w-full">
              <TabsList>
                <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
                <TabsTrigger value="savings">Savings</TabsTrigger>
                <TabsTrigger value="tariff">Tariff Structure</TabsTrigger>
              </TabsList>
              
              <TabsContent value="dispatch" className="mt-4">
                {renderDispatchChart()}
              </TabsContent>
              
              <TabsContent value="savings" className="mt-4">
                {renderSavingsChart()}
              </TabsContent>
              
              <TabsContent value="tariff" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Current Tariff</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Peak Rate:</span>
                        <span>${selectedOpt.tariff_data.peak_rate}/kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shoulder Rate:</span>
                        <span>${selectedOpt.tariff_data.shoulder_rate}/kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Off-Peak Rate:</span>
                        <span>${selectedOpt.tariff_data.off_peak_rate}/kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Export Rate:</span>
                        <span>${selectedOpt.tariff_data.export_rate}/kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Daily Charge:</span>
                        <span>${selectedOpt.tariff_data.daily_charge}/day</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedOpt.vpp_rules && (
                    <div>
                      <h4 className="font-semibold mb-3">VPP Terms</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Export Limit:</span>
                          <span>{selectedOpt.vpp_rules.export_limit_kw} kW</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Annual Reward:</span>
                          <span>${selectedOpt.vpp_rules.participation_reward}</span>
                        </div>
                        <div className="mt-3">
                          <span className="font-medium">Dispatch Windows:</span>
                          {selectedOpt.vpp_rules.dispatch_windows.map((window, i) => (
                            <div key={i} className="flex justify-between text-sm mt-1">
                              <span>{window.start} - {window.end}:</span>
                              <span>${window.rate}/kWh</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {selectedOpt ? 'Run optimization to see dispatch schedule' : 'Create an optimization to get started'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization List */}
      {optimizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization History</CardTitle>
            <CardDescription>Previous optimization runs and results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {optimizations.map((opt) => (
                <div
                  key={opt.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedOpt?.id === opt.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedOpt(opt)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{opt.site_id}</Badge>
                    <div className="flex gap-1">
                      {opt.vpp_rules && <Badge variant="secondary">VPP</Badge>}
                      {opt.dispatch_schedule && <Badge variant="default">Optimized</Badge>}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Peak Rate: ${opt.tariff_data.peak_rate}/kWh</div>
                    {opt.savings_projections && (
                      <div className="font-medium text-primary">
                        ${opt.savings_projections.annual_savings_p50.toFixed(0)}/year savings
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}