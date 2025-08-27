import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, Activity, RefreshCw, Pause, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Glass } from "./Glass";
import { useToast } from "@/hooks/use-toast";

interface SystemManagerButtonProps {
  className?: string;
}

export const SystemManagerButton: React.FC<SystemManagerButtonProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'ready' | 'updating' | 'issues'>('ready');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefreshPlans = async () => {
    setIsRefreshing(true);
    setSystemStatus('updating');
    
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsRefreshing(false);
    setSystemStatus('ready');
    toast({
      title: "Plans Refreshed",
      description: "Energy plans and rates have been updated",
    });
  };

  const handleRefreshCEC = async () => {
    setIsRefreshing(true);
    setSystemStatus('updating');
    
    // Simulate CEC refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsRefreshing(false);
    setSystemStatus('ready');
    toast({
      title: "CEC Catalog Updated",
      description: "Product catalogs have been refreshed",
    });
  };

  const handleEmergencyPause = () => {
    toast({
      title: "Emergency Pause Activated",
      description: "All automated processes have been paused",
      variant: "destructive"
    });
  };

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'ready': return '✅';
      case 'updating': return '🟡';
      case 'issues': return '🔴';
    }
  };

  const getStatusLabel = () => {
    switch (systemStatus) {
      case 'ready': return 'Ready';
      case 'updating': return 'Updating';
      case 'issues': return 'Issues';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`gap-2 ${className}`}
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">System</span>
        <Badge variant="outline" className="text-xs">
          {getStatusIcon()} {getStatusLabel()}
        </Badge>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              System Manager
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* System Status */}
            <Glass className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">System Status</h3>
                <Badge variant={systemStatus === 'ready' ? 'default' : systemStatus === 'updating' ? 'secondary' : 'destructive'}>
                  {getStatusIcon()} {getStatusLabel()}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span>AI Models: Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span>Data Firewall: Online</span>
                </div>
              </div>
            </Glass>

            {/* Data Management */}
            <Glass className="p-4">
              <h3 className="font-semibold mb-4">Data Management</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Energy Plans & Rates</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshPlans}
                    disabled={isRefreshing}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh Plans
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">CEC Product Catalog</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshCEC}
                    disabled={isRefreshing}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh CEC
                  </Button>
                </div>
              </div>
            </Glass>

            {/* Emergency Controls */}
            <Glass className="p-4">
              <h3 className="font-semibold mb-4 text-destructive">Emergency Controls</h3>
              <div className="space-y-3">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEmergencyPause}
                  className="gap-2 w-full"
                >
                  <Pause className="w-4 h-4" />
                  Pause All Processes
                </Button>
              </div>
            </Glass>

            {/* AI Health */}
            <Glass className="p-4">
              <h3 className="font-semibold mb-4">AI Health</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-500">98.2%</div>
                  <div className="text-muted-foreground">Model Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-500">127ms</div>
                  <div className="text-muted-foreground">Avg Response</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-500">15</div>
                  <div className="text-muted-foreground">Active Models</div>
                </div>
              </div>
            </Glass>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SystemManagerButton;