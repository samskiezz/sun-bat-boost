import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Zap, Battery, MapPin, Calendar, Check, RefreshCw } from "lucide-react";
import { useCECData } from "@/hooks/useCECData";
import { useToast } from "@/hooks/use-toast";

interface ProductPickerFormProps {
  onSubmit: (data: any) => void;
}

export const ProductPickerForm = ({ onSubmit }: ProductPickerFormProps) => {
  const { 
    panels, 
    batteries, 
    vppProviders, 
    loading, 
    getCompatibleVPPs, 
    refreshData,
    autoRefreshing,
    autoRefreshAttempts
  } = useCECData();
  const { toast } = useToast();
  
  // Debug: Log panels data
  useEffect(() => {
    if (panels.length > 0) {
      console.log(`ProductPickerForm: Loaded ${panels.length} panels`);
      const trinaPanels = panels.filter(p => p.brand.toLowerCase().includes('trina'));
      console.log(`ProductPickerForm: Found ${trinaPanels.length} Trina panels:`, trinaPanels.slice(0, 3));
      
      const brands = [...new Set(panels.map(p => p.brand))].sort();
      console.log(`ProductPickerForm: ${brands.length} unique brands:`, brands.filter(b => b.toLowerCase().includes('trina')));
    }
  }, [panels]);
  
  const [formData, setFormData] = useState({
    postcode: "",
    installDate: new Date().toISOString().split('T')[0],
    panelId: "",
    panelQty: "",
    batteryId: "",
    stcPrice: "38",
    vppProvider: ""
  });

  const [panelSearch, setPanelSearch] = useState("");
  const [batterySearch, setBatterySearch] = useState("");
  const [showPanelResults, setShowPanelResults] = useState(false);
  const [showBatteryResults, setShowBatteryResults] = useState(false);

  // Filter panels for search
  const filteredPanels = useMemo(() => {
    if (!panelSearch.trim()) return [];
    const searchTerm = panelSearch.toLowerCase().trim();
    console.log('Searching panels for:', searchTerm, 'in', panels.length, 'total panels');
    
    const results = panels.filter(panel => {
      const brandMatch = panel.brand.toLowerCase().includes(searchTerm);
      const modelMatch = panel.model.toLowerCase().includes(searchTerm);
      const techMatch = panel.technology?.toLowerCase().includes(searchTerm);
      
      return brandMatch || modelMatch || techMatch;
    }).slice(0, 100); // Show top 100 matches
    
    console.log(`Found ${results.length} panels matching "${searchTerm}"`);
    
    // Special debug for Trina
    if (searchTerm.includes('trina')) {
      const allTrinaPanels = panels.filter(p => p.brand.toLowerCase().includes('trina'));
      console.log('All Trina panels in database:', allTrinaPanels.length, allTrinaPanels.slice(0, 5));
      console.log('Trina matches in results:', results.filter(p => p.brand.toLowerCase().includes('trina')));
    }
    
    return results;
  }, [panels, panelSearch]);

  // Filter batteries for search  
  const filteredBatteries = useMemo(() => {
    if (!batterySearch.trim()) return [];
    return batteries.filter(battery =>
      battery.brand.toLowerCase().includes(batterySearch.toLowerCase()) ||
      battery.model.toLowerCase().includes(batterySearch.toLowerCase()) ||
      battery.chemistry?.toLowerCase().includes(batterySearch.toLowerCase())
    ).slice(0, 100); // Show top 100 matches
  }, [batteries, batterySearch]);

  const selectedPanel = formData.panelId ? panels.find(p => p.id === formData.panelId) : undefined;
  const selectedBattery = formData.batteryId === "none" || !formData.batteryId ? null : batteries.find(b => b.id === formData.batteryId);
  
  // Calculate system size based on panel selection using actual power rating
  const systemKw = selectedPanel && formData.panelQty 
    ? ((selectedPanel.power_rating || 400) * parseInt(formData.panelQty)) / 1000
    : 0;

  // Get compatible VPP providers for selected battery
  const compatibleVPPs = selectedBattery ? getCompatibleVPPs(selectedBattery.brand) : [];

  useEffect(() => {
    if (selectedBattery && compatibleVPPs.length > 0) {
      toast({
        title: "VPP Compatibility Found!",
        description: `${compatibleVPPs.length} VPP provider${compatibleVPPs.length > 1 ? 's' : ''} support ${selectedBattery.brand} batteries: ${compatibleVPPs.map(v => v.name).join(', ')}`
      });
    }
  }, [selectedBattery?.brand, compatibleVPPs.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      mode: "picker",
      ...formData,
      panelQty: parseInt(formData.panelQty),
      stcPrice: parseFloat(formData.stcPrice),
      systemKw,
      selectedProducts: {
        panel: selectedPanel,
        battery: selectedBattery
      }
    });
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-gradient-glass border-white/20">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading CEC-approved products...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-gradient-glass border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Product Picker
        </CardTitle>
        <CardDescription>
          Choose from CEC-approved solar panels and batteries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postcode" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Postcode
              </Label>
              <Input
                id="postcode"
                placeholder="e.g. 2000"
                value={formData.postcode}
                onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="installDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Install Date
              </Label>
              <Input
                id="installDate"
                type="date"
                value={formData.installDate}
                onChange={(e) => setFormData({...formData, installDate: e.target.value})}
                required
              />
            </div>
          </div>

          {/* Debug info with refresh */}
          <div className="text-xs text-muted-foreground mb-4 p-2 bg-black/10 rounded flex items-center justify-between">
            {loading ? (
              <span>Loading CEC data...</span>
            ) : (
              <span>
                Loaded: {panels.length} panels, {batteries.length} batteries, {vppProviders.length} VPPs
                {autoRefreshing ? (
                  <span className="text-blue-600 ml-2 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Auto-refreshing database (attempt {autoRefreshAttempts}/10)...
                  </span>
                ) : (panels.length >= 1500 && batteries.length >= 800) ? (
                  <span className="text-green-600 ml-2">✅ Database complete</span>
                ) : (
                  <span className="text-yellow-600 ml-2">⚠️ Auto-refreshing to get complete database...</span>
                )}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                toast({
                  title: "Refreshing CEC Data",
                  description: "Loading CEC-approved products from official sources..."
                });
                try {
                  await refreshData();
                  toast({
                    title: "CEC Data Updated",
                    description: "Successfully loaded latest CEC products"
                  });
                } catch (error) {
                  toast({
                    title: "Refresh Failed",
                    description: "Could not update CEC data",
                    variant: "destructive"
                  });
                }
              }}
              className="ml-2"
              disabled={autoRefreshing}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${autoRefreshing ? 'animate-spin' : ''}`} />
              {autoRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {/* Solar Panels - Search Interface */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Solar Panel
            </Label>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search CEC-approved panels by brand, model, or technology..."
                value={panelSearch}
                onChange={(e) => {
                  setPanelSearch(e.target.value);
                  setShowPanelResults(e.target.value.length > 0);
                }}
                onFocus={() => panelSearch && setShowPanelResults(true)}
                className="pl-10"
              />
            </div>

            {showPanelResults && filteredPanels.length > 0 && (
              <div className="border rounded-lg bg-card max-h-60 overflow-y-auto">
                <div className="p-2 text-xs text-muted-foreground border-b">
                  Showing {filteredPanels.length} panels matching "{panelSearch}"
                </div>
                {filteredPanels.map(panel => (
                  <div
                    key={panel.id}
                    className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                    onClick={() => {
                      setFormData({...formData, panelId: panel.id});
                      setPanelSearch(`${panel.brand} ${panel.model}`);
                      setShowPanelResults(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">{panel.brand} {panel.model}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {panel.power_rating && <span>{panel.power_rating}W</span>}
                          {panel.technology && <span>• {panel.technology}</span>}
                          {panel.certificate && <span>• {panel.certificate}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {panelSearch && filteredPanels.length === 0 && showPanelResults && (
              <div className="text-sm text-muted-foreground p-3 border rounded-lg">
                No panels found matching "{panelSearch}". Try searching by brand (e.g., "JinkoSolar", "Canadian Solar") or technology (e.g., "PERC", "TOPCon").
              </div>
            )}
            
            {selectedPanel && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="panelQty">Quantity</Label>
                    <Input
                      id="panelQty"
                      type="number"
                      placeholder="e.g. 22"
                      value={formData.panelQty}
                      onChange={(e) => setFormData({...formData, panelQty: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>System Size</Label>
                    <div className="h-10 px-3 py-2 border border-input rounded-md bg-muted">
                      {systemKw.toFixed(1)} kW
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Panel Details */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Panel Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Brand: <span className="font-medium">{selectedPanel.brand}</span></div>
                    <div>Model: <span className="font-medium">{selectedPanel.model}</span></div>
                    {selectedPanel.power_rating && (
                      <div>Power: <span className="font-medium">{selectedPanel.power_rating}W</span></div>
                    )}
                    {selectedPanel.technology && (
                      <div>Technology: <span className="font-medium">{selectedPanel.technology}</span></div>
                    )}
                    {selectedPanel.certificate && (
                      <div>Certificate: <span className="font-medium">{selectedPanel.certificate}</span></div>
                    )}
                    {selectedPanel.description && (
                      <div className="col-span-2 mt-2">
                        <span className="text-muted-foreground">{selectedPanel.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Battery - Search Interface */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Battery className="w-4 h-4" />
              Battery (Optional)
            </Label>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search CEC-approved batteries by brand, model, or chemistry... (or leave empty for no battery)"
                value={batterySearch}
                onChange={(e) => {
                  setBatterySearch(e.target.value);
                  setShowBatteryResults(e.target.value.length > 0);
                  if (e.target.value === "") {
                    setFormData({...formData, batteryId: "none"});
                  }
                }}
                onFocus={() => batterySearch && setShowBatteryResults(true)}
                className="pl-10"
              />
            </div>

            {showBatteryResults && filteredBatteries.length > 0 && (
              <div className="border rounded-lg bg-card max-h-60 overflow-y-auto">
                <div className="p-2 text-xs text-muted-foreground border-b">
                  Showing {filteredBatteries.length} batteries matching "{batterySearch}"
                </div>
                {filteredBatteries.map(battery => (
                  <div
                    key={battery.id}
                    className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                    onClick={() => {
                      setFormData({...formData, batteryId: battery.id});
                      setBatterySearch(`${battery.brand} ${battery.model}`);
                      setShowBatteryResults(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">{battery.brand} {battery.model}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {battery.capacity_kwh && <span>{battery.capacity_kwh} kWh</span>}
                          {battery.chemistry && <span>• {battery.chemistry}</span>}
                          {battery.vpp_capable && <span>• VPP Capable</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {batterySearch && filteredBatteries.length === 0 && showBatteryResults && (
              <div className="text-sm text-muted-foreground p-3 border rounded-lg">
                No batteries found matching "{batterySearch}". Try searching by brand (e.g., "Tesla", "Enphase", "Sigenergy") or capacity (e.g., "13.5kWh").
              </div>
            )}

            {!batterySearch && (
              <div className="text-sm text-muted-foreground">
                Leave empty for no battery, or search for CEC-approved battery systems above.
              </div>
            )}
          </div>

          {/* Enhanced Battery Details */}
          {selectedBattery && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Battery Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Brand: <span className="font-medium">{selectedBattery.brand}</span></div>
                <div>Model: <span className="font-medium">{selectedBattery.model}</span></div>
                {selectedBattery.capacity_kwh && (
                  <div>Capacity: <span className="font-medium">{selectedBattery.capacity_kwh} kWh</span></div>
                )}
                {selectedBattery.chemistry && (
                  <div>Chemistry: <span className="font-medium">{selectedBattery.chemistry}</span></div>
                )}
                {selectedBattery.vpp_capable && (
                  <div className="col-span-2">
                    <Badge variant="secondary" className="text-green-600">VPP Capable</Badge>
                  </div>
                )}
                {selectedBattery.description && (
                  <div className="col-span-2 mt-2">
                    <span className="text-muted-foreground">{selectedBattery.description}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VPP Provider Selection */}
          <div className="space-y-4">
            <Label>VPP Provider (Optional)</Label>
            <Select 
              value={formData.vppProvider} 
              onValueChange={(value) => setFormData({...formData, vppProvider: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a Virtual Power Plant provider (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No VPP Provider</SelectItem>
                {vppProviders.map(vpp => (
                  <SelectItem key={vpp.id} value={vpp.id}>
                    <div className="flex items-start gap-3 py-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{vpp.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>${vpp.signup_bonus} signup</span>
                            <span>• ${vpp.estimated_annual_reward}/year</span>
                            {selectedBattery && compatibleVPPs.includes(vpp) && (
                              <span className="text-green-600">• Compatible with {selectedBattery.brand}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBattery && (
              <div className="text-sm">
                {compatibleVPPs.length > 0 ? (
                  <div className="text-green-600">
                    ✅ {compatibleVPPs.length} VPP provider{compatibleVPPs.length > 1 ? 's' : ''} support {selectedBattery.brand} batteries:
                    <div className="mt-1 text-xs">
                      {compatibleVPPs.map(vpp => `${vpp.name} ($${vpp.signup_bonus + vpp.estimated_annual_reward} total value)`).join(', ')}
                    </div>
                  </div>
                ) : (
                  <div className="text-yellow-600">
                    ⚠️ No VPP providers currently support {selectedBattery.brand} batteries in our database
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STC Price */}
          <div className="space-y-2">
            <Label htmlFor="stcPrice">STC Price ($)</Label>
            <Input
              id="stcPrice"
              type="number"
              step="0.01"
              placeholder="e.g. 38.00"
              value={formData.stcPrice}
              onChange={(e) => setFormData({...formData, stcPrice: e.target.value})}
              required
            />
            <div className="text-xs text-muted-foreground">
              Current market STC price (typically $35-$45)
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={!selectedPanel || !formData.panelQty || !formData.postcode}
          >
            Calculate Solar Returns
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Also export as default for other components that might use it
export default ProductPickerForm;