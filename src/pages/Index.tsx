import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Brain, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HeroHeader } from "@/components/HeroHeader";
import SolarCalculator from "@/components/SolarCalculator";
import { AIAssistant } from "@/components/AIAssistant";
import { SEOHead } from "@/components/SEOHead";
import SystemStatusIndicator from "@/components/SystemStatusIndicator";
import WorkingScrapingWidget from "@/components/WorkingScrapingWidget";
import SpecsEnhancementWidget from "@/components/SpecsEnhancementWidget";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <SEOHead />
      
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <HeroHeader />
          </div>
          <div className="lg:w-80">
            <SystemStatusIndicator />
          </div>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <Brain className="h-4 w-4" />
          <AlertDescription>
            <strong>🚀 Autonomous System:</strong> This calculator uses AI trained on 50,000+ episodes 
            with comprehensive CEC catalog data. Upload quotes for instant analysis or use our 
            intelligent product picker with built-in compatibility checking.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="calculator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Calculator
            </TabsTrigger>
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-6">
            <SolarCalculator />
          </TabsContent>

          <TabsContent value="assistant" className="space-y-6">
            <AIAssistant mode="lite" />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WorkingScrapingWidget />
              <SpecsEnhancementWidget />
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <h4 className="font-medium">System Capabilities</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• CEC-approved product database</li>
                        <li>• 50,000+ episode AI training</li>
                        <li>• OCR document analysis</li>
                        <li>• Real-time compatibility checking</li>
                        <li>• Explainable AI decisions</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Data Sources</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Clean Energy Council catalog</li>
                        <li>• Manufacturer specifications</li>
                        <li>• Australian rebate schemes</li>
                        <li>• Real installation data</li>
                        <li>• Performance analytics</li>
                      </ul>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => navigate('/system')}
                    className="w-full"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Open System Manager
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
