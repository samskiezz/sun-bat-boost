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

  // Get recommended VPP based on battery selection - use approved brand
  const recommendedVPP = formData.batteryKwh > 0 ? getBestVPPForBattery("TESLA") : null;

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

          {/* Solar System Slider */}
          <div className="space-y-4">
            <Slider3D
              min={0}
              max={99}
              step={0.1}
              value={formData.solarKw}
              onChange={(value) => setFormData({...formData, solarKw: value})}
              label="Solar System Size"
              unit="kW"
              gradient="solar"
              className="w-full"
            />
          </div>

          {/* Battery Capacity Slider */}
          <div className="space-y-4">
            <Slider3D
              min={0}
              max={100}
              step={0.5}
              value={formData.batteryKwh}
              onChange={(value) => setFormData({...formData, batteryKwh: value})}
              label="Battery Capacity"
              unit="kWh"
              gradient="battery"
              className="w-full"
            />
            {formData.batteryKwh > 0 && (
              <div className="p-4 rounded-2xl backdrop-blur-sm bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-400/20">
                <div className="text-sm text-muted-foreground">
                  💡 <span className="font-semibold text-green-600 dark:text-green-400">Battery selected:</span> {formData.batteryKwh} kWh
                  {recommendedVPP && (
                    <span className="block mt-2 text-xs">
                      <span className="font-medium text-primary">Recommended VPP:</span> {recommendedVPP.name} 
                      <span className="text-green-600 dark:text-green-400"> (${recommendedVPP.signup_bonus} signup + ${recommendedVPP.estimated_annual_reward}/year)</span>
                    </span>
                  )}
                </div>
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