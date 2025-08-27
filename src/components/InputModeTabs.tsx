import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Search, Zap, Sparkles, Settings, Brain } from "lucide-react";
import { ProductPickerForm } from "./forms/ProductPickerForm";
import { QuickSizesForm } from "./forms/QuickSizesForm";
import UniversalOCRScanner from "./UniversalOCRScanner";
import ComprehensiveTrainingDashboard from "./ComprehensiveTrainingDashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export type InputMode = "ocr" | "picker" | "quick";

interface InputModeTabsProps {
  onCalculate: (data: any) => void;
  appMode?: 'lite' | 'pro';
  tier?: 'free' | 'lite' | 'pro';
  unlimitedTokens?: boolean;
}

export const InputModeTabs = ({ onCalculate, appMode = 'lite', tier = 'free', unlimitedTokens = false }: InputModeTabsProps) => {
  const [showTraining, setShowTraining] = useState(false);
  
  const isProUser = unlimitedTokens || tier === 'pro';
  
  return (
    <div className="space-y-6">
      {/* Pro Feature Toggles */}
      {isProUser && (
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-purple-600" />
              AI Tools
              <Badge variant="default" className="bg-purple-600">Pro</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={showTraining ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTraining(!showTraining)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {showTraining ? 'Hide' : 'Show'} Training Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Dashboard */}
      {isProUser && showTraining && (
        <Card>
          <CardHeader>
            <CardTitle>AI Training & Management</CardTitle>
          </CardHeader>
          <CardContent>
            <ComprehensiveTrainingDashboard />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="quick" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="ocr" className="gap-2">
            <FileText className="w-4 h-4" />
            Upload Quote
            {isProUser && (
              <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                <Sparkles className="w-2 h-2" />
                Enhanced
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="picker" className="gap-2">
            <Search className="w-4 h-4" />
            Product Picker
            {isProUser && (
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
          <UniversalOCRScanner 
            onExtractComplete={(data) => {
              console.log('🔋 Universal OCR extracted:', data);
              
              // Enhanced extraction for pro users using trained models
              let solarKw = 0;
              let batteryKwh = 0;
              
              if (data.panels?.best) {
                solarKw = data.panels.best.arrayKwDc || 
                         (data.panels.best.count * data.panels.best.wattage / 1000) || 0;
              }
              
              if (data.battery?.best) {
                batteryKwh = data.battery.best.usableKWh || 0;
              }
              
              const formData = {
                mode: "ocr",
                postcode: data.policyCalcInput?.postcode || "2000",
                installDate: data.policyCalcInput?.installDateISO || new Date().toISOString().split('T')[0],
                solarKw,
                batteryKwh,
                stcPrice: 38,
                vppProvider: "",
                extractedData: data
              };
              
              console.log('📊 Enhanced OCR form data:', formData);
              onCalculate(formData);
            }} 
          />
        </TabsContent>

        <TabsContent value="picker">
          <ProductPickerForm onSubmit={onCalculate} appMode={appMode} />
        </TabsContent>

        <TabsContent value="quick">
          <QuickSizesForm onSubmit={onCalculate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};