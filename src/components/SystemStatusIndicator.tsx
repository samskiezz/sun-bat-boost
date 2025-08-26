import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Clock, Settings } from 'lucide-react';
import { checkReadinessGates, type ReadinessStatus } from '@/lib/readiness-gates';
import { useNavigate } from 'react-router-dom';

export default function SystemStatusIndicator() {
  const [status, setStatus] = useState<ReadinessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function checkStatus() {
    try {
      const result = await checkReadinessGates();
      setStatus(result);
    } catch (error) {
      console.error('Failed to check system status:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 animate-spin" />
            <span className="text-sm">Checking system status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">System Status</span>
          {status?.allPassing ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ready
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Initializing
            </Badge>
          )}
        </div>

        {status && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {status.allPassing 
                ? "All systems operational. Ready for production use."
                : `${status.gates.filter(g => !g.passing).length} gates need attention.`
              }
            </div>
            
            {!status.allPassing && (
              <div className="space-y-1">
                {status.gates.filter(g => !g.passing).slice(0, 2).map((gate) => (
                  <div key={gate.gate} className="flex items-center justify-between text-xs">
                    <span className="truncate">{gate.gate.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground ml-2">
                      {gate.current}/{gate.required}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={() => navigate('/system')}
          variant="outline" 
          size="sm" 
          className="w-full"
        >
          <Settings className="w-3 h-3 mr-2" />
          System Manager
        </Button>
      </CardContent>
    </Card>
  );
}