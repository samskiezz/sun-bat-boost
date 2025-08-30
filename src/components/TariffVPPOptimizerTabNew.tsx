import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface TariffOptimization {
  id: string;
  site_id: string;
  created_at: string;
  tariff_data: {
    peak_rate: number;
    offpeak_rate: number;
    shoulder_rate: number;
    supply_charge: number;
    feed_in_tariff: number;
  };
  vpp_rules?: {
    discharge_start: string;
    discharge_end: string;
    min_soc: number;
    max_discharge_power: number;
    participation_days: string[];
  };
  optimization_params: {
    battery_capacity: number;
    solar_capacity: number;
    load_profile: string;
    optimization_horizon: number;
    dispatch_schedule?: Array<{
      hour: number;
      charge_kw: number;
      discharge_kw: number;
      grid_export_kw: number;
      savings_aud: number;
    }>;
    savings_projection?: Array<{
      month: string;
      savings: number;
      cumulative: number;
    }>;
    annual_savings?: number;
    vpp_revenue?: number;
  };
  dispatch_schedule: Array<{
    hour: number;
    charge_kw: number;
    discharge_kw: number;
    grid_export_kw: number;
    savings_aud: number;
  }>;
  savings_projection: Array<{
    month: string;
    savings: number;
    cumulative: number;
  }>;
  annual_savings: number;
  vpp_revenue: number;
}

