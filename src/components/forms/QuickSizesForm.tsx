import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Zap, Battery, DollarSign, Plug } from "lucide-react";

interface QuickSizesFormProps {
  onSubmit: (data: any) => void;
}

export const QuickSizesForm = ({ onSubmit }: QuickSizesFormProps) => {
  const [formData, setFormData] = useState({
    postcode: "",
    installDate: new Date().toISOString().split('T')[0],
    solarKw: "",
    batteryKwh: "",
    stcPrice: "38",
    vppProvider: ""
  });

  const solarPresets = [6.6, 10, 13, 20, 30];
  const batteryPresets = [10, 13.5, 20, 27, 40];
  const vppProviders = ["AGL", "Origin", "EnergyAustralia", "Simply Energy", "None"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      mode: "quick",
      ...formData,
      solarKw: parseFloat(formData.solarKw),
      batteryKwh: parseFloat(formData.batteryKwh),
      stcPrice: parseFloat(formData.stcPrice)
    });
  };

  return (
    <Card className="backdrop-blur-sm bg-gradient-glass border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Quick Calculator
        </CardTitle>
        <CardDescription>
          Enter your system sizes and location for instant rebate estimates
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

          {/* Solar Size */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Solar System Size (kW)
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {solarPresets.map(size => (
                <Badge 
                  key={size}
                  variant={formData.solarKw === size.toString() ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFormData({...formData, solarKw: size.toString()})}
                >
                  {size} kW
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Or enter custom size"
              value={formData.solarKw}
              onChange={(e) => setFormData({...formData, solarKw: e.target.value})}
              required
            />
          </div>

          {/* Battery Size */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Battery className="w-4 h-4" />
              Battery Size (kWh) - Optional
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {batteryPresets.map(size => (
                <Badge 
                  key={size}
                  variant={formData.batteryKwh === size.toString() ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFormData({...formData, batteryKwh: size.toString()})}
                >
                  {size} kWh
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Or enter custom size (leave blank for none)"
              value={formData.batteryKwh}
              onChange={(e) => setFormData({...formData, batteryKwh: e.target.value})}
            />
          </div>

          {/* STC Price & VPP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stcPrice" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                STC Price ($)
              </Label>
              <Input
                id="stcPrice"
                placeholder="38"
                value={formData.stcPrice}
                onChange={(e) => setFormData({...formData, stcPrice: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vpp" className="flex items-center gap-2">
                <Plug className="w-4 h-4" />
                VPP Provider
              </Label>
              <Select 
                value={formData.vppProvider} 
                onValueChange={(value) => setFormData({...formData, vppProvider: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select VPP (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border z-50">
                  {vppProviders.map(provider => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Calculate Rebates
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};