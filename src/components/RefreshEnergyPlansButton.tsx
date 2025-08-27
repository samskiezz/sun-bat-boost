import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function RefreshEnergyPlansButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Refreshing energy plans database...');
      
      const refreshResponse = await supabase.functions.invoke('refresh-energy-plans');
      
      if (refreshResponse.error) {
        throw refreshResponse.error;
      }
      
      console.log('📊 Refresh result:', refreshResponse.data);
      setLastRefresh(new Date());
      
      toast({
        title: "Energy Plans Refreshed",
        description: "Successfully updated energy plans database with latest data.",
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Error refreshing plans:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh energy plans. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
      <Button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2"
        variant="outline"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing Energy Plans...' : 'Refresh Energy Plans'}
      </Button>
      
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Live scrape from energy retailers
        </span>
        {lastRefresh && (
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Last: {lastRefresh.toLocaleTimeString()}
          </Badge>
        )}
      </div>
    </div>
  );
}