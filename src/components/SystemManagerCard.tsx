import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCECData } from '@/hooks/useCECData';
import { Glass } from './Glass';

interface SystemManagerCardProps {
  devMode: boolean;
}

export const SystemManagerCard: React.FC<SystemManagerCardProps> = ({ devMode }) => {
  const [showManager, setShowManager] = useState(false);
  const { lastUpdated, refreshData } = useCECData();
  
  // System status logic
  const getSystemStatus = () => {
    if (!lastUpdated) return { status: 'loading', label: 'Initializing', icon: Clock };
    
    const daysSinceUpdate = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceUpdate > 7) {
      return { status: 'warning', label: 'Data Stale', icon: AlertCircle };
    }
    
    return { status: 'ready', label: 'Ready', icon: CheckCircle };
  };

  const { status, label, icon: StatusIcon } = getSystemStatus();

  return (
    <>
      <Glass className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-5 h-5 ${
                status === 'ready' ? 'text-emerald-500' :
                status === 'warning' ? 'text-amber-500' :
                'text-muted-foreground'
              }`} />
              <span className="font-medium">System Manager</span>
            </div>
            
            <Badge variant={
              status === 'ready' ? 'default' :
              status === 'warning' ? 'secondary' :
              'outline'
            }>
              {label}
            </Badge>
            
            {lastUpdated && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                Data: {new Date(lastUpdated).toLocaleDateString('en-AU', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowManager(true)}
            className="bg-white/5 border border-white/20"
          >
            <Settings className="w-4 h-4 mr-1" />
            Open Manager
          </Button>
        </div>
      </Glass>

      <Dialog open={showManager} onOpenChange={setShowManager}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>System Manager</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Glass className="p-4">
                <h3 className="font-medium mb-2">CEC Product Catalog</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleDateString('en-AU') : 'Never'}
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshData}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh Catalog
                </Button>
              </Glass>
              
              <Glass className="p-4">
                <h3 className="font-medium mb-2">Energy Plans</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Energy Made Easy integration
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh Plans (Coming Soon)
                </Button>
              </Glass>
            </div>
            
            <Glass className="p-4">
              <h3 className="font-medium mb-2">OCR Models</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Bill and quote parsing accuracy
              </p>
              <Button 
                variant="outline" 
                size="sm"
                disabled
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retrain Models (Coming Soon)
              </Button>
            </Glass>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SystemManagerCard;