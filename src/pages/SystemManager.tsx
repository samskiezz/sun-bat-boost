import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Brain, Shield, BarChart3 } from 'lucide-react';
import ComprehensiveCatalogManager from '@/components/ComprehensiveCatalogManager';
import ComprehensiveTrainingDashboard from '@/components/ComprehensiveTrainingDashboard';
import TrainingDashboard from '@/train/dashboard';

export default function SystemManager() {
  return (
    <div className="container mx-auto p-6 space-y-6">
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