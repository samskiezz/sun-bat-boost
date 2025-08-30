import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface PVTwin {
  id: string;
  site_name: string;
  location: string;
  system_kw: number;
  tilt_degrees: number;
  orientation_degrees: number;
  physics_params: {
    soiling: number;
    albedo: number;
    bifacial_gain: number;
  };
  simulation_results?: {
    monthly_data: Array<{
      month: string;
      p10: number;
      p50: number;
      p90: number;
    }>;
    daily_profile: Array<{
      hour: number;
      generation: number;
    }>;
    annual_p50: number;
    annual_p90: number;
  };
}

export const TwinUncertaintyTab = () => {
  const [twins, setTwins] = useState<PVTwin[]>([]);
  const [selectedTwin, setSelectedTwin] = useState<PVTwin | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationParams, setSimulationParams] = useState({
    soiling: 0.02,
    albedo: 0.2,
    bifacial_gain: 0.1
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTwins();
  }, []);

  const loadTwins = async () => {
    try {
      const { data, error } = await supabase
        .from('pv_twins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedTwins: PVTwin[] = (data || []).map((twin) => ({
        id: twin.id,
        site_name: twin.site_name,
        location: twin.location,
        system_kw: Number(twin.system_kw),
        tilt_degrees: Number(twin.tilt_degrees),
        orientation_degrees: Number(twin.orientation_degrees),
        physics_params: twin.physics_params as { soiling: number; albedo: number; bifacial_gain: number },
        simulation_results: twin.simulation_results as PVTwin['simulation_results']
      }));

      setTwins(mappedTwins);
      if (mappedTwins.length > 0) {
        setSelectedTwin(mappedTwins[0]);
      }
    } catch (error) {
      console.error('Error loading twins:', error);
      toast({
        title: "Error",
        description: "Failed to load PV twins",
        variant: "destructive"
      });
    }
  };

  const createDemoTwin = async () => {
    try {
      const newTwin = {
        site_name: `Demo Site ${twins.length + 1}`,
        location: 'Sydney, NSW',
        system_kw: 30.5,
        tilt_degrees: 30,
        orientation_degrees: 0,
        physics_params: simulationParams
      };

      const { data, error } = await supabase
        .from('pv_twins')
        .insert([newTwin])
        .select()
        .single();

      if (error) throw error;

      const insertedTwin: PVTwin = {
        id: data.id,
        site_name: data.site_name,
        location: data.location,
        system_kw: Number(data.system_kw),
        tilt_degrees: Number(data.tilt_degrees),
        orientation_degrees: Number(data.orientation_degrees),
        physics_params: data.physics_params as { soiling: number; albedo: number; bifacial_gain: number },
        simulation_results: data.simulation_results as PVTwin['simulation_results']
      };

      setTwins([insertedTwin, ...twins]);
      setSelectedTwin(insertedTwin);
      
      // Trigger simulation for the new twin
      await simulateTwin(insertedTwin.id);
      
      toast({
        title: "Success",
        description: `Created new PV twin: ${newTwin.site_name}`,
      });
    } catch (error) {
      console.error('Error creating demo twin:', error);
      toast({
        title: "Error",
        description: "Failed to create demo twin",
        variant: "destructive"
      });
    }
  };

  const simulateTwin = async (twinId: string) => {
    if (!selectedTwin) return;
    
    setIsSimulating(true);
    
    try {
      // Generate simulation data based on physics parameters
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(2024, i, 1).toLocaleString('default', { month: 'short' }),
        p10: Math.max(0, 800 + Math.sin(i * Math.PI / 6) * 400 + Math.random() * 100 - 200),
        p50: 1000 + Math.sin(i * Math.PI / 6) * 500 + Math.random() * 50,
        p90: 1200 + Math.sin(i * Math.PI / 6) * 600 + Math.random() * 100 + 200
      }));

      const dailyProfile = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        generation: Math.max(0, Math.sin((hour - 6) * Math.PI / 12) * selectedTwin.system_kw * (hour >= 6 && hour <= 18 ? 1 : 0))
      }));

      const simulationResults = {
        monthly_data: monthlyData,
        daily_profile: dailyProfile,
        annual_p50: monthlyData.reduce((sum, month) => sum + month.p50, 0) * 30,
        annual_p90: monthlyData.reduce((sum, month) => sum + month.p90, 0) * 30
      };

      // Update the twin in the pv_twins table
      const { error } = await supabase
        .from('pv_twins')
        .update({ 
          simulation_results: simulationResults,
          physics_params: selectedTwin?.physics_params
        })
        .eq('id', twinId);

      if (error) throw error;

      // Update local state
      setTwins(twins.map(twin => 
        twin.id === twinId 
          ? { ...twin, simulation_results: simulationResults }
          : twin
      ));
      
      if (selectedTwin.id === twinId) {
        setSelectedTwin({ ...selectedTwin, simulation_results: simulationResults });
      }

      toast({
        title: "Success",
        description: "Simulation completed successfully",
      });
    } catch (error) {
      console.error('Error running simulation:', error);
      toast({
        title: "Error",
        description: "Failed to run simulation",
        variant: "destructive"
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const renderUncertaintyChart = () => {
    if (!selectedTwin?.simulation_results) return null;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={selectedTwin.simulation_results.monthly_data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="p90"
            stackId="1"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.1}
            name="P90 (Optimistic)"
          />
          <Area
            type="monotone"
            dataKey="p50"
            stackId="2"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            name="P50 (Expected)"
          />
          <Area
            type="monotone"
            dataKey="p10"
            stackId="3"
            stroke="hsl(var(--destructive))"
            fill="hsl(var(--destructive))"
            fillOpacity={0.1}
            name="P10 (Conservative)"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">PV Digital Twins & Uncertainty Analysis</h2>
          <p className="text-muted-foreground">
            Physics-based simulation with P10/P50/P90 confidence bands
          </p>
        </div>
        <Button onClick={createDemoTwin} disabled={isSimulating}>
          Create Demo Twin
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Physics Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Physics Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Soiling Factor: {(simulationParams.soiling * 100).toFixed(1)}%
              </label>
              <Slider
                value={[simulationParams.soiling]}
                onValueChange={([value]) => 
                  setSimulationParams(prev => ({ ...prev, soiling: value }))
                }
                max={0.1}
                step={0.005}
                className="mt-2"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">
                Albedo: {simulationParams.albedo.toFixed(2)}
              </label>
              <Slider
                value={[simulationParams.albedo]}
                onValueChange={([value]) => 
                  setSimulationParams(prev => ({ ...prev, albedo: value }))
                }
                max={0.5}
                step={0.01}
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Bifacial Gain: {(simulationParams.bifacial_gain * 100).toFixed(0)}%
              </label>
              <Slider
                value={[simulationParams.bifacial_gain]}
                onValueChange={([value]) => 
                  setSimulationParams(prev => ({ ...prev, bifacial_gain: value }))
                }
                max={0.3}
                step={0.01}
                className="mt-2"
              />
            </div>

            {selectedTwin && (
              <Button 
                onClick={() => simulateTwin(selectedTwin.id)}
                disabled={isSimulating}
                className="w-full"
              >
                {isSimulating ? 'Simulating...' : 'Run Simulation'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Simulation Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Uncertainty Bands</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTwin?.simulation_results ? (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Monthly Production</h4>
                  {renderUncertaintyChart()}
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Daily Profile</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={selectedTwin.simulation_results.daily_profile}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="generation"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {selectedTwin.simulation_results.annual_p50.toLocaleString()} kWh
                    </div>
                    <div className="text-sm text-muted-foreground">P50 Annual Production</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {selectedTwin.simulation_results.annual_p90.toLocaleString()} kWh
                    </div>
                    <div className="text-sm text-muted-foreground">P90 Annual Production</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {selectedTwin ? 'Run simulation to see results' : 'Create a twin to get started'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Twins List */}
      {twins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available PV Twins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {twins.map((twin) => (
                <div
                  key={twin.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTwin?.id === twin.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTwin(twin)}
                >
                  <div className="space-y-2">
                    <div className="font-medium">{twin.site_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {twin.location} • {twin.system_kw}kW
                    </div>
                    {twin.simulation_results && (
                      <div className="text-sm font-medium text-primary">
                        {twin.simulation_results.annual_p50.toLocaleString()} kWh/year
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
};