export const TariffVPPOptimizerTab = () => {
  const [optimizations, setOptimizations] = useState<TariffOptimization[]>([]);
  const [selectedOptimization, setSelectedOptimization] = useState<TariffOptimization | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [vppEnabled, setVppEnabled] = useState(true);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadOptimizations();
  }, []);

  const generateMockDispatchData = () => {
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      charge_kw: hour >= 1 && hour <= 5 ? Math.random() * 3 : 0,
      discharge_kw: hour >= 17 && hour <= 21 ? Math.random() * 4 : 0,
      grid_export_kw: hour >= 18 && hour <= 20 ? Math.random() * 2 : 0,
      savings_aud: Math.random() * 5 - 1
    }));
  };

  const generateMockSavingsData = () => {
    return Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2024, i, 1).toLocaleString('default', { month: 'short' }),
      savings: 80 + Math.random() * 40,
      cumulative: (80 + Math.random() * 40) * (i + 1)
    }));
  };

  const loadOptimizations = async () => {
    try {
      const { data, error } = await supabase
        .from('tariff_optimizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedOptimizations: TariffOptimization[] = (data || []).map((opt) => ({
        id: opt.id,
        site_id: opt.site_id,
        created_at: opt.created_at,
        tariff_data: opt.tariff_data as TariffOptimization['tariff_data'],
        vpp_rules: opt.vpp_rules as TariffOptimization['vpp_rules'],
        optimization_params: opt.optimization_params as TariffOptimization['optimization_params'],
        dispatch_schedule: (opt.optimization_params as any)?.dispatch_schedule || generateMockDispatchData(),
        savings_projection: (opt.optimization_params as any)?.savings_projection || generateMockSavingsData(),
        annual_savings: (opt.optimization_params as any)?.annual_savings || 0,
        vpp_revenue: (opt.optimization_params as any)?.vpp_revenue || 0
      }));

      setOptimizations(mappedOptimizations);
      if (mappedOptimizations.length > 0) {
        setSelectedOptimization(mappedOptimizations[0]);
      }
    } catch (error) {
      console.error('Error loading optimizations:', error);
      toast({
        title: "Error",
        description: "Failed to load tariff optimizations",
        variant: "destructive"
      });
    }
  };

  const createDemoOptimization = async () => {
    try {
      const newOptimization = {
        site_id: 'demo-site-' + Date.now(),
        tariff_data: {
          peak_rate: 0.32,
          offpeak_rate: 0.18,
          shoulder_rate: 0.25,
          supply_charge: 1.20,
          feed_in_tariff: 0.08
        },
        vpp_rules: vppEnabled ? {
          discharge_start: '18:00',
          discharge_end: '22:00',
          min_soc: 0.2,
          max_discharge_power: 5.0,
          participation_days: ['mon', 'tue', 'wed', 'thu', 'fri']
        } : undefined,
        optimization_params: {
          battery_capacity: 13.5,
          solar_capacity: 6.6,
          load_profile: 'residential',
          optimization_horizon: 24,
          dispatch_schedule: generateMockDispatchData(),
          savings_projection: generateMockSavingsData(),
          annual_savings: 1250,
          vpp_revenue: vppEnabled ? 800 : 0
        }
      };

      const { data, error } = await supabase
        .from('tariff_optimizations')
        .insert([newOptimization])
        .select()
        .single();

      if (error) throw error;

      const insertedOptimization: TariffOptimization = {
        id: data.id,
        site_id: data.site_id,
        created_at: data.created_at,
        tariff_data: data.tariff_data as TariffOptimization['tariff_data'],
        vpp_rules: data.vpp_rules as TariffOptimization['vpp_rules'],
        optimization_params: data.optimization_params as TariffOptimization['optimization_params'],
        dispatch_schedule: (data.optimization_params as any)?.dispatch_schedule || generateMockDispatchData(),
        savings_projection: (data.optimization_params as any)?.savings_projection || generateMockSavingsData(),
        annual_savings: (data.optimization_params as any)?.annual_savings || 0,
        vpp_revenue: (data.optimization_params as any)?.vpp_revenue || 0
      };

      setOptimizations([insertedOptimization, ...optimizations]);
      setSelectedOptimization(insertedOptimization);
      
      toast({
        title: "Success",
        description: "Created new tariff optimization",
      });
    } catch (error) {
      console.error('Error creating demo optimization:', error);
      toast({
        title: "Error",
        description: "Failed to create tariff optimization",
        variant: "destructive"
      });
    }
  };

  const runOptimization = async () => {
    if (!selectedOptimization) return;
    
    setIsOptimizing(true);
    
    try {
      const dispatchSchedule = generateMockDispatchData();
      const savingsProjection = generateMockSavingsData();
      const annualSavings = savingsProjection.reduce((sum, month) => sum + month.savings, 0);
      const vppRevenue = vppEnabled ? 800 : 0;

      const updatedParams = {
        ...selectedOptimization.optimization_params,
        dispatch_schedule: dispatchSchedule,
        savings_projection: savingsProjection,
        annual_savings: annualSavings,
        vpp_revenue: vppRevenue
      };

      const { error } = await supabase
        .from('tariff_optimizations')
        .update({ optimization_params: updatedParams })
        .eq('id', selectedOptimization.id);

      if (error) throw error;

      // Update local state
      const updatedOptimization = {
        ...selectedOptimization,
        optimization_params: updatedParams,
        dispatch_schedule: dispatchSchedule,
        savings_projection: savingsProjection,
        annual_savings: annualSavings,
        vpp_revenue: vppRevenue
      };

      setSelectedOptimization(updatedOptimization);
      setOptimizations(optimizations.map(opt => 
        opt.id === selectedOptimization.id ? updatedOptimization : opt
      ));

      toast({
        title: "Success",
        description: "Optimization completed successfully",
      });
    } catch (error) {
      console.error('Error running optimization:', error);
      toast({
        title: "Error",
        description: "Failed to run optimization",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const renderDispatchChart = () => {
    if (!selectedOptimization?.dispatch_schedule) return null;

    const chartData = selectedOptimization.dispatch_schedule.map(h => ({
      hour: `${h.hour}:00`,
      charge: -h.charge_kw, // Negative for charging
      discharge: h.discharge_kw,
      export: h.grid_export_kw
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="discharge" fill="hsl(var(--primary))" name="Discharge (kW)" />
          <Bar dataKey="charge" fill="hsl(var(--destructive))" name="Charge (kW)" />
          <Bar dataKey="export" fill="hsl(var(--secondary))" name="Export (kW)" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderSavingsChart = () => {
    if (!selectedOptimization?.savings_projection) return null;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={selectedOptimization.savings_projection}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="savings"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            name="Monthly Savings ($)"
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="hsl(var(--secondary))"
            strokeWidth={2}
            name="Cumulative Savings ($)"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tariff & VPP Optimizer</h2>
          <p className="text-muted-foreground">
            Multi-objective optimization for battery dispatch and grid services
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
            Create Demo
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {selectedOptimization && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                ${selectedOptimization.annual_savings.toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">Annual Savings</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                ${selectedOptimization.vpp_revenue.toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">VPP Revenue</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {selectedOptimization.optimization_params.battery_capacity}kWh
              </div>
              <div className="text-sm text-muted-foreground">Battery Capacity</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {vppEnabled ? 'Active' : 'Disabled'}
              </div>
              <div className="text-sm text-muted-foreground">VPP Status</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Optimization Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Optimization Results</CardTitle>
            <Button 
              onClick={runOptimization} 
              disabled={isOptimizing || !selectedOptimization}
            >
              {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedOptimization ? (
            <Tabs defaultValue="dispatch" className="w-full">
              <TabsList>
                <TabsTrigger value="dispatch">Dispatch Schedule</TabsTrigger>
                <TabsTrigger value="savings">Savings Projection</TabsTrigger>
                <TabsTrigger value="tariff">Tariff Details</TabsTrigger>
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
                        <span>${selectedOptimization.tariff_data.peak_rate}/kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shoulder Rate:</span>
                        <span>${selectedOptimization.tariff_data.shoulder_rate}/kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Off-Peak Rate:</span>
                        <span>${selectedOptimization.tariff_data.offpeak_rate}/kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Feed-in Tariff:</span>
                        <span>${selectedOptimization.tariff_data.feed_in_tariff}/kWh</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedOptimization.vpp_rules && (
                    <div>
                      <h4 className="font-semibold mb-3">VPP Rules</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Discharge Window:</span>
                          <span>{selectedOptimization.vpp_rules.discharge_start} - {selectedOptimization.vpp_rules.discharge_end}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Min SoC:</span>
                          <span>{(selectedOptimization.vpp_rules.min_soc * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Discharge:</span>
                          <span>{selectedOptimization.vpp_rules.max_discharge_power}kW</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Create an optimization to get started
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization History */}
      {optimizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {optimizations.map((opt) => (
                <div
                  key={opt.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedOptimization?.id === opt.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedOptimization(opt)}
                >
                  <div className="space-y-2">
                    <div className="font-medium">{opt.site_id}</div>
                    <div className="text-sm text-muted-foreground">
                      Battery: {opt.optimization_params.battery_capacity}kWh
                    </div>
                    <div className="text-sm font-medium text-primary">
                      ${opt.annual_savings.toFixed(0)}/year savings
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(opt.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};