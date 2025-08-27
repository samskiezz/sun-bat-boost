import { useState, useRef, useEffect } from "react";
import { HeroHeader } from "./HeroHeader";
import { InputModeTabs } from "./InputModeTabs";
import { ResultCards } from "./ResultCards";
import { LimitLine } from "./LimitLine";
import { InitialDataLoader } from "./InitialDataLoader";
import { SEOHead } from "./SEOHead";
import { EnhancedAISystem } from "./EnhancedAISystem";
import PricingTiers from "./PricingTiers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculateBatteryRebates, getStateFromPostcode, type RebateInputs } from "@/utils/rebateCalculations";
import { calculateSolarRebates, type CalculatorInputs } from "@/utils/solarCalculations";
import { checkEligibility } from "@/utils/eligibilityChecker";
import { useToast } from "@/hooks/use-toast";
import { useCECData } from "@/hooks/useCECData";
import { AICore, type AppMode } from "@/lib/ai/AICore";
import { Sparkles, Zap, Brain, Crown, Users, Infinity } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const SolarCalculator = () => {
  const [results, setResults] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [appMode, setAppMode] = useState<AppMode>('lite');
  const [userTier, setUserTier] = useState<'free' | 'lite' | 'pro'>('free');
  const [showAI, setShowAI] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [unlimitedTokens, setUnlimitedTokens] = useState(false);
  const { toast } = useToast();
  const { lastUpdated, refreshData } = useCECData();
  const aiCoreRef = useRef<AICore | null>(null);

  useEffect(() => {
    // Initialize AI Core and show AI based on user tier OR dev mode
    const effectiveTier = unlimitedTokens ? 'pro' : userTier;
    if (effectiveTier !== 'free') {
      aiCoreRef.current = new AICore({ mode: appMode });
      setShowAI(true);
    } else {
      setShowAI(false);
    }
  }, [appMode, userTier, unlimitedTokens]);

  useEffect(() => {
    // Load user tier from localStorage
    const savedTier = localStorage.getItem('userTier') as 'free' | 'lite' | 'pro' | null;
    const savedAuth = localStorage.getItem('isAuthenticated') === 'true';
    
    if (savedTier) {
      setUserTier(savedTier);
      setIsAuthenticated(savedAuth);
      if (savedTier === 'pro') {
        setAppMode('pro');
      }
    }
  }, []);

  const handleCalculate = async (formData: any) => {
    // Check usage limits
    if (!canUseCalculator()) {
      toast({
        title: "Daily limit reached",
        description: "You've used all 3 free calculations today. Sign up for unlimited access!",
        variant: "destructive"
      });
      setShowPricing(true);
      return;
    }

    incrementUsage();

    // Notify AI Core of user action if AI is available
    const effectiveTier = unlimitedTokens ? 'pro' : userTier;
    if (effectiveTier !== 'free' && aiCoreRef.current) {
      await aiCoreRef.current.onUserAction('USER_STARTED_CALCULATION', formData);
    }
    try {
      // Ensure proper data extraction for both picker and quick modes
      const solarKw = formData.solarKw || formData.systemKw || 0;
      const batteryKwh = formData.batteryId === "none" ? 0 : 
        (formData.batteryKwh || (formData.selectedProducts?.battery?.capacity_kwh) || 0);
      
      const input = {
        postcode: formData.postcode,
        solarKw,
        batteryKwh,
        installDate: formData.installDate,
        stcPrice: formData.stcPrice,
        vppProvider: formData.vppProvider,
        mode: formData.mode
      };

      // Calculate solar rebates (STCs for panels)
      let solarResults = null;
      if (solarKw && solarKw > 0) {
        const solarInputs: CalculatorInputs = {
          install_date: formData.installDate,
          postcode: formData.postcode.toString(),
          pv_dc_size_kw: solarKw,
          stc_price_aud: formData.stcPrice,
          battery_capacity_kwh: batteryKwh || 0,
          vpp_provider: formData.vppProvider && formData.vppProvider !== "None" ? formData.vppProvider : null
        };
        
        solarResults = calculateSolarRebates(solarInputs);
      }

      // Calculate battery rebates using the new logic
      let batteryResults = null;
      if (batteryKwh && batteryKwh > 0) {
        const state = getStateFromPostcode(parseInt(formData.postcode));
        const rebateInputs: RebateInputs = {
          install_date: formData.installDate,
          state_or_territory: state,
          has_rooftop_solar: solarKw > 0,
          battery: {
            usable_kWh: batteryKwh,
            vpp_capable: true,
            battery_on_approved_list: true
          },
          stc_spot_price: formData.stcPrice,
          joins_vpp: formData.vppProvider && formData.vppProvider !== "None"
        };
        
        batteryResults = calculateBatteryRebates(rebateInputs);
      }

      const eligibilityResults = checkEligibility(input, true);
      
      // Enhanced results with rebate information
      const solarSTCs = solarResults?.stc_value_aud || 0;
      const batteryFederal = batteryResults?.federal_discount || 0;
      const totalFederal = solarSTCs + batteryFederal;
      
      const calculationResults = {
        totals: {
          today: (solarResults?.total_rebate_aud || 0) + (batteryResults?.total_cash_incentive || 0),
          federal: totalFederal,
          state: (batteryResults?.state_rebate || 0) + (solarResults?.battery_program?.battery_rebate_aud || 0),
          vpp: (batteryResults?.vpp_bonus || 0) + (solarResults?.vpp?.vpp_incentive_aud || 0)
        },
        solarRebates: solarResults,
        batteryRebates: batteryResults,
        input: input
      };

      setResults(calculationResults);
      setEligibility(eligibilityResults);

      toast({
        title: "Calculation complete",
        description: `Total rebates available: $${calculationResults.totals.today.toLocaleString()}`
      });

      // Notify AI Core of successful calculation
      const effectiveTier = unlimitedTokens ? 'pro' : userTier;
      if (effectiveTier !== 'free' && aiCoreRef.current) {
        await aiCoreRef.current.onUserAction('USER_COMPLETED_CALCULATION', calculationResults);
      }
    } catch (error) {
      toast({
        title: "Calculation failed",
        description: "Please check your inputs and try again.",
        variant: "destructive"
      });
    }
  };

  const handleRequestCall = () => {
    toast({
      title: "Call requested", 
      description: "A Hilts Group expert will contact you within 24 hours."
    });
  };

  const handleSuggestionAccept = (suggestion: any) => {
    toast({
      title: "AI Suggestion Applied",
      description: `Applied: ${suggestion.reason}`,
    });
  };

  const handleTierUpgrade = (tier: 'lite' | 'pro') => {
    if (tier === 'lite') {
      // Simulate sign-up process
      setUserTier('lite');
      setIsAuthenticated(true);
      localStorage.setItem('userTier', 'lite');
      localStorage.setItem('isAuthenticated', 'true');
      setShowPricing(false);
      toast({
        title: "Welcome to Lite!",
        description: "You now have unlimited calculations with AI suggestions.",
      });
    } else if (tier === 'pro') {
      // This would trigger Stripe payment flow
      setShowPricing(false);
      toast({
        title: "Redirecting to payment...",
        description: "You'll be redirected to complete your Pro upgrade.",
      });
      // TODO: Integrate with Stripe payment flow
    }
  };

  const handleSignUp = () => {
    handleTierUpgrade('lite');
  };

  const handleUpgrade = () => {
    setShowPricing(true);
  };

  const canUseCalculator = () => {
    if (unlimitedTokens || userTier !== 'free') return true;
    
    // Check daily usage for free tier
    const today = new Date().toDateString();
    const usageKey = `calculator_usage_${today}`;
    const todayUsage = parseInt(localStorage.getItem(usageKey) || '0');
    
    return todayUsage < 3;
  };

  const incrementUsage = () => {
    if (!unlimitedTokens && userTier === 'free') {
      const today = new Date().toDateString();
      const usageKey = `calculator_usage_${today}`;
      const todayUsage = parseInt(localStorage.getItem(usageKey) || '0');
      localStorage.setItem(usageKey, (todayUsage + 1).toString());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SEOHead results={results} location={results?.input?.postcode} />
      <InitialDataLoader />
      
      {/* Tier Status Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">Solar Rebate Calculator</h1>
              <Badge variant={
                (unlimitedTokens || userTier === 'pro') ? 'default' : 
                userTier === 'lite' ? 'secondary' : 
                'outline'
              } className="gap-1">
                {(unlimitedTokens || userTier === 'pro') && <Crown className="w-3 h-3" />}
                {(userTier === 'lite' && !unlimitedTokens) && <Zap className="w-3 h-3" />}
                {(userTier === 'free' && !unlimitedTokens) && <Users className="w-3 h-3" />}
                {unlimitedTokens ? 'Pro (Dev)' : userTier === 'pro' ? 'Pro' : userTier === 'lite' ? 'Lite' : 'Free'} 
                {(userTier === 'free' && !unlimitedTokens) && ' (3 daily)'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Unlimited Tokens Dev Toggle */}
              <div className="flex items-center gap-2 px-3 py-1 bg-card border rounded-lg">
                <Label htmlFor="unlimited-tokens" className="text-xs font-medium">
                  <Infinity className="w-3 h-3 inline mr-1" />
                  Dev Mode
                </Label>
                <Switch
                  id="unlimited-tokens"
                  checked={unlimitedTokens}
                  onCheckedChange={setUnlimitedTokens}
                />
              </div>
              
              {(userTier === 'free' && !unlimitedTokens) && (
                <Button size="sm" onClick={() => setShowPricing(true)} className="bg-blue-600 hover:bg-blue-700">
                  Sign Up Free
                </Button>
              )}
              {(userTier === 'lite' && !unlimitedTokens) && (
                <Button size="sm" onClick={handleUpgrade} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                  <Crown className="w-4 h-4 mr-1" />
                  Upgrade to Pro
                </Button>
              )}
              {(unlimitedTokens || userTier === 'pro') && (
                <Badge variant="default" className="bg-gradient-to-r from-purple-600 to-indigo-600">
                  <Crown className="w-3 h-3 mr-1" />
                  {unlimitedTokens ? 'Pro (Dev Mode)' : 'Pro Active'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <HeroHeader lastUpdated={lastUpdated ? new Date(lastUpdated).toLocaleDateString('en-AU', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : "Loading..."} />
        
        <div className={`mx-auto space-y-8 ${showAI ? 'max-w-7xl' : 'max-w-4xl'}`}>
          <div className={`grid gap-8 ${showAI ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {/* Main Calculator Area */}
            <div className={`space-y-8 ${showAI ? 'lg:col-span-2' : ''}`}>
              <InputModeTabs onCalculate={handleCalculate} appMode={appMode} />
              
              {results && (
                <ResultCards results={results} />
              )}
              
              {results && eligibility && (
                <div className="space-y-8">
                  <LimitLine 
                    status={eligibility.status}
                    reasons={eligibility.reasons}
                    suggestions={eligibility.suggestions}
                    onRequestCall={handleRequestCall}
                  />
                  
                  <div className="text-center text-sm text-muted-foreground">
                    <p>Figures use current published formulas and datasets.</p>
                    <p>Verified by a CEC-accredited designer before final quote.</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Enhanced AI System Panel */}
            {showAI && (
              <div className="lg:col-span-1">
                <div className="sticky top-8">
                  <EnhancedAISystem 
                    mode={appMode} 
                    tier={unlimitedTokens ? 'pro' : userTier}
                    onSuggestionAccept={handleSuggestionAccept}
                    onUpgradeRequest={handleUpgrade}
                    className="h-[600px]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Modal */}
      <Dialog open={showPricing} onOpenChange={setShowPricing}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
          </DialogHeader>
          <PricingTiers
            currentTier={userTier}
            onTierSelect={handleTierUpgrade}
            onSignUp={handleSignUp}
            onUpgrade={() => handleTierUpgrade('pro')}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SolarCalculator;