import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Zap, Battery, Plus, Minus, Search, Star } from 'lucide-react';
import { useCECData } from '@/hooks/useCECData';

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
  const { panels, batteries, loading } = useCECData();
  const [selectedPanels, setSelectedPanels] = useState<SelectedPanel[]>(initialPanels);
  const [selectedBatteries, setSelectedBatteries] = useState<SelectedBattery[]>(initialBatteries);
  const [panelSearch, setPanelSearch] = useState('');
  const [batterySearch, setBatterySearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedBatteryBrand, setSelectedBatteryBrand] = useState<string>('all');

  // Get unique brands
  const panelBrands = useMemo(() => {
    const brands = new Set(panels.map(panel => panel.brand));
    return Array.from(brands).sort();
  }, [panels]);

  const batteryBrands = useMemo(() => {
    const brands = new Set(batteries.map(battery => battery.brand));
    return Array.from(brands).sort();
  }, [batteries]);

  // Filter panels
  const filteredPanels = panels.filter(panel => {
    const matchesSearch = panelSearch === '' || 
      panel.brand.toLowerCase().includes(panelSearch.toLowerCase()) ||
      panel.model.toLowerCase().includes(panelSearch.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || panel.brand === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  // Filter batteries
  const filteredBatteries = batteries.filter(battery => {
    const matchesSearch = batterySearch === '' || 
      battery.brand.toLowerCase().includes(batterySearch.toLowerCase()) ||
      battery.model.toLowerCase().includes(batterySearch.toLowerCase());
    const matchesBrand = selectedBatteryBrand === 'all' || battery.brand === selectedBatteryBrand;
    return matchesSearch && matchesBrand;
  });

  // Create combobox options
  const panelBrandOptions: ComboboxOption[] = [
    { value: 'all', label: 'All Brands' },
    ...panelBrands.map(brand => ({ value: brand, label: brand }))
  ];

  const batteryBrandOptions: ComboboxOption[] = [
    { value: 'all', label: 'All Brands' },
    ...batteryBrands.map(brand => ({ value: brand, label: brand }))
  ];

  // Calculate totals
  const totalPvSize = selectedPanels.reduce((total, panel) => {
    const panelSpec = panels.find(p => p.id.toString() === panel.panelId);
    return total + (panelSpec ? panelSpec.power_rating * panel.quantity / 1000 : 0);
  }, 0);

  const totalBatteryCapacity = selectedBatteries.reduce((total, battery) => {
    const batterySpec = batteries.find(b => b.id.toString() === battery.batteryId);
    return total + (batterySpec ? batterySpec.capacity_kwh * battery.quantity : 0);
  }, 0);

  // Update parent component
  const updateSelection = (selectedPanels: SelectedPanel[], selectedBatteries: SelectedBattery[]) => {
    onSelectionChange({
      panels: selectedPanels,
      batteries: selectedBatteries,
      totalPvSize: selectedPanels.reduce((total, panel) => {
        const panelSpec = panels.find(p => p.id.toString() === panel.panelId);
        return total + (panelSpec ? panelSpec.power_rating * panel.quantity / 1000 : 0);
      }, 0),
      totalBatteryCapacity: selectedBatteries.reduce((total, battery) => {
        const batterySpec = batteries.find(b => b.id.toString() === battery.batteryId);
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
                <Combobox
                  options={panelBrandOptions}
                  value={selectedBrand}
                  onValueChange={setSelectedBrand}
                  placeholder="All Brands"
                  searchPlaceholder="Search brands..."
                  className="w-40"
                />
              </div>
            </div>

            {/* Selected Panels Summary */}
            {selectedPanels.length > 0 && (
              <div className="p-4 bg-gradient-solar/10 rounded-lg">
                <h4 className="font-semibold mb-2">Selected Panels</h4>
                <div className="space-y-2">
                   {selectedPanels.map(panel => {
                     const spec = panels.find(p => p.id.toString() === panel.panelId);
                     return spec ? (
                       <div key={panel.panelId} className="flex items-center justify-between">
                         <span className="text-sm">
                           {panel.quantity}× {spec.brand} {spec.model} ({spec.power_rating}W)
                         </span>
                         <Badge variant="secondary">
                           {(spec.power_rating * panel.quantity / 1000).toFixed(1)}kW
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
              {loading ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Loading panels...
                </div>
              ) : filteredPanels.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No panels found matching your search
                </div>
              ) : (
                filteredPanels.map(panel => {
                  const quantity = getSelectedQuantity(panel.id.toString(), 'panel');
                  return (
                    <div key={panel.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">{panel.brand}</h4>
                          <p className="text-sm text-muted-foreground">{panel.model}</p>
                        </div>
                        <Badge variant="secondary">
                          CEC Approved
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Power:</span>
                          <br />
                          <span className="font-medium">{panel.power_rating}W</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Technology:</span>
                          <br />
                          <span className="font-medium">{panel.technology || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {panel.certificate || 'CEC Listed'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removePanel(panel.id.toString())}
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
                            onClick={() => addPanel(panel.id.toString())}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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
                <Combobox
                  options={batteryBrandOptions}
                  value={selectedBatteryBrand}
                  onValueChange={setSelectedBatteryBrand}
                  placeholder="All Brands"
                  searchPlaceholder="Search brands..."
                  className="w-40"
                />
              </div>
            </div>

            {/* Selected Batteries Summary */}
            {selectedBatteries.length > 0 && (
              <div className="p-4 bg-gradient-vpp/10 rounded-lg">
                <h4 className="font-semibold mb-2">Selected Batteries</h4>
                <div className="space-y-2">
                   {selectedBatteries.map(battery => {
                     const spec = batteries.find(b => b.id.toString() === battery.batteryId);
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
              {loading ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Loading batteries...
                </div>
              ) : filteredBatteries.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No batteries found matching your search
                </div>
              ) : (
                filteredBatteries.map(battery => {
                  const quantity = getSelectedQuantity(battery.id.toString(), 'battery');
                  return (
                    <div key={battery.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">{battery.brand}</h4>
                          <p className="text-sm text-muted-foreground">{battery.model}</p>
                        </div>
                        <Badge variant={battery.vpp_capable ? "default" : "secondary"}>
                          {battery.vpp_capable ? 'VPP Ready' : 'CEC Approved'}
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
                          <span className="font-medium">{battery.chemistry || 'Li-Ion'}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs">
                        <span className="text-muted-foreground">Units:</span>
                        <br />
                        <span className="font-medium">{battery.units || 1} unit(s)</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {battery.certificate || 'CEC Listed'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeBattery(battery.id.toString())}
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
                            onClick={() => addBattery(battery.id.toString())}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}