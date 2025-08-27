import { InputModeTabs } from "@/components/InputModeTabs";

interface RebatesCalculatorModuleProps {
  // Optional props to match original interface if needed
}

export default function RebatesCalculatorModule(props: RebatesCalculatorModuleProps = {}) {
  const handleCalculate = (formData: any) => {
    console.log("Calculate rebates from your 3 functions:", formData);
    // This will receive data from:
    // 1. OCR Scanner (UniversalOCRScanner)
    // 2. Product Picker (ProductPickerForm) 
    // 3. Quick Sizes (QuickSizesForm)
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3">
        <div className="text-primary text-2xl">🧮</div>
        <div>
          <h2 className="text-2xl font-bold">Rebates Calculator</h2>
          <p className="text-sm opacity-80">Your 3 powerful calculation methods restored</p>
        </div>
      </div>

      <InputModeTabs 
        onCalculate={handleCalculate}
        appMode="pro"
        tier="pro" 
        unlimitedTokens={true}
      />
    </div>
  );
}