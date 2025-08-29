import { useEffect, useState } from "react";
import { Database, Zap, TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlanStats {
  totalPlans: number;
  byState: Record<string, number>;
  byRetailer: Record<string, number>;
  lastUpdated: string | null;
}

export default function EnergyPlanStats() {
  const [stats, setStats] = useState<PlanStats>({
    totalPlans: 0,
    byState: {},
    byRetailer: {},
    lastUpdated: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      // Get total count
      const { count: totalCount } = await supabase
        .from('energy_plans')
        .select('*', { count: 'exact', head: true });

      // Get plans by state
      const { data: stateData } = await supabase
        .from('energy_plans')
        .select('state')
        .order('state');

      // Get plans by retailer (top 10)
      const { data: retailerData } = await supabase
        .from('energy_plans')
        .select('retailer')
        .order('retailer');

      // Get last updated
      const { data: lastUpdatedData } = await supabase
        .from('energy_plans')
        .select('last_refreshed')
        .order('last_refreshed', { ascending: false })
        .limit(1)
        .single();

      // Process state counts
      const stateCounts: Record<string, number> = {};
      stateData?.forEach(plan => {
        stateCounts[plan.state] = (stateCounts[plan.state] || 0) + 1;
      });

      // Process retailer counts (top 6)
      const retailerCounts: Record<string, number> = {};
      retailerData?.forEach(plan => {
        retailerCounts[plan.retailer] = (retailerCounts[plan.retailer] || 0) + 1;
      });

      // Get top 6 retailers
      const topRetailers = Object.entries(retailerCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6)
        .reduce((acc, [retailer, count]) => {
          acc[retailer] = count;
          return acc;
        }, {} as Record<string, number>);

      setStats({
        totalPlans: totalCount || 0,
        byState: stateCounts,
        byRetailer: topRetailers,
        lastUpdated: lastUpdatedData?.last_refreshed || null
      });
    } catch (error) {
      console.error('Error fetching energy plan stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const refreshPlans = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('energy-plans-scraper');
      
      if (error) throw error;
      
      toast.success(`Successfully scraped ${data.stats.plans_inserted} energy plans from ${data.stats.retailers_count} retailers`);
      
      // Refresh the stats after successful update by re-fetching
      setTimeout(() => {
        fetchStats();
      }, 1000);
    } catch (error) {
      console.error('Error scraping plans:', error);
      toast.error('Failed to scrape energy plans from Energy Made Easy');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-white/20 bg-white/10 backdrop-blur-xl animate-pulse">
        <CardContent className="p-6">
          <div className="h-6 bg-white/10 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded"></div>
            <div className="h-4 bg-white/10 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Energy Plans Database</h3>
              <p className="text-sm text-muted-foreground">
                Live data from Australian Energy Regulator
              </p>
            </div>
          </div>
          {stats.totalPlans === 0 && (
            <Button 
              onClick={refreshPlans} 
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Load Real Data
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/20 border border-primary/20">
            <div className="text-2xl font-bold text-primary">
              {stats.totalPlans.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Total Plans</p>
          </div>

          <div className="text-center p-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-green-600/20 border border-green-500/20">
            <div className="text-2xl font-bold text-green-600">
              {Object.keys(stats.byState).length}
            </div>
            <p className="text-sm text-muted-foreground">States Covered</p>
          </div>

          <div className="text-center p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-blue-600/20 border border-blue-500/20">
            <div className="text-2xl font-bold text-blue-600">
              {Object.keys(stats.byRetailer).length}+
            </div>
            <p className="text-sm text-muted-foreground">Retailers</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              By State
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byState)
                .sort(([,a], [,b]) => b - a)
                .map(([state, count]) => (
                  <Badge key={state} variant="secondary" className="bg-white/10">
                    {state}: {count.toLocaleString()}
                  </Badge>
                ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Retailers
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRetailer)
                .sort(([,a], [,b]) => b - a)
                .map(([retailer, count]) => (
                  <Badge key={retailer} variant="outline" className="bg-white/5 border-white/20">
                    {retailer}: {count.toLocaleString()}
                  </Badge>
                ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-muted-foreground">
            Last updated: {formatDate(stats.lastUpdated)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}