import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Calculator, Zap, RefreshCw, Upload, Search } from "lucide-react";
import { Glass } from "@/components/Glass";
import { Banner } from "@/features/shared/Banner";
import { MetricTile } from "@/features/shared/MetricTile";
import { StatusStrip } from "@/features/shared/StatusStrip";
import { useSolarROI } from "@/hooks/useModels";
import { useModelStore } from "@/state/modelStore";
import { tokens } from "@/theme/tokens";
import { BillsQuotesOCR } from "@/components/BillsQuotesOCR";
import { ProductPickerForm } from "@/components/forms/ProductPickerForm";

interface RebatesCalculatorModuleProps {
  // Optional props to match original interface if needed
}

export default function RebatesCalculatorModule(props: RebatesCalculatorModuleProps = {}) {
  const [started, setStarted] = useState(false);
  const [planCount, setPlanCount] = useState(5);
  const [results, setResults] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [activeTab, setActiveTab] = useState("ocr");
  
  // Form data for rebate calculator
  const [formData, setFormData] = useState({
    solarSize: 6.5,
    batterySize: 13.5,
    postcode: '2000',
    installDate: new Date().toISOString().split('T')[0],
    vppProvider: 'None',
    stcPrice: 38.0
  });

  // OCR and product picker state
  const [ocrData, setOcrData] = useState(null);
  const [pickerData, setPickerData] = useState(null);

  // Fetch plan count for display
  useEffect(() => {
    const fetchPlanCount = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { count } = await supabase
          .from('energy_plans')
          .select('*', { count: 'exact', head: true });
        setPlanCount(count || 1247); // fallback to demo number
      } catch (error) {
        console.error('Error fetching plan count:', error);
        setPlanCount(1247);
      }
    };
    fetchPlanCount();
  }, []);

  const handleCalculate = () => {
    console.log("Calculate rebates:", formData);
    
    // Mock calculation results
    const mockResults = {
      rebateResults: {
        total_rebates: 8450,
        stc_value: 6200,
        state_rebates: 2250,
        vpp_bonus: formData.vppProvider !== 'None' ? 1200 : 0
      }
    };
    
    setResults(mockResults);
    
    // Set eligibility based on the calculation results
    const totalRebates = mockResults.rebateResults.total_rebates || 0;
    const batteryKwh = formData.batterySize || 0;
    const solarKw = formData.solarSize || 0;
    
    let status = 'green';
    let reasons = [];
    let suggestions = [];
    
    if (batteryKwh > 100) {
      status = 'red';
      reasons.push('Battery size exceeds 100kWh limit - no federal rebates available');
      suggestions.push('Consider reducing battery size to under 100kWh to qualify for rebates');
    } else if (batteryKwh > 48) {
      status = 'yellow';
      reasons.push('Battery size over 48kWh - rebates capped at 48kWh');
      suggestions.push('Maximum rebates achieved at 48kWh battery size');
    } else if (batteryKwh > 28 && formData.vppProvider !== 'None') {
      status = 'yellow';
      reasons.push('Battery size over 28kWh - no VPP bonuses available');
      suggestions.push('VPP bonuses are only available for batteries up to 28kWh');
    }
    
    if (totalRebates > 10000) {
      reasons.push('Excellent rebate outcome achieved');
    } else if (totalRebates > 5000) {
      reasons.push('Good rebate amount secured');
    }
    
    setEligibility({ status, reasons, suggestions });
  };
  
  const handleRequestCall = () => {
    console.log("Request call");
  };

  // Handle OCR data extraction
  const handleOCRExtraction = (billData: any) => {
    console.log("OCR extraction:", billData);
    setOcrData(billData);
    
    // Auto-populate form data if postcode is available
    if (billData.postcode) {
      setFormData(prev => ({ ...prev, postcode: billData.postcode }));
    }
  };

  // Handle product picker submission
  const handleProductPickerSubmit = (data: any) => {
    console.log("Product picker data:", data);
    setPickerData(data);
    
    // Auto-populate form data from product picker
    setFormData(prev => ({
      ...prev,
      solarSize: data.systemKw || prev.solarSize,
      postcode: data.postcode || prev.postcode,
      installDate: data.installDate || prev.installDate,
      stcPrice: data.stcPrice || prev.stcPrice
    }));
  };

  const { lastGoodResults } = useModelStore();
  
  // Mock ROI input for ML service
  const roiInput = React.useMemo(() => ({
    usage_30min: Array.from({ length: 48 }, () => Math.random() * 2),
    tariff: {
      import: [{ price: 0.35, start: "00:00", end: "24:00" }],
      export: [{ price: 0.08, start: "00:00", end: "24:00" }]
    },
    system_size_kw: 6.5,
    shading_index: 0.1,
    rebates_enabled: true,
    location: { postcode: "2000", state: "NSW" }
  }), []);

  const { data: roiData, isLoading: isCalculating, error: roiError } = useSolarROI(roiInput);

  if (!started) {
    return (
      <Banner
        title="Government Rebates Calculator"
        subtitle={`Calculate with ${planCount.toLocaleString()} live rebate schemes`}
        icon={DollarSign}
        variant="glassHolo"
      >
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <MetricTile
            title="Smart Analysis"
            value="AI-Powered"
            subtitle="STC certificates, VPP incentives, state rebates analysis"
            variant="glass"
          />
          <MetricTile
            title="Auto Calculations"
            value="Instant"
            subtitle="Automatic rebate calculations based on system size & location"
            variant="glass"
          />
          <MetricTile
            title="Maximum Rebates"
            value="Optimized"
            subtitle="Find all applicable rebates to maximize your ROI"
            variant="glass"
          />
        </div>
        
        <Button
          onClick={() => setStarted(true)}
          size="lg"
          className={cn(tokens.buttonPrimary, "text-lg px-12 py-6 font-semibold")}
        >
          Calculate My Rebates
        </Button>
      </Banner>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Strip */}
      <StatusStrip
        model={roiData?.sourceModel || lastGoodResults?.solar_roi?.sourceModel || "rebates_calculator_v1"}
        version={roiData?.version || lastGoodResults?.solar_roi?.version || "1.0"}
        p95={roiData?.telemetry?.p95 || 75}
        delta={roiData?.telemetry?.delta || 1.8}
        error={roiError ? "Service unavailable" : undefined}
      />

      {/* Rebate Results */}
      {roiData && (
        <div className="grid md:grid-cols-3 gap-6">
          <MetricTile
            title="Government Rebates"
            value={roiData.value?.total_rebates_AUD ? `$${roiData.value.total_rebates_AUD.toLocaleString()}` : "$8,450"}
            subtitle="STC + State incentives"
          />
          <MetricTile
            title="VPP Bonuses"
            value={roiData.value?.vpp_bonuses_AUD ? `$${roiData.value.vpp_bonuses_AUD.toLocaleString()}` : "$1,200"}
            subtitle="Virtual power plant incentives"
          />
          <MetricTile
            title="Total Savings"
            value={roiData.value?.total_savings_AUD ? `$${roiData.value.total_savings_AUD.toLocaleString()}` : "$9,650"}
            subtitle="All rebates & incentives"
          />
        </div>
      )}

      {/* Input Methods Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/10 border border-white/20">
          <TabsTrigger value="ocr" className="data-[state=active]:bg-white/20">
            <Upload className="w-4 h-4 mr-2" />
            OCR Scanner
          </TabsTrigger>
          <TabsTrigger value="picker" className="data-[state=active]:bg-white/20">
            <Search className="w-4 h-4 mr-2" />
            Product Picker
          </TabsTrigger>
          <TabsTrigger value="manual" className="data-[state=active]:bg-white/20">
            <Calculator className="w-4 h-4 mr-2" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ocr" className="space-y-6">
          <BillsQuotesOCR />
        </TabsContent>

        <TabsContent value="picker" className="space-y-6">
          <ProductPickerForm onSubmit={handleProductPickerSubmit} appMode="pro" />
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          {/* Manual Entry Form */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* System Configuration */}
            <div className={cn(tokens.card, "p-6 space-y-6")}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">System Configuration</h3>
                  <p className="text-sm text-muted-foreground">Configure your solar and battery system</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="solarSize">Solar System Size (kW)</Label>
                  <Input
                    id="solarSize"
                    type="number"
                    value={formData.solarSize}
                    onChange={(e) => setFormData(prev => ({ ...prev, solarSize: parseFloat(e.target.value) || 0 }))}
                    step="0.1"
                    min="0"
                    max="100"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="batterySize">Battery Size (kWh)</Label>
                  <Input
                    id="batterySize"
                    type="number"
                    value={formData.batterySize}
                    onChange={(e) => setFormData(prev => ({ ...prev, batterySize: parseFloat(e.target.value) || 0 }))}
                    step="0.5"
                    min="0"
                    max="50"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={formData.postcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
                    className="mt-1"
                    placeholder="Enter your postcode"
                  />
                </div>
              </div>
            </div>

            {/* Rebate Details */}
            <div className={cn(tokens.card, "p-6 space-y-6")}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Rebate Configuration</h3>
                  <p className="text-sm text-muted-foreground">Additional rebate settings</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="installDate">Installation Date</Label>
                  <Input
                    id="installDate"
                    type="date"
                    value={formData.installDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, installDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="vppProvider">VPP Provider</Label>
                  <Select
                    value={formData.vppProvider}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, vppProvider: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select VPP provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">No VPP</SelectItem>
                      <SelectItem value="Tesla Energy">Tesla Energy</SelectItem>
                      <SelectItem value="AGL VPP">AGL VPP</SelectItem>
                      <SelectItem value="Origin Loop">Origin Loop</SelectItem>
                      <SelectItem value="Simply Energy">Simply Energy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="stcPrice">STC Price ($/STC)</Label>
                  <Input
                    id="stcPrice"
                    type="number"
                    value={formData.stcPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, stcPrice: parseFloat(e.target.value) || 0 }))}
                    step="0.50"
                    min="30"
                    max="50"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Calculate Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleCalculate}
          size="lg"
          className={cn(tokens.buttonPrimary, "text-lg px-12 py-6 font-semibold")}
          disabled={isCalculating}
        >
          {isCalculating ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="w-5 h-5 mr-2" />
              Calculate Rebates
            </>
          )}
        </Button>
      </div>
    </div>
  );
}