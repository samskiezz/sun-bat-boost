import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Search, Zap } from "lucide-react";
import { ProductPickerForm } from "./forms/ProductPickerForm";
import { QuickSizesForm } from "./forms/QuickSizesForm";
import OCRScanner from "./OCRScanner";

export type InputMode = "ocr" | "picker" | "quick";

interface InputModeTabsProps {
  onCalculate: (data: any) => void;
}

export const InputModeTabs = ({ onCalculate }: InputModeTabsProps) => {
  return (
    <Tabs defaultValue="quick" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-8">
        <TabsTrigger value="ocr" className="gap-2">
          <FileText className="w-4 h-4" />
          Upload Quote
        </TabsTrigger>
        <TabsTrigger value="picker" className="gap-2">
          <Search className="w-4 h-4" />
          Product Picker
        </TabsTrigger>
        <TabsTrigger value="quick" className="gap-2">
          <Zap className="w-4 h-4" />
          Quick Sizes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ocr">
        <OCRScanner onDataExtracted={(data) => {
          // Transform OCR data to format expected by calculator
          const formData = {
            mode: "ocr",
            postcode: data.policyCalcInput?.postcode || "",
            installDate: data.policyCalcInput?.installDateISO || new Date().toISOString().split('T')[0],
            solarKw: data.panels.best?.arrayKwDc || 0,
            batteryKwh: data.battery.best?.usableKWh || 0,
            stcPrice: 38,
            vppProvider: "",
            extractedData: data
          };
          onCalculate(formData);
        }} />
      </TabsContent>

      <TabsContent value="picker">
        <ProductPickerForm onSubmit={onCalculate} />
      </TabsContent>

      <TabsContent value="quick">
        <QuickSizesForm onSubmit={onCalculate} />
      </TabsContent>
    </Tabs>
  );
};