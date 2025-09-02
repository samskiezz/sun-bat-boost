import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import ReadinessGateGuard from "@/components/ReadinessGateGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SystemManager from "./pages/SystemManager";
import AppShell from "@/components/layout/AppShell";
import DiagnosticsDrawer from "@/diagnostics/DiagnosticsDrawer";
import HowMuchCanISave from "@/modules/HowMuchCanISave";
import BatteryRoi from "@/modules/BatteryRoi";
import RebatesCalculatorModule from "@/modules/RebatesCalculator";
import DispatchOptimizer from "@/components/Optimizers/DispatchOptimizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Battery, Sparkles, Zap } from "lucide-react";
import featureFlags, { type AppMode } from "@/config/featureFlags";
import "@/ai/bootstrap";

const queryClient = new QueryClient();

const EnergyApp = () => {
  const [appMode, setAppMode] = useState<AppMode>("lite");
  const flags = featureFlags(appMode);

  return (
    <AppShell>
      <Tabs defaultValue="savings" className="w-full">
        <TabsList className={`grid w-full ${flags.dispatchOptimizer ? 'grid-cols-4' : 'grid-cols-3'} mb-8 bg-white/10 backdrop-blur-xl border border-white/20`}>
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
          {flags.dispatchOptimizer && (
            <TabsTrigger value="optimizers" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Optimizers
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="rebates" className="mt-0">
          <RebatesCalculatorModule />
        </TabsContent>
        
        <TabsContent value="savings" className="mt-0">
          <HowMuchCanISave />
        </TabsContent>
        
        <TabsContent value="battery" className="mt-0">
          <BatteryRoi />
        </TabsContent>
        
        {flags.dispatchOptimizer && (
          <TabsContent value="optimizers" className="mt-0">
            <DispatchOptimizer mode={appMode} />
          </TabsContent>
        )}
      </Tabs>

      {flags.diagnostics && <DiagnosticsDrawer />}
    </AppShell>
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