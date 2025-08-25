import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Search, Zap } from "lucide-react";
import { ProductPickerForm } from "./forms/ProductPickerForm";
import { QuickSizesForm } from "./forms/QuickSizesForm";

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
    </Tabs>
  );
};