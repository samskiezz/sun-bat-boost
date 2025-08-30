import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Brain, Shield, BarChart3, StopCircle, Pause, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import MasterTrainingControl from '@/components/MasterTrainingControl';
import OneCatalogManager from '@/components/OneCatalogManager';
import TrainingImprovementsDashboard from '@/components/TrainingImprovementsDashboard';
import TrainingAutomation from '@/components/TrainingAutomation';
import EnergyPlanStats from '@/components/EnergyPlanStats';
import RefreshEnergyPlansButton from '@/components/RefreshEnergyPlansButton';
import DnspPanel from "@/components/SystemManager/DnspPanel";
import DnspBuilderPanel from "@/components/SystemManager/DnspBuilderPanel";
import DnspChecker from "@/components/SystemManager/DnspChecker";
import NetworkMapVisualization from "@/components/SystemManager/NetworkMapVisualization";
import EnhancedTrainingSystem from "@/components/EnhancedTrainingSystem";
// Tab component imports
import { TwinUncertaintyTab } from "@/components/TwinUncertaintyTabNew";
import { TariffVPPOptimizerTab } from "@/components/TariffVPPOptimizerTabNew";
import { ComplianceTab } from "@/components/ComplianceTab";
import { MonitoringTab } from "@/components/MonitoringTab";
import { SystemHealthDashboard } from "@/components/SystemHealthDashboard";

export default function SystemManager() {
  const { toast } = useToast();
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  const handleEmergencyStop = async () => {
    setEmergencyLoading(true);
    try {
      // Pause the current job gracefully
      const { error: pauseError } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'pause' }
      });
      
      if (pauseError) {
        console.error('Pause failed:', pauseError);
        throw pauseError;
      }

      toast({
        title: "Emergency Stop Executed", 
        description: "All running processes have been paused/stopped.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Emergency stop error:', error);
      toast({
        title: "Emergency Stop Failed",
        description: "Failed to stop processes. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setEmergencyLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Emergency Controls */}
      <Card className="border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Emergency Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleEmergencyStop}
              disabled={emergencyLoading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <StopCircle className="w-4 h-4" />
              {emergencyLoading ? 'Pausing...' : 'Emergency Pause All Processes'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Use this to immediately pause all running scraping, training, and processing tasks.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Shield className="w-6 h-6" />
            Autonomous Solar Design System Manager
            <Badge variant="outline" className="ml-auto">
              Production Ready
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Comprehensive management interface for the autonomous solar design system. 
            This system scrapes the entire CEC catalog, trains on 50,000 episodes, 
            and provides production-ready solar design optimization with explainable AI.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="health" className="space-y-6">
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Catalog
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Training
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            System Monitor
          </TabsTrigger>
          <TabsTrigger value="twin" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Twin & Uncertainty
          </TabsTrigger>
          <TabsTrigger value="optimizer" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Tariff/VPP Optimizer
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="drift" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Drift Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <SystemHealthDashboard />
        </TabsContent>

        <TabsContent value="catalog">
          <OneCatalogManager />
        </TabsContent>

        <TabsContent value="training">
          <div className="space-y-6">
            <MasterTrainingControl />
            <EnhancedTrainingSystem />
          </div>
        </TabsContent>

        <TabsContent value="automation">
          <TrainingAutomation />
        </TabsContent>

        <TabsContent value="analytics">
          <TrainingImprovementsDashboard />
        </TabsContent>

        <TabsContent value="monitoring">
          <div className="space-y-6">
            <EnergyPlanStats />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Energy Plans Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Manage and refresh the energy plans database with live data from energy retailers.
                  </p>
                  <RefreshEnergyPlansButton />
                </div>
              </CardContent>
            </Card>
            <NetworkMapVisualization />
            <DnspPanel />
            <DnspBuilderPanel />
            <DnspChecker />
          </div>
        </TabsContent>

        <TabsContent value="twin">
          <TwinUncertaintyTab />
        </TabsContent>

        <TabsContent value="optimizer">
          <TariffVPPOptimizerTab />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceTab />
        </TabsContent>

        <TabsContent value="drift">
          <MonitoringTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}