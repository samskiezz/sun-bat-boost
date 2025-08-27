import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ReadinessGateGuard from "@/components/ReadinessGateGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SystemManager from "./pages/SystemManager";
import TopBar from "@/components/TopBar";
import HowMuchCanISave from "@/modules/HowMuchCanISave";
import BatteryRoi from "@/modules/BatteryRoi";
import RebatesCalculator from "@/modules/RebatesCalculator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Battery, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import "@/ai/bootstrap";

const queryClient = new QueryClient();

const EnergyApp = () => {
  const [activeTab, setActiveTab] = useState("savings");

  useEffect(() => {
    // Listen for tab switch events from child components
    const handleTabSwitch = (event: CustomEvent) => {
      setActiveTab(event.detail.tab);
    };

    window.addEventListener('switch-tab', handleTabSwitch as EventListener);
    
    return () => {
      window.removeEventListener('switch-tab', handleTabSwitch as EventListener);
    };
  }, []);

  const handleApplyToROI = (scenario: any) => {
    // Switch to battery tab when scenario is applied
    setActiveTab("battery");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="max-w-7xl mx-auto">
        <TopBar />
        
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/10 backdrop-blur-xl border border-white/20">
              <TabsTrigger value="rebates" className="flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Rebates Calculator
              </TabsTrigger>
              <TabsTrigger value="savings" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                How much can I save?
              </TabsTrigger>
              <TabsTrigger value="battery" className="flex items-center gap-2">
                <Battery className="w-4 h-4" />
                Battery ROI Calculator
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="rebates" className="mt-0">
              <RebatesCalculator />
            </TabsContent>
            
            <TabsContent value="savings" className="mt-0">
              <HowMuchCanISave onApplyToROI={handleApplyToROI} />
            </TabsContent>
            
            <TabsContent value="battery" className="mt-0">
              <BatteryRoi />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ReadinessGateGuard>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<EnergyApp />} />
            <Route path="/system" element={<SystemManager />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ReadinessGateGuard>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;