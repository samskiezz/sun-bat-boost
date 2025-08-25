import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Battery, Plus, Minus, Search, Star } from 'lucide-react';
import { SOLAR_PANELS, PANEL_BRANDS, getPanelsByBrand, type PanelSpec } from '@/data/panelData';
import { BATTERY_SYSTEMS, BATTERY_BRANDS, getBatteriesByBrand, type BatterySpec } from '@/data/batteryData';

interface SelectedPanel {
  panelId: string;
  quantity: number;
}

interface SelectedBattery {
  batteryId: string;
  quantity: number;
}

interface ModelSelectorProps {
  onSelectionChange: (selection: {
    panels: SelectedPanel[];
    batteries: SelectedBattery[];
    totalPvSize: number;
    totalBatteryCapacity: number;
  }) => void;
  initialPanels?: SelectedPanel[];
  initialBatteries?: SelectedBattery[];
}

export default function ModelSelector({ 
  onSelectionChange, 
  initialPanels = [], 
  initialBatteries = [] 
}: ModelSelectorProps) {
  const [selectedPanels, setSelectedPanels] = useState<SelectedPanel[]>(initialPanels);
  const [selectedBatteries, setSelectedBatteries] = useState<SelectedBattery[]>(initialBatteries);
  const [panelSearch, setPanelSearch] = useState('');
  const [batterySearch, setBatterySearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedBatteryBrand, setSelectedBatteryBrand] = useState<string>('all');

  // Filter panels
  const filteredPanels = Object.values(SOLAR_PANELS).filter(panel => {
    const matchesSearch = panelSearch === '' || 
      panel.brand.toLowerCase().includes(panelSearch.toLowerCase()) ||
      panel.model.toLowerCase().includes(panelSearch.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || panel.brand === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  // Filter batteries
  const filteredBatteries = Object.values(BATTERY_SYSTEMS).filter(battery => {
    const matchesSearch = batterySearch === '' || 
      battery.brand.toLowerCase().includes(batterySearch.toLowerCase()) ||
      battery.model.toLowerCase().includes(batterySearch.toLowerCase());
    const matchesBrand = selectedBatteryBrand === 'all' || battery.brand === selectedBatteryBrand;
    return matchesSearch && matchesBrand;
  });

  // Calculate totals
  const totalPvSize = selectedPanels.reduce((total, panel) => {
    const panelSpec = SOLAR_PANELS[panel.panelId];
    return total + (panelSpec ? panelSpec.power_watts * panel.quantity / 1000 : 0);
  }, 0);

  const totalBatteryCapacity = selectedBatteries.reduce((total, battery) => {
    const batterySpec = BATTERY_SYSTEMS[battery.batteryId];
    return total + (batterySpec ? batterySpec.capacity_kwh * battery.quantity : 0);
  }, 0);

  // Update parent component
  const updateSelection = (panels: SelectedPanel[], batteries: SelectedBattery[]) => {
    onSelectionChange({
      panels,
      batteries,
      totalPvSize: panels.reduce((total, panel) => {
        const panelSpec = SOLAR_PANELS[panel.panelId];
        return total + (panelSpec ? panelSpec.power_watts * panel.quantity / 1000 : 0);
      }, 0),
      totalBatteryCapacity: batteries.reduce((total, battery) => {
        const batterySpec = BATTERY_SYSTEMS[battery.batteryId];
        return total + (batterySpec ? batterySpec.capacity_kwh * battery.quantity : 0);
      }, 0)
    });
  };

  const addPanel = (panelId: string) => {
    const existingIndex = selectedPanels.findIndex(p => p.panelId === panelId);
    let newPanels;
    
    if (existingIndex >= 0) {
      newPanels = selectedPanels.map((panel, index) => 
        index === existingIndex 
          ? { ...panel, quantity: panel.quantity + 1 }
          : panel
      );
    } else {
      newPanels = [...selectedPanels, { panelId, quantity: 1 }];
    }
    
    setSelectedPanels(newPanels);
    updateSelection(newPanels, selectedBatteries);
  };

  const removePanel = (panelId: string) => {
    const existingIndex = selectedPanels.findIndex(p => p.panelId === panelId);
    if (existingIndex < 0) return;
    
    let newPanels;
    if (selectedPanels[existingIndex].quantity > 1) {
      newPanels = selectedPanels.map((panel, index) => 
        index === existingIndex 
          ? { ...panel, quantity: panel.quantity - 1 }
          : panel
      );
    } else {
      newPanels = selectedPanels.filter((_, index) => index !== existingIndex);
    }
    
    setSelectedPanels(newPanels);
    updateSelection(newPanels, selectedBatteries);
  };

  const addBattery = (batteryId: string) => {
    const existingIndex = selectedBatteries.findIndex(b => b.batteryId === batteryId);
    let newBatteries;
    
    if (existingIndex >= 0) {
      newBatteries = selectedBatteries.map((battery, index) => 
        index === existingIndex 
          ? { ...battery, quantity: battery.quantity + 1 }
          : battery
      );
    } else {
      newBatteries = [...selectedBatteries, { batteryId, quantity: 1 }];
    }
    
    setSelectedBatteries(newBatteries);
    updateSelection(selectedPanels, newBatteries);
  };

  const removeBattery = (batteryId: string) => {
    const existingIndex = selectedBatteries.findIndex(b => b.batteryId === batteryId);
    if (existingIndex < 0) return;
    
    let newBatteries;
    if (selectedBatteries[existingIndex].quantity > 1) {
      newBatteries = selectedBatteries.map((battery, index) => 
        index === existingIndex 
          ? { ...battery, quantity: battery.quantity - 1 }
          : battery
      );
    } else {
      newBatteries = selectedBatteries.filter((_, index) => index !== existingIndex);
    }
    
    setSelectedBatteries(newBatteries);
    updateSelection(selectedPanels, newBatteries);
  };

  const getSelectedQuantity = (itemId: string, type: 'panel' | 'battery'): number => {
    if (type === 'panel') {
      return selectedPanels.find(p => p.panelId === itemId)?.quantity || 0;
    } else {
      return selectedBatteries.find(b => b.batteryId === itemId)?.quantity || 0;
    }
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          Equipment Selector
        </CardTitle>
        <CardDescription>
          Choose specific solar panels and batteries for precise rebate calculations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="panels" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="panels" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Solar Panels
            </TabsTrigger>
            <TabsTrigger value="batteries" className="flex items-center gap-2">
              <Battery className="w-4 h-4" />
              Batteries
            </TabsTrigger>
          </TabsList>

          {/* Panels Tab */}
          <TabsContent value="panels" className="space-y-4">
            {/* Panel Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="panel-search">Search Panels</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="panel-search"
                    placeholder="Search by brand or model..."
                    value={panelSearch}
                    onChange={(e) => setPanelSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="panel-brand">Brand</Label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {PANEL_BRANDS.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected Panels Summary */}
            {selectedPanels.length > 0 && (
              <div className="p-4 bg-gradient-solar/10 rounded-lg">
                <h4 className="font-semibold mb-2">Selected Panels</h4>
                <div className="space-y-2">
                  {selectedPanels.map(panel => {
                    const spec = SOLAR_PANELS[panel.panelId];
                    return spec ? (
                      <div key={panel.panelId} className="flex items-center justify-between">
                        <span className="text-sm">
                          {panel.quantity}× {spec.brand} {spec.model} ({spec.power_watts}W)
                        </span>
                        <Badge variant="secondary">
                          {(spec.power_watts * panel.quantity / 1000).toFixed(1)}kW
                        </Badge>
                      </div>
                    ) : null;
                  })}
                  <Separator />
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total System Size</span>
                    <Badge className="bg-gradient-solar text-white">
                      {totalPvSize.toFixed(1)}kW
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Panel Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {filteredPanels.map(panel => {
                const quantity = getSelectedQuantity(panel.id, 'panel');
                return (
                  <div key={panel.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">{panel.brand}</h4>
                        <p className="text-sm text-muted-foreground">{panel.model}</p>
                      </div>
                      <Badge variant={panel.tier === 1 ? "default" : panel.tier === 2 ? "secondary" : "outline"}>
                        Tier {panel.tier}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Power:</span>
                        <br />
                        <span className="font-medium">{panel.power_watts}W</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Efficiency:</span>
                        <br />
                        <span className="font-medium">{panel.efficiency}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        ~${panel.price_estimate_aud.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removePanel(panel.id)}
                          disabled={quantity === 0}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addPanel(panel.id)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Batteries Tab */}
          <TabsContent value="batteries" className="space-y-4">
            {/* Battery Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="battery-search">Search Batteries</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="battery-search"
                    placeholder="Search by brand or model..."
                    value={batterySearch}
                    onChange={(e) => setBatterySearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="battery-brand">Brand</Label>
                <Select value={selectedBatteryBrand} onValueChange={setSelectedBatteryBrand}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {BATTERY_BRANDS.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected Batteries Summary */}
            {selectedBatteries.length > 0 && (
              <div className="p-4 bg-gradient-vpp/10 rounded-lg">
                <h4 className="font-semibold mb-2">Selected Batteries</h4>
                <div className="space-y-2">
                  {selectedBatteries.map(battery => {
                    const spec = BATTERY_SYSTEMS[battery.batteryId];
                    return spec ? (
                      <div key={battery.batteryId} className="flex items-center justify-between">
                        <span className="text-sm">
                          {battery.quantity}× {spec.brand} {spec.model} ({spec.capacity_kwh}kWh)
                        </span>
                        <Badge variant="secondary">
                          {(spec.capacity_kwh * battery.quantity).toFixed(1)}kWh
                        </Badge>
                      </div>
                    ) : null;
                  })}
                  <Separator />
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total Battery Capacity</span>
                    <Badge className="bg-gradient-vpp text-white">
                      {totalBatteryCapacity.toFixed(1)}kWh
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Battery Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {filteredBatteries.map(battery => {
                const quantity = getSelectedQuantity(battery.id, 'battery');
                return (
                  <div key={battery.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">{battery.brand}</h4>
                        <p className="text-sm text-muted-foreground">{battery.model}</p>
                      </div>
                      <Badge variant={battery.tier === 1 ? "default" : battery.tier === 2 ? "secondary" : "outline"}>
                        Tier {battery.tier}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Capacity:</span>
                        <br />
                        <span className="font-medium">{battery.capacity_kwh}kWh</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Chemistry:</span>
                        <br />
                        <span className="font-medium">{battery.chemistry}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs">
                      <span className="text-muted-foreground">VPP Compatible:</span>
                      <br />
                      <span className="font-medium">
                        {battery.vpp_compatible.length > 0 
                          ? `${battery.vpp_compatible.length} providers`
                          : 'None'
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        ~${battery.price_estimate_aud.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeBattery(battery.id)}
                          disabled={quantity === 0}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addBattery(battery.id)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}