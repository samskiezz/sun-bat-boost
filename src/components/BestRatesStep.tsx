import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Star, Check, Zap, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EnergyPlan {
  id: string;
  retailer: string;
  plan_name: string;
  supply_c_per_day: number;
  usage_c_per_kwh_peak: number;
  usage_c_per_kwh_offpeak?: number;
  fit_c_per_kwh: number;
  annualCost: number;
  annualSavings: number;
  savingsPercentage: number;
  meter_type: string;
}

interface BestRatesStepProps {
  locationData: any;
  billData: any;
  systemSize: any;
  onNext: () => void;
}

export default function BestRatesStep({ locationData, billData, systemSize, onNext }: BestRatesStepProps) {
  const [topPlans, setTopPlans] = useState<EnergyPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopPlans = async () => {
      setLoading(true);
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        console.log('🔄 Refreshing energy plans database...');
        // Force refresh to populate thousands of plans
        const refreshResponse = await supabase.functions.invoke('refresh-energy-plans');
        console.log('📊 Refresh result:', refreshResponse);
        
        console.log('📊 Fetching top energy plans for analysis...');
        // Get plans for the user's location - handle both TOU and Smart meter types
        const { data: plans } = await supabase
          .from('energy_plans')
          .select('*')
          .eq('state', locationData.state)
          .in('meter_type', ['TOU', 'Smart', 'Single']) // Include all meter types
          .order('usage_c_per_kwh_peak', { ascending: true })
          .limit(50);
          
        if (plans) {
          const annualUsage = billData.quarterlyUsage * 4;
          const currentAnnualBill = billData.quarterlyBill * 4;
          
          const rankedPlans = plans.map(plan => {
            // Calculate annual cost with this plan
            const dailySupplyCost = plan.supply_c_per_day * 365;
            const usageCost = annualUsage * plan.usage_c_per_kwh_peak;
            const annualCost = (dailySupplyCost + usageCost) / 100; // Convert cents to dollars
            
            const annualSavings = Math.max(0, currentAnnualBill - annualCost);
            const savingsPercentage = (annualSavings / currentAnnualBill) * 100;
            
            return {
              ...plan,
              annualCost: Math.round(annualCost),
              annualSavings: Math.round(annualSavings),
              savingsPercentage: Math.round(savingsPercentage)
            } as EnergyPlan;
          }).sort((a, b) => b.annualSavings - a.annualSavings);
          
          setTopPlans(rankedPlans);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopPlans();
  }, [locationData, billData]);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  if (loading) {
    return (
      <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Finding your best energy rates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Top 5 Best Energy Rates for You
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Based on your usage profile and location in {locationData.postcode}, {locationData.state}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {topPlans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              relative p-6 rounded-2xl cursor-pointer transition-all border-2
              ${selectedPlan === plan.id 
                ? 'border-primary bg-primary/10' 
                : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
              }
              ${index === 0 ? 'ring-2 ring-yellow-500/50' : ''}
            `}
            onClick={() => handlePlanSelect(plan.id)}
          >
            {/* Best Deal Badge */}
            {index === 0 && (
              <div className="absolute -top-2 -right-2 p-2 rounded-full bg-yellow-500 text-black">
                <Star className="h-4 w-4 fill-current" />
              </div>
            )}
            
            {/* Selection Indicator */}
            {selectedPlan === plan.id && (
              <div className="absolute top-4 right-4 p-1 rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              
              {/* Plan Info */}
              <div className="space-y-2">
                <div className="font-semibold text-lg">{plan.retailer}</div>
                <div className="text-sm text-muted-foreground">{plan.plan_name}</div>
                <div className="flex items-center gap-2">
                  <Badge variant={index === 0 ? "default" : "secondary"}>
                    #{index + 1} Best Deal
                  </Badge>
                  {plan.meter_type === 'TOU' && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      TOU
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Rates */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Rates</div>
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">{plan.usage_c_per_kwh_peak}c</span>/kWh
                    {plan.usage_c_per_kwh_offpeak && (
                      <span className="text-muted-foreground"> - {plan.usage_c_per_kwh_offpeak}c</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Supply: {plan.supply_c_per_day}c/day
                  </div>
                  <div className="text-xs text-green-400">
                    Feed-in: {plan.fit_c_per_kwh}c/kWh
                  </div>
                </div>
              </div>
              
              {/* Annual Cost */}
              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">Annual Bill</div>
                <div className="text-2xl font-bold">
                  ${plan.annualCost.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  vs ${billData.quarterlyBill * 4} current
                </div>
              </div>
              
              {/* Savings */}
              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">Annual Savings</div>
                <div className={`text-2xl font-bold ${plan.annualSavings > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {plan.annualSavings > 0 ? '+' : ''}${plan.annualSavings.toLocaleString()}
                </div>
                <Badge 
                  variant={plan.annualSavings > 0 ? "default" : "destructive"}
                  className="text-xs"
                >
                  {plan.savingsPercentage > 0 ? '+' : ''}{plan.savingsPercentage}%
                </Badge>
              </div>
            </div>
            
            {/* Solar Integration Preview */}
            {systemSize.recommendedKw > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-green-500" />
                  <span>With {systemSize.recommendedKw}kW solar system:</span>
                  <span className="font-semibold text-green-500">
                    Additional ${Math.round(systemSize.estimatedGeneration * plan.fit_c_per_kwh / 100)} feed-in credit/year
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
        
        {/* Next Button */}
        <div className="pt-6 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {selectedPlan ? 'Plan selected! Continue to see detailed savings analysis.' : 'Select a plan to continue'}
          </div>
          <Button 
            onClick={onNext}
            disabled={!selectedPlan}
            className="bg-primary hover:bg-primary/90"
          >
            Analyze Savings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}