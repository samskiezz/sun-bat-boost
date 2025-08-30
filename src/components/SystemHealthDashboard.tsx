import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface HealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastChecked: Date;
  responseTime?: number;
}

export const SystemHealthDashboard = () => {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runHealthChecks = async () => {
    setLoading(true);
    const checks: HealthCheck[] = [];

    try {
      // Check Supabase connection
      const supabaseStart = Date.now();
      const { data: testData, error: supabaseError } = await supabase
        .from('readiness_gates')
        .select('id')
        .limit(1);
      
      const supabaseTime = Date.now() - supabaseStart;
      
      checks.push({
        service: 'Supabase Database',
        status: supabaseError ? 'error' : 'healthy',
        message: supabaseError ? supabaseError.message : `Connected successfully`,
        lastChecked: new Date(),
        responseTime: supabaseTime
      });

      // Check Edge Functions
      const functions = [
        'cec-comprehensive-scraper',
        'specs-enhancer', 
        'energy-plans-scraper',
        'vpp-compatibility-checker'
      ];

      for (const functionName of functions) {
        try {
          const funcStart = Date.now();
          const { error: funcError } = await supabase.functions.invoke(functionName, {
            body: { healthCheck: true }
          });
          const funcTime = Date.now() - funcStart;

          checks.push({
            service: `Edge Function: ${functionName}`,
            status: funcError ? (funcError.message.includes('404') ? 'warning' : 'error') : 'healthy',
            message: funcError ? funcError.message : 'Function responsive',
            lastChecked: new Date(),
            responseTime: funcTime
          });
        } catch (error) {
          checks.push({
            service: `Edge Function: ${functionName}`,
            status: 'error',
            message: error instanceof Error ? error.message : 'Function check failed',
            lastChecked: new Date()
          });
        }
      }

      // Check data freshness
      const { data: lastUpdate } = await supabase
        .from('data_update_tracking')
        .select('table_name, last_updated')
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      const hoursOld = lastUpdate 
        ? (Date.now() - new Date(lastUpdate.last_updated).getTime()) / (1000 * 60 * 60)
        : 999;

      checks.push({
        service: 'Data Freshness',
        status: hoursOld > 24 ? 'warning' : hoursOld > 168 ? 'error' : 'healthy',
        message: lastUpdate 
          ? `Last update: ${Math.round(hoursOld)} hours ago (${lastUpdate.table_name})`
          : 'No update tracking data',
        lastChecked: new Date()
      });

      // Check product counts
      const { data: productCounts } = await supabase
        .from('pv_modules')
        .select('id')
        .limit(1);

      const { data: batteryCounts } = await supabase
        .from('batteries')
        .select('id')
        .limit(1);

      checks.push({
        service: 'Product Data',
        status: (!productCounts && !batteryCounts) ? 'error' : 'healthy',
        message: 'Product catalogs available',
        lastChecked: new Date()
      });

      setHealthChecks(checks);
    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: "Error",
        description: "Health check failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthChecks();
    const interval = setInterval(runHealthChecks, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: HealthCheck['status']) => {
    const variants = {
      healthy: 'bg-green-500/20 text-green-700 border-green-500/50',
      warning: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50', 
      error: 'bg-red-500/20 text-red-700 border-red-500/50'
    };

    return (
      <Badge className={variants[status]}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const overallStatus = healthChecks.some(c => c.status === 'error') 
    ? 'error' 
    : healthChecks.some(c => c.status === 'warning') 
      ? 'warning' 
      : 'healthy';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Health</h2>
          <p className="text-muted-foreground">Real-time monitoring of system components</p>
        </div>
        <Button 
          onClick={runHealthChecks} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Overall Status
            {getStatusBadge(overallStatus)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {healthChecks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <div className="font-medium">{check.service}</div>
                    <div className="text-sm text-muted-foreground">{check.message}</div>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>
                    {check.lastChecked.toLocaleTimeString()}
                  </div>
                  {check.responseTime && (
                    <div>{check.responseTime}ms</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};