import { useState, useRef, useEffect } from "react";
import { HeroHeader } from "./HeroHeader";
import { InputModeTabs } from "./InputModeTabs";
import { ResultCards } from "./ResultCards";
import { LimitLine } from "./LimitLine";
import { InitialDataLoader } from "./InitialDataLoader";
import { SEOHead } from "./SEOHead";
import { AIAssistant } from "./AIAssistant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateBatteryRebates, getStateFromPostcode, type RebateInputs } from "@/utils/rebateCalculations";
import { calculateSolarRebates, type CalculatorInputs } from "@/utils/solarCalculations";
import { checkEligibility } from "@/utils/eligibilityChecker";
import { useToast } from "@/hooks/use-toast";
import { useCECData } from "@/hooks/useCECData";
import { AICore, type AppMode } from "@/lib/ai/AICore";
import { Sparkles, Zap, Brain } from "lucide-react";

const SolarCalculator = () => {
  const [results, setResults] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [appMode, setAppMode] = useState<AppMode>('lite');
  const [showAI, setShowAI] = useState(false);
  const { toast } = useToast();
  const { lastUpdated, refreshData } = useCECData();
  const aiCoreRef = useRef<AICore | null>(null);

  useEffect(() => {
    // Initialize AI Core when mode changes
    if (appMode === 'pro') {
      aiCoreRef.current = new AICore({ mode: appMode });
      setShowAI(true);
    } else {
      setShowAI(false);
    }
  }, [appMode]);

  const handleCalculate = async (formData: any) => {
    // Notify AI Core of user action if in pro mode
    if (appMode === 'pro' && aiCoreRef.current) {
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
      if (appMode === 'pro' && aiCoreRef.current) {
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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SEOHead results={results} location={results?.input?.postcode} />
      <InitialDataLoader />
      
      {/* Mode Toggle Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">Rebate Calculator</h1>
              <Badge variant={appMode === 'pro' ? 'default' : 'outline'} className="gap-1">
                {appMode === 'pro' ? <Sparkles className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                {appMode === 'pro' ? 'Pro Mode' : 'Lite Mode'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={appMode === 'lite' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAppMode('lite')}
              >
                <Zap className="w-4 h-4 mr-1" />
                Lite
              </Button>
              <Button
                variant={appMode === 'pro' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAppMode('pro')}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Pro
              </Button>
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
            
            {/* AI Assistant Panel (Pro Mode Only) */}
            {showAI && (
              <div className="lg:col-span-1">
                <div className="sticky top-8">
                  <AIAssistant 
                    mode={appMode} 
                    onSuggestionAccept={handleSuggestionAccept}
                    className="h-[600px]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolarCalculator;