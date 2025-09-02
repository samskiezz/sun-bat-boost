import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Server, Database, Zap, Clock, Globe, Cpu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { nowAEST, toAEST } from '@/utils/timeAEST';

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

      // Check FastAPI Backend Health (now using Supabase edge function)
      try {
        const backendStart = Date.now();
        const { data, error } = await supabase.functions.invoke('system-health', {
          body: {}
        });
        const backendTime = Date.now() - backendStart;
        
        if (!error && data) {
          checks.push({
            service: 'Backend Services',
            status: 'healthy',
            message: `All services operational via Supabase`,
            lastChecked: new Date(),
            responseTime: backendTime
          });
        } else {
          checks.push({
            service: 'Backend Services',
            status: 'error',
            message: error?.message || 'Backend services unreachable',
            lastChecked: new Date(),
            responseTime: backendTime
          });
        }
      } catch (error) {
        checks.push({
          service: 'Backend Services',
          status: 'error',
          message: 'Backend server unreachable',
          lastChecked: new Date()
        });
      }

      // Check NASA POWER Integration (now using Supabase edge function)
      try {
        const nasaStart = Date.now();
        const { data, error } = await supabase.functions.invoke('nasa-power-poa', {
          body: {
            lat: -33.8688,
            lng: 151.2093,
            tilt: 20,
            azimuth: 0,
            start: '2025-01-02',
            end: '2025-01-02'
          }
        });
        const nasaTime = Date.now() - nasaStart;
        
        if (!error && data?.daily?.length > 0) {
          checks.push({
            service: 'NASA POWER API',
            status: 'healthy',
            message: `POA data available (${data.daily.length} days)`,
            lastChecked: new Date(),
            responseTime: nasaTime
          });
        } else {
          checks.push({
            service: 'NASA POWER API',
            status: 'error',
            message: error?.message || 'NASA POWER service error',
            lastChecked: new Date(),
            responseTime: nasaTime
          });
        }
      } catch (error) {
        checks.push({
          service: 'NASA POWER API',
          status: 'error',
          message: 'NASA POWER service unavailable',
          lastChecked: new Date()
        });
      }

      // Check Quantum Dispatch Optimizers (now using Supabase edge function)
      const quantumSolvers = [
        { name: 'Classical MILP', solver: 'milp' },
        { name: 'Quantum QAOA', solver: 'qaoa' },
        { name: 'Simulated Annealing', solver: 'anneal' }
      ];

      for (const { name, solver } of quantumSolvers) {
        try {
          const quantumStart = Date.now();
          const { data, error } = await supabase.functions.invoke('quantum-dispatch', {
            body: {
              prices: [0.3, 0.25, 0.5],
              pv: [0, 0.5, 1.2],
              load: [0.6, 0.7, 0.8],
              constraints: { P_ch_max: 5, P_dis_max: 5, soc_min: 0.1, soc_max: 1, eta_ch: 0.95, eta_dis: 0.95, export_cap: 5 },
              solver
            }
          });
          const quantumTime = Date.now() - quantumStart;
          
          if (!error && data?.schedule) {
            checks.push({
              service: `Optimizer: ${name}`,
              status: 'healthy',
              message: `${solver.toUpperCase()} solver operational`,
              lastChecked: new Date(),
              responseTime: quantumTime
            });
          } else {
            checks.push({
              service: `Optimizer: ${name}`,
              status: 'error',
              message: error?.message || 'Solver response incomplete',
              lastChecked: new Date(),
              responseTime: quantumTime
            });
          }
        } catch (error) {
          checks.push({
            service: `Optimizer: ${name}`,
            status: 'error',
            message: error instanceof Error ? error.message : 'Solver failed',
            lastChecked: new Date()
          });
        }
      }

        // Check AEST Time System
        try {
          const aestNow = nowAEST();
          const testDate = toAEST('2025-01-01');
          const isValidAEST = aestNow instanceof Date && testDate instanceof Date;
          
          checks.push({
            service: 'AEST Time System',
            status: isValidAEST ? 'healthy' : 'error',
            message: isValidAEST ? `AEST time working` : 'Time utilities failed',
            lastChecked: new Date()
          });
        } catch (error) {
          checks.push({
            service: 'AEST Time System',
            status: 'error',
            message: 'Time zone calculations failed',
            lastChecked: new Date()
          });
        }

        // Check Feature Flags System
        try {
          const { featureFlags } = await import('@/config/featureFlags');
          const liteFlags = featureFlags('lite');
          const proFlags = featureFlags('pro');
          const isValid = typeof liteFlags === 'object' && typeof proFlags === 'object';
          
          checks.push({
            service: 'Feature Flags System',
            status: isValid ? 'healthy' : 'error',
            message: isValid ? `Lite/Pro modes configured` : 'Feature flags failed',
            lastChecked: new Date()
          });
        } catch (error) {
          checks.push({
            service: 'Feature Flags System',
            status: 'error',
            message: 'Feature flags system unavailable',
            lastChecked: new Date()
          });
        }

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
        .maybeSingle();

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
        .limit(1)
        .maybeSingle();

      const { data: batteryCounts } = await supabase
        .from('batteries')
        .select('id')
        .limit(1)
        .maybeSingle();

      checks.push({
        service: 'Product Data',
        status: (!productCounts && !batteryCounts) ? 'warning' : 'healthy',
        message: productCounts || batteryCounts ? 'Product catalogs available' : 'No product data found',
        lastChecked: new Date()
      });

      setHealthChecks(checks);
    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: "Error",
        description: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      
      // Add a fallback health check entry
      setHealthChecks([{
        service: 'System Health Monitor',
        status: 'error',
        message: `Health check system failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthChecks();
    const interval = setInterval(runHealthChecks, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getServiceIcon = (service: string) => {
    if (service.includes('Database')) return <Database className="h-4 w-4 text-blue-500" />;
    if (service.includes('Backend')) return <Server className="h-4 w-4 text-green-500" />;
    if (service.includes('NASA')) return <Globe className="h-4 w-4 text-blue-400" />;
    if (service.includes('Optimizer') || service.includes('Quantum')) return <Cpu className="h-4 w-4 text-purple-500" />;
    if (service.includes('Time')) return <Clock className="h-4 w-4 text-orange-500" />;
    if (service.includes('Feature')) return <Zap className="h-4 w-4 text-yellow-600" />;
    return <Server className="h-4 w-4 text-gray-500" />;
  };

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
                  {getServiceIcon(check.service)}
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