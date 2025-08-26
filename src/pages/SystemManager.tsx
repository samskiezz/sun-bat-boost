import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Brain, Shield, BarChart3, StopCircle, Pause, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import ComprehensiveCatalogManager from '@/components/ComprehensiveCatalogManager';
import ComprehensiveTrainingDashboard from '@/components/ComprehensiveTrainingDashboard';
import TrainingDashboard from '@/train/dashboard';

export default function SystemManager() {
  const { toast } = useToast();
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  const handleEmergencyStop = async () => {
    setEmergencyLoading(true);
    try {
      // First try to pause/stop the current job gracefully
      const { error: stopError } = await supabase.functions.invoke('cec-comprehensive-scraper', {
        body: { action: 'pause' }
      });
      
      // If pause fails, then do a reset as fallback
      if (stopError) {
        console.log('Pause failed, trying reset as fallback');
        const { error: resetError } = await supabase.functions.invoke('cec-comprehensive-scraper', {
          body: { action: 'reset' }
        });
        
        if (resetError) {
          throw resetError;
        }
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

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Catalog Management
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Training System
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <ComprehensiveCatalogManager />
        </TabsContent>

        <TabsContent value="training">
          <ComprehensiveTrainingDashboard />
        </TabsContent>

        <TabsContent value="analytics">
          <TrainingDashboard />
        </TabsContent>

        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                System monitoring and health checks will be displayed here.
                This includes real-time performance metrics, error tracking, 
                and system resource utilization.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}