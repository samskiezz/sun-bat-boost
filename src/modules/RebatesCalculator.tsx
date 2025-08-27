import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, DollarSign, Zap } from "lucide-react";

export default function RebatesCalculator() {
  const [formData, setFormData] = useState({
    systemSize: "",
    batteryCapacity: "",
    postcode: "",
    state: "NSW",
    installationType: "residential"
  });
  
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculateRebates = async () => {
    setLoading(true);
    
    // Simulate calculation
    setTimeout(() => {
      const systemSizeNum = parseFloat(formData.systemSize) || 0;
      const batteryCapacityNum = parseFloat(formData.batteryCapacity) || 0;
      
      // STC calculation (simplified)
      const stcRate = 38; // Current STC rate per kW
      const stcValue = systemSizeNum * stcRate * 14; // 14 STCs per kW approx
      
      // State rebates (NSW example)
      const batteryRebate = formData.state === "NSW" ? Math.min(batteryCapacityNum * 400, 1600) : 0;
      
      const totalRebates = stcValue + batteryRebate;
      
      setResults({
        stcValue,
        batteryRebate,
        totalRebates,
        systemSize: systemSizeNum,
        batteryCapacity: batteryCapacityNum
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3">
        <Calculator className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Rebates Calculator</h2>
          <p className="text-sm opacity-80">Calculate available rebates for your solar and battery installation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="p-6 border border-white/20 bg-white/10 backdrop-blur-xl">
          <h3 className="text-lg font-semibold mb-4">System Details</h3>
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor="systemSize">Solar System Size (kW)</Label>
              <Input
                id="systemSize"
                type="number"
                placeholder="e.g., 6.6"
                value={formData.systemSize}
                onChange={(e) => setFormData({...formData, systemSize: e.target.value})}
                className="bg-white/10 border-white/20"
              />
            </div>
            
            <div>
              <Label htmlFor="batteryCapacity">Battery Capacity (kWh)</Label>
              <Input
                id="batteryCapacity"
                type="number"
                placeholder="e.g., 13.5"
                value={formData.batteryCapacity}
                onChange={(e) => setFormData({...formData, batteryCapacity: e.target.value})}
                className="bg-white/10 border-white/20"
              />
            </div>
            
            <div>
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                type="text"
                placeholder="e.g., 2000"
                value={formData.postcode}
                onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                className="bg-white/10 border-white/20"
              />
            </div>
            
            <div>
              <Label htmlFor="state">State</Label>
              <Select value={formData.state} onValueChange={(value) => setFormData({...formData, state: value})}>
                <SelectTrigger className="bg-white/10 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NSW">NSW</SelectItem>
                  <SelectItem value="VIC">VIC</SelectItem>
                  <SelectItem value="QLD">QLD</SelectItem>
                  <SelectItem value="SA">SA</SelectItem>
                  <SelectItem value="WA">WA</SelectItem>
                  <SelectItem value="TAS">TAS</SelectItem>
                  <SelectItem value="NT">NT</SelectItem>
                  <SelectItem value="ACT">ACT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="installationType">Installation Type</Label>
              <Select value={formData.installationType} onValueChange={(value) => setFormData({...formData, installationType: value})}>
                <SelectTrigger className="bg-white/10 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={calculateRebates}
              disabled={!formData.systemSize || loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? "Calculating..." : "Calculate Rebates"}
            </Button>
          </div>
        </Card>

        {/* Results */}
        <Card className="p-6 border border-white/20 bg-white/10 backdrop-blur-xl">
          <h3 className="text-lg font-semibold mb-4">Available Rebates</h3>
          
          {!results ? (
            <div className="flex items-center justify-center h-64 text-center opacity-60">
              <div>
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Enter your system details to see available rebates</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="p-4 rounded-xl border border-white/20 bg-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <span className="font-medium">Small-scale Technology Certificates (STCs)</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-400">${results.stcValue.toLocaleString()}</div>
                <div className="text-xs opacity-70 mt-1">
                  Based on {results.systemSize}kW system
                </div>
              </div>
              
              {results.batteryRebate > 0 && (
                <div className="p-4 rounded-xl border border-white/20 bg-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      <span className="font-medium">Battery Rebate ({formData.state})</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">${results.batteryRebate.toLocaleString()}</div>
                  <div className="text-xs opacity-70 mt-1">
                    Based on {results.batteryCapacity}kWh battery
                  </div>
                </div>
              )}
              
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                <div className="text-center">
                  <div className="text-sm font-medium text-emerald-300 mb-1">Total Available Rebates</div>
                  <div className="text-3xl font-bold text-emerald-400">${results.totalRebates.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="text-xs opacity-70 mt-4 text-center">
                <p>* Rebates are estimates based on current rates and eligibility criteria.</p>
                <p>Actual rebates may vary. Consult with a CEC-approved installer for accurate quotes.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
      
      <Card className="p-4 border border-white/20 bg-white/10 backdrop-blur-xl">
        <h4 className="font-semibold mb-2">Important Information</h4>
        <div className="text-sm opacity-80 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-medium mb-1">STCs (Small-scale Technology Certificates):</p>
            <p>Available Australia-wide for systems up to 100kW. Point-of-sale discount typically applied by installer.</p>
          </div>
          <div>
            <p className="font-medium mb-1">State Battery Rebates:</p>
            <p>Vary by state. NSW offers up to $1,600, VIC up to $2,950. Check current eligibility criteria.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}