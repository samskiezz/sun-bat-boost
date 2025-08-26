import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Search, Zap, Sparkles } from "lucide-react";
import { ProductPickerForm } from "./forms/ProductPickerForm";
import { QuickSizesForm } from "./forms/QuickSizesForm";
import OCRScanner from "./OCRScanner";
import { Badge } from "@/components/ui/badge";

export type InputMode = "ocr" | "picker" | "quick";

interface InputModeTabsProps {
  onCalculate: (data: any) => void;
  appMode?: 'lite' | 'pro';
}

export const InputModeTabs = ({ onCalculate, appMode = 'lite' }: InputModeTabsProps) => {
  return (
    <Tabs defaultValue="quick" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-8">
        <TabsTrigger value="ocr" className="gap-2">
          <FileText className="w-4 h-4" />
          Upload Quote
          {appMode === 'pro' && (
            <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
              <Sparkles className="w-2 h-2" />
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="picker" className="gap-2">
          <Search className="w-4 h-4" />
          Product Picker
          {appMode === 'pro' && (
            <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
              <Sparkles className="w-2 h-2" />
            </Badge>
          )}
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
        <ProductPickerForm onSubmit={onCalculate} appMode={appMode} />
      </TabsContent>

      <TabsContent value="quick">
        <QuickSizesForm onSubmit={onCalculate} />
      </TabsContent>
    </Tabs>
  );
};