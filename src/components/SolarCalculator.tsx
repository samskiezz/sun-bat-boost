import { useState } from "react";
import { HeroHeader } from "./HeroHeader";
import { InputModeTabs } from "./InputModeTabs";
import { ResultCards } from "./ResultCards";
import { LimitLine } from "./LimitLine";
import { InitialDataLoader } from "./InitialDataLoader";
import { calculateRebates, CalculationInput } from "@/utils/rebateCalculations";
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
      const input: CalculationInput = {
        postcode: formData.postcode,
        solarKw: formData.solarKw,
        batteryKwh: formData.batteryKwh,
        installDate: formData.installDate,
        stcPrice: formData.stcPrice,
        vppProvider: formData.vppProvider,
        mode: formData.mode
      };

      const calculationResults = calculateRebates(input);
      const eligibilityResults = checkEligibility(input, true);

      setResults(calculationResults);
      setEligibility(eligibilityResults);

      toast({
        title: "Calculation complete",
        description: `Total rebates available: $${calculationResults.totals.today.toLocaleString()}`
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