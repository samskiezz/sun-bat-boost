import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Zap, Battery, MapPin, Calendar, Check } from "lucide-react";

interface ProductPickerFormProps {
  onSubmit: (data: any) => void;
}

// Mock CEC-approved products
const cecPanels = [
  { id: "1", make: "Canadian Solar", model: "CS3K-300MS", watts: 300, approved: true },
  { id: "2", make: "JinkoSolar", model: "JKM400M-72H", watts: 400, approved: true },
  { id: "3", make: "Trina Solar", model: "TSM-DE06M.08", watts: 315, approved: true },
  { id: "4", make: "LONGi Solar", model: "LR4-60HPH-350M", watts: 350, approved: true }
];

const cecInverters = [
  { id: "1", make: "Fronius", model: "Primo 5.0-1", kw: 5.0, approved: true },
  { id: "2", make: "SolarEdge", model: "SE5000H", kw: 5.0, approved: true },
  { id: "3", make: "Huawei", model: "SUN2000-5KTL-M1", kw: 5.0, approved: true },
  { id: "4", make: "Sungrow", model: "SG5.0RS", kw: 5.0, approved: true }
];

const cecBatteries = [
  { id: "1", make: "Tesla", model: "Powerwall 2", kwh: 13.5, approved: true },
  { id: "2", make: "Enphase", model: "IQ Battery 10", kwh: 10.08, approved: true },
  { id: "3", make: "Alpha ESS", model: "SMILE-B3", kwh: 10.1, approved: true },
  { id: "4", make: "BYD", model: "Battery-Box Premium HVS", kwh: 12.8, approved: true }
];

export const ProductPickerForm = ({ onSubmit }: ProductPickerFormProps) => {
  const [formData, setFormData] = useState({
    postcode: "",
    installDate: new Date().toISOString().split('T')[0],
    panelId: "",
    panelQty: "",
    inverterId: "",
    batteryId: "",
    stcPrice: "38"
  });

  const selectedPanel = cecPanels.find(p => p.id === formData.panelId);
  const selectedInverter = cecInverters.find(i => i.id === formData.inverterId);
  const selectedBattery = cecBatteries.find(b => b.id === formData.batteryId);
  
  const systemKw = selectedPanel && formData.panelQty 
    ? (selectedPanel.watts * parseInt(formData.panelQty)) / 1000 
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      mode: "picker",
      ...formData,
      panelQty: parseInt(formData.panelQty),
      stcPrice: parseFloat(formData.stcPrice),
      systemKw,
      batteryKwh: selectedBattery?.kwh,
      selectedProducts: {
        panel: selectedPanel,
        inverter: selectedInverter,
        battery: selectedBattery
      }
    });
  };

  return (
    <Card className="backdrop-blur-sm bg-gradient-glass border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Product Picker
        </CardTitle>
        <CardDescription>
          Choose from CEC-approved solar panels, inverters, and batteries
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
              <SelectContent>
                {cecPanels.map(panel => (
                  <SelectItem key={panel.id} value={panel.id}>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {panel.make} {panel.model} ({panel.watts}W)
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedPanel && (
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
            )}
          </div>

          {/* Inverter */}
          <div className="space-y-2">
            <Label>Inverter</Label>
            <Select value={formData.inverterId} onValueChange={(value) => setFormData({...formData, inverterId: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select CEC-approved inverter" />
              </SelectTrigger>
              <SelectContent>
                {cecInverters.map(inverter => (
                  <SelectItem key={inverter.id} value={inverter.id}>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {inverter.make} {inverter.model} ({inverter.kw}kW)
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <SelectContent>
                <SelectItem value="">No battery</SelectItem>
                {cecBatteries.map(battery => (
                  <SelectItem key={battery.id} value={battery.id}>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {battery.make} {battery.model} ({battery.kwh}kWh)
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {(selectedPanel || selectedInverter || selectedBattery) && (
            <div className="space-y-2">
              <Label>CEC Approval Status</Label>
              <div className="flex flex-wrap gap-2">
                {selectedPanel && (
                  <Badge variant="default" className="gap-1">
                    <Check className="w-3 h-3" />
                    Panel Approved
                  </Badge>
                )}
                {selectedInverter && (
                  <Badge variant="default" className="gap-1">
                    <Check className="w-3 h-3" />
                    Inverter Approved
                  </Badge>
                )}
                {selectedBattery && (
                  <Badge variant="default" className="gap-1">
                    <Check className="w-3 h-3" />
                    Battery Approved
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