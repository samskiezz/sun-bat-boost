import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Zap, DollarSign, Plug } from "lucide-react";
import { Slider3D } from "@/components/ui/slider-3d";
import { useCECData } from "@/hooks/useCECData";

interface QuickSizesFormProps {
  onSubmit: (data: any) => void;
}

export const QuickSizesForm = ({ onSubmit }: QuickSizesFormProps) => {
  const { vppProviders, loading, getBestVPPForBattery } = useCECData();
  const [formData, setFormData] = useState({
    postcode: "",
    installDate: new Date().toISOString().split('T')[0],
    solarKw: 6.6, // Changed to number for 3D slider
    batteryKwh: 0, // Changed to number for 3D slider  
    stcPrice: "38",
    vppProvider: ""
  });

  const solarPresets = [6.6, 10, 13, 20, 30];
  const vppProviders_static = ["AGL", "Origin", "EnergyAustralia", "Simply Energy", "None"];

  // Get recommended VPP based on battery selection
  const recommendedVPP = formData.batteryKwh > 0 ? getBestVPPForBattery("tesla-powerwall-2") : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      mode: "quick",
      ...formData,
      solarKw: formData.solarKw,
      batteryKwh: formData.batteryKwh,
      stcPrice: parseFloat(formData.stcPrice),
      recommendedVPP
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

          {/* Solar Size with Presets */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Solar System Size (kW)
            </Label>
            <div className="flex flex-wrap gap-2 mb-4">
              {solarPresets.map(size => (
                <Badge 
                  key={size}
                  variant={formData.solarKw === size ? "default" : "outline"}
                  className="cursor-pointer transition-all duration-200 hover:scale-105"
                  onClick={() => setFormData({...formData, solarKw: size})}
                >
                  {size} kW
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Or enter custom size"
              value={formData.solarKw}
              onChange={(e) => setFormData({...formData, solarKw: parseFloat(e.target.value) || 0})}
              required
            />
          </div>

          {/* Modern 3D Battery Slider */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Battery Size (Optional)
            </Label>
            <Slider3D
              min={0}
              max={50}
              step={0.5}
              value={formData.batteryKwh}
              onChange={(value) => setFormData({...formData, batteryKwh: value})}
              label="Battery Capacity"
              unit="kWh"
              gradient="bg-gradient-primary"
              className="w-full"
            />
            {formData.batteryKwh > 0 && (
              <div className="text-sm text-muted-foreground">
                💡 Battery selected: {formData.batteryKwh} kWh
                {recommendedVPP && (
                  <span className="block mt-1">
                    Recommended VPP: {recommendedVPP.name} (${recommendedVPP.signup_bonus} signup + ${recommendedVPP.estimated_annual_reward}/year)
                  </span>
                )}
              </div>
            )}
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
                  {loading ? (
                    <SelectItem value="loading" disabled>Loading VPP providers...</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="none">None</SelectItem>
                      {vppProviders
                        .filter(provider => provider.id && provider.id.trim() !== '')
                        .map(provider => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name} - ${provider.signup_bonus} signup + ${provider.estimated_annual_reward}/year
                        </SelectItem>
                      ))}
                    </>
                  )}
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