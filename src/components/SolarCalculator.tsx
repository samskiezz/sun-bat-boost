import { useState } from "react";
import { HeroHeader } from "./HeroHeader";
import { InputModeTabs } from "./InputModeTabs";
import { ResultCards } from "./ResultCards";
import { LimitLine } from "./LimitLine";
import { InitialDataLoader } from "./InitialDataLoader";
import { calculateBatteryRebates, getStateFromPostcode, type RebateInputs } from "@/utils/rebateCalculations";
import { checkEligibility } from "@/utils/eligibilityChecker";
import { useToast } from "@/hooks/use-toast";
import { useCECData } from "@/hooks/useCECData";

const SolarCalculator = () => {
  const [results, setResults] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const { toast } = useToast();
  const { lastUpdated, refreshData } = useCECData();

  const handleCalculate = (formData: any) => {
    try {
      const input = {
        postcode: formData.postcode,
        solarKw: formData.solarKw,
        batteryKwh: formData.batteryKwh,
        installDate: formData.installDate,
        stcPrice: formData.stcPrice,
        vppProvider: formData.vppProvider,
        mode: formData.mode
      };

      // Calculate rebates using the new logic
      let rebateResults = null;
      if (formData.batteryKwh && formData.batteryKwh > 0) {
        const state = getStateFromPostcode(parseInt(formData.postcode));
        const rebateInputs: RebateInputs = {
          install_date: formData.installDate,
          state_or_territory: state,
          has_rooftop_solar: formData.solarKw > 0,
          battery: {
            usable_kWh: formData.batteryKwh,
            vpp_capable: true,
            battery_on_approved_list: true
          },
          stc_spot_price: formData.stcPrice,
          joins_vpp: formData.vppProvider && formData.vppProvider !== "None"
        };
        
        rebateResults = calculateBatteryRebates(rebateInputs);
      }

      const eligibilityResults = checkEligibility(input, true);
      
      // Enhanced results with rebate information
      const calculationResults = {
        totals: {
          today: rebateResults?.total_cash_incentive || 0,
          federal: rebateResults?.federal_discount || 0,
          state: rebateResults?.state_rebate || 0,
          vpp: rebateResults?.vpp_bonus || 0
        },
        rebates: rebateResults,
        input: input
      };

      setResults(calculationResults);
      setEligibility(eligibilityResults);

      toast({
        title: "Calculation complete",
        description: rebateResults 
          ? `Total rebates available: $${rebateResults.total_cash_incentive.toLocaleString()}`
          : "Solar system calculation complete"
      });
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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <InitialDataLoader />
      <div className="container mx-auto px-4 py-8">
        <HeroHeader lastUpdated={lastUpdated ? new Date(lastUpdated).toLocaleDateString('en-AU', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : "Loading..."} />
        
        <div className="max-w-4xl mx-auto space-y-8">
          <InputModeTabs onCalculate={handleCalculate} />
          
          {results && eligibility && (
            <div className="space-y-8">
              <LimitLine 
                status={eligibility.status}
                reasons={eligibility.reasons}
                suggestions={eligibility.suggestions}
                onRequestCall={handleRequestCall}
              />
              
              <ResultCards results={results} />
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Figures use current published formulas and datasets.</p>
                <p>Verified by a CEC-accredited designer before final quote.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolarCalculator;