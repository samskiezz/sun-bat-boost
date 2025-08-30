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

  const generateTypicalLoadProfile = () => {
    // Generate a typical residential load profile (24 hours)
    return Array.from({ length: 24 }, (_, hour) => {
      // Base load with peaks at morning and evening
      let load = 1.5; // Base load 1.5kW
      
      // Morning peak (6-9 AM)
      if (hour >= 6 && hour <= 9) {
        load += 2 + Math.random() * 1.5;
      }
      // Evening peak (5-10 PM)
      else if (hour >= 17 && hour <= 22) {
        load += 3 + Math.random() * 2;
      }
      // Daytime moderate usage
      else if (hour >= 10 && hour <= 16) {
        load += 0.5 + Math.random() * 1;
      }
      // Night time low usage
      else {
        load += Math.random() * 0.5;
      }
      
      return Math.round(load * 100) / 100;
    });
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
      const locations = ['Sydney', 'Melbourne', 'Adelaide', 'Perth', 'Brisbane'];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const systemKw = 5 + Math.random() * 15;
      const batteryKwh = 10 + Math.random() * 20;
      
      const siteId = `${location.toLowerCase()}_${Date.now()}`;
      
      toast({ title: "Creating optimization and running analysis..." });

      // Call the real tariff optimizer edge function
      const { data, error } = await supabase.functions.invoke('tariff-optimizer', {
        body: {
          siteId,
          systemKw: Math.round(systemKw * 10) / 10,
          batteryKwh: Math.round(batteryKwh * 10) / 10,
          location,
          loadProfile: generateTypicalLoadProfile(),
          vppEnabled,
          realTimeEnabled: realTimeMode
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Optimization failed');
      }

      // Refresh optimizations from database
      await loadOptimizations();
      
      // Find and select the newly created optimization
      const newOpts = await supabase
        .from('tariff_optimizations')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (newOpts.data?.[0]) {
        const opt = newOpts.data[0];
        const mappedOpt: TariffOptimization = {
          id: opt.id,
          site_id: opt.site_id,
          created_at: opt.created_at,
          tariff_data: opt.tariff_data as TariffOptimization['tariff_data'],
          vpp_rules: opt.vpp_rules as TariffOptimization['vpp_rules'],
          optimization_params: opt.optimization_params as TariffOptimization['optimization_params'],
          dispatch_schedule: (opt.optimization_params as any)?.dispatch_schedule || [],
          savings_projection: (opt.optimization_params as any)?.savings_projection || [],
          annual_savings: (opt.optimization_params as any)?.annual_savings || 0,
          vpp_revenue: (opt.optimization_params as any)?.vpp_revenue || 0
        };
        setSelectedOptimization(mappedOpt);
      }

      toast({ 
        title: "Multi-objective optimization completed!", 
        description: data.message 
      });
    } catch (error: any) {
      console.error('Error creating demo optimization:', error);
      toast({ 
        title: "Error creating optimization", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const runOptimization = async () => {
    if (!selectedOptimization) return;
    
    setIsOptimizing(true);
    try {
      // Call the real tariff optimizer edge function
      const { data, error } = await supabase.functions.invoke('tariff-optimizer', {
        body: {
          siteId: selectedOptimization.site_id,
          systemKw: selectedOptimization.optimization_params.solar_capacity || 8.5,
          batteryKwh: selectedOptimization.optimization_params.battery_capacity || 13.5,
          location: 'Sydney', // Default location
          loadProfile: generateTypicalLoadProfile(),
          vppEnabled,
          realTimeEnabled: realTimeMode
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Optimization failed');
      }

      // Refresh optimizations to get the latest data
      await loadOptimizations();

      toast({ 
        title: "Multi-objective optimization completed!", 
        description: data.message 
      });
    } catch (error: any) {
      console.error('Optimization error:', error);
      toast({ 
        title: "Optimization failed", 
        description: error.message,
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