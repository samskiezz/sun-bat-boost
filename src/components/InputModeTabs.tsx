import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Search, Zap, DollarSign } from "lucide-react";
import { ProductPickerForm } from "./forms/ProductPickerForm";
import { QuickSizesForm } from "./forms/QuickSizesForm";

export type InputMode = "ocr" | "picker" | "quick" | "rebates";

interface InputModeTabsProps {
  activeTab: InputMode;
  onTabChange: (tab: InputMode) => void;
  onCalculate: (data: any) => void;
}

export const InputModeTabs = ({ activeTab, onTabChange, onCalculate }: InputModeTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-8">
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
        <TabsTrigger value="rebates" className="gap-2">
          <DollarSign className="w-4 h-4" />
          Rebates
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ocr">
        <div className="text-center text-muted-foreground py-8">
          OCR Quote Upload - Coming Soon
        </div>
      </TabsContent>

      <TabsContent value="picker">
        <ProductPickerForm onSubmit={onCalculate} />
      </TabsContent>

      <TabsContent value="quick">
        <QuickSizesForm onSubmit={onCalculate} />
      </TabsContent>

      <TabsContent value="rebates">
        {/* RebateCalculator is rendered in SolarCalculator */}
        <div></div>
      </TabsContent>
    </Tabs>
  );
};