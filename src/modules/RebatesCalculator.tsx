import { RebatesCalculator } from "@/components/RebatesCalculator";

export default function RebatesCalculatorModule() {
  // Mock props to match the original interface
  const handleCalculate = (formData: any) => {
    console.log("Calculate rebates:", formData);
  };
  
  const handleRequestCall = () => {
    console.log("Request call");
  };

  return (
    <RebatesCalculator
      onCalculate={handleCalculate}
      results={null}
      eligibility={null}
      onRequestCall={handleRequestCall}
      appMode="standard"
      userTier="free"
      unlimitedTokens={false}
    />
  );
}