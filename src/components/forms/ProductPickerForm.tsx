import { useState, useEffect } from "react";
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
  const { panels, batteries, vppProviders, loading, getCompatibleVPPs, refreshData } = useCECData();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    postcode: "",
    installDate: new Date().toISOString().split('T')[0],
    panelId: "",
    panelQty: "",
    batteryId: "",
    stcPrice: "38",
    vppProvider: ""
  });

  const selectedPanel = formData.panelId ? panels.find(p => p.id === formData.panelId) : undefined;
  const selectedBattery = formData.batteryId === "none" || !formData.batteryId ? null : batteries.find(b => b.id === formData.batteryId);
  
  // Calculate system size based on panel selection using actual power rating
  const systemKw = selectedPanel && formData.panelQty 
    ? ((selectedPanel.power_rating || 400) * parseInt(formData.panelQty)) / 1000
    : 0;

  // Get compatible VPP providers for selected battery
  const compatibleVPPs = selectedBattery ? getCompatibleVPPs(selectedBattery.id) : [];

  useEffect(() => {
    if (selectedBattery && compatibleVPPs.length > 0) {
      toast({
        title: "VPP Compatibility Found!",
        description: `${compatibleVPPs.length} VPP provider${compatibleVPPs.length > 1 ? 's' : ''} compatible with your ${selectedBattery.brand} ${selectedBattery.model}`
      });
    }
  }, [selectedBattery, compatibleVPPs.length]);

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
                {(panels.length < 50 || batteries.length < 50) && (
                  <span className="text-yellow-600 ml-2">⚠️ Limited data - click refresh to load full CEC database</span>
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
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>

          {/* Solar Panels */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Solar Panel
            </Label>
            <Select value={formData.panelId} onValueChange={(value) => setFormData({...formData, panelId: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select CEC-approved panel" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-50">
                {panels.length === 0 ? (
                  <SelectItem value="no-panels" disabled>No panels loaded - try refreshing</SelectItem>
                ) : (
                  panels.filter(panel => panel.id).map(panel => (
                    <SelectItem key={panel.id} value={panel.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{panel.brand} {panel.model}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {panel.power_rating && <span>{panel.power_rating}W</span>}
                              {panel.technology && <span>• {panel.technology}</span>}
                              {panel.certificate && <span>• {panel.certificate}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
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

          {/* Battery */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Battery className="w-4 h-4" />
              Battery (Optional)
            </Label>
            <Select value={formData.batteryId} onValueChange={(value) => setFormData({...formData, batteryId: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select CEC-approved battery (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-50">
                <SelectItem value="none">No battery</SelectItem>
                {batteries.length === 0 ? (
                  <SelectItem value="no-batteries" disabled>No batteries loaded - try refreshing</SelectItem>
                ) : (
                  batteries.filter(battery => battery.id).map(battery => (
                    <SelectItem key={battery.id} value={battery.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{battery.brand} {battery.model}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {battery.capacity_kwh && <span>{battery.capacity_kwh} kWh</span>}
                              {battery.chemistry && <span>• {battery.chemistry}</span>}
                              {battery.vpp_capable && <span>• VPP Capable</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Enhanced Battery Details */}
          {selectedBattery && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Battery Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Brand: <span className="font-medium">{selectedBattery.brand}</span></div>
                <div>Model: <span className="font-medium">{selectedBattery.model}</span></div>
                {selectedBattery.capacity_kwh && (
                  <>
                    <div>Capacity: <span className="font-medium">{selectedBattery.capacity_kwh} kWh</span></div>
                    <div>Usable: <span className="font-medium">{(selectedBattery.capacity_kwh * 0.9).toFixed(1)} kWh</span></div>
                  </>
                )}
                {selectedBattery.chemistry && (
                  <div>Chemistry: <span className="font-medium">{selectedBattery.chemistry}</span></div>
                )}
                {selectedBattery.units && selectedBattery.units > 1 && (
                  <div>Units: <span className="font-medium">{selectedBattery.units}</span></div>
                )}
                <div className="flex items-center gap-2">
                  VPP Capable: 
                  {selectedBattery.vpp_capable ? (
                    <Badge variant="default" className="text-xs">✓ Yes</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">✗ No</Badge>
                  )}
                </div>
                {selectedBattery.description && (
                  <div className="col-span-2 mt-2">
                    <span className="text-muted-foreground">{selectedBattery.description}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VPP Provider with Compatibility */}
          <div className="space-y-2">
            <Label htmlFor="vpp">VPP Provider</Label>
            <Select value={formData.vppProvider} onValueChange={(value) => setFormData({...formData, vppProvider: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select VPP provider (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-50">
                <SelectItem value="none">No VPP</SelectItem>
                {(selectedBattery ? compatibleVPPs : vppProviders)
                  .filter(vpp => vpp.id)
                  .map(vpp => (
                  <SelectItem key={vpp.id} value={vpp.id}>
                    <div className="flex items-center gap-2">
                      {selectedBattery && compatibleVPPs.includes(vpp) && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {vpp.name} - ${vpp.signup_bonus} signup + ${vpp.estimated_annual_reward}/year
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBattery && compatibleVPPs.length > 0 && (
              <div className="text-sm text-muted-foreground">
                💡 {compatibleVPPs.length} compatible VPP provider{compatibleVPPs.length > 1 ? 's' : ''} found for your {selectedBattery.brand} battery
              </div>
            )}
          </div>

          {/* STC Price */}
          <div className="space-y-2">
            <Label htmlFor="stcPrice">STC Price ($)</Label>
            <Input
              id="stcPrice"
              placeholder="38"
              value={formData.stcPrice}
              onChange={(e) => setFormData({...formData, stcPrice: e.target.value})}
              required
            />
          </div>

          {/* CEC Status */}
          {(selectedPanel || selectedBattery) && (
            <div className="space-y-2">
              <Label>CEC Approval Status</Label>
              <div className="flex flex-wrap gap-2">
                {selectedPanel && (
                  <Badge variant="default" className="gap-1">
                    <Check className="w-3 h-3" />
                    Panel Approved ({selectedPanel.certificate || 'CEC Listed'})
                  </Badge>
                )}
                {selectedBattery && (
                  <Badge variant="default" className="gap-1">
                    <Check className="w-3 h-3" />
                    Battery Approved ({selectedBattery.certificate || 'CEC Listed'})
                  </Badge>
                )}
              </div>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={!formData.panelId || !formData.panelQty}>
            Calculate Rebates
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};