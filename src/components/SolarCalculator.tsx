import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Zap, Battery, Network } from 'lucide-react';
import { calculateSolarRebates, type CalculatorInputs, type CalculatorResults } from '@/utils/solarCalculations';
import { VPP_INCENTIVES } from '@/data/solarData';

export default function SolarCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    install_date: new Date().toISOString().split('T')[0],
    postcode: '',
    pv_dc_size_kw: 6.6,
    stc_price_aud: 37,
    battery_capacity_kwh: 0,
    vpp_provider: null,
  });

  const [results, setResults] = useState<CalculatorResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleInputChange = (field: keyof CalculatorInputs, value: string | number | null) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    
    // Simulate calculation time for smooth UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const calculationResults = calculateSolarRebates(inputs);
    setResults(calculationResults);
    setIsCalculating(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-3 bg-gradient-solar rounded-full text-white shadow-glow">
              <Zap className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-solar bg-clip-text text-transparent">
              Australian Solar Rebate Calculator
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Calculate your STC rebates, battery incentives, and VPP rewards in seconds. 
            Get accurate rebate estimates for your solar system.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                System Details
              </CardTitle>
              <CardDescription>
                Enter your solar system specifications and location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="install_date">Install Date</Label>
                  <Input
                    id="install_date"
                    type="date"
                    value={inputs.install_date}
                    onChange={(e) => handleInputChange('install_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    placeholder="e.g. 2000"
                    value={inputs.postcode}
                    onChange={(e) => handleInputChange('postcode', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pv_size">Solar Panel Size (kW)</Label>
                  <Input
                    id="pv_size"
                    type="number"
                    step="0.1"
                    value={inputs.pv_dc_size_kw}
                    onChange={(e) => handleInputChange('pv_dc_size_kw', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="stc_price">STC Price (AUD)</Label>
                  <Input
                    id="stc_price"
                    type="number"
                    step="0.5"
                    value={inputs.stc_price_aud}
                    onChange={(e) => handleInputChange('stc_price_aud', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="battery_size">
                    <Battery className="w-4 h-4 inline mr-1" />
                    Battery Size (kWh)
                  </Label>
                  <Input
                    id="battery_size"
                    type="number"
                    step="0.5"
                    placeholder="0 for none"
                    value={inputs.battery_capacity_kwh}
                    onChange={(e) => handleInputChange('battery_capacity_kwh', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="vpp_provider">
                    <Network className="w-4 h-4 inline mr-1" />
                    VPP Provider
                  </Label>
                  <Select 
                    value={inputs.vpp_provider || 'none'} 
                    onValueChange={(value) => handleInputChange('vpp_provider', value === 'none' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select VPP (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {Object.keys(VPP_INCENTIVES).map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {VPP_INCENTIVES[provider].provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleCalculate}
                disabled={!inputs.postcode || inputs.pv_dc_size_kw <= 0 || isCalculating}
                className="w-full bg-gradient-solar hover:shadow-solar transition-all duration-300"
              >
                {isCalculating ? 'Calculating...' : 'Calculate Rebates'}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Rebate Breakdown
              </CardTitle>
              <CardDescription>
                Your estimated rebates and incentives
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!results ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Enter your system details and click "Calculate Rebates" to see your results</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {results.error && (
                    <Alert variant="destructive">
                      <AlertDescription>{results.error}</AlertDescription>
                    </Alert>
                  )}
                  
                  {results.warning && (
                    <Alert>
                      <AlertDescription>{results.warning}</AlertDescription>
                    </Alert>
                  )}

                  {!results.error && (
                    <>
                      {/* Total */}
                      <div className="text-center p-6 bg-gradient-solar rounded-lg text-white shadow-solar">
                        <h3 className="text-2xl font-bold mb-2">Total Rebate</h3>
                        <p className="text-4xl font-bold">{formatCurrency(results.total_rebate_aud)}</p>
                        <p className="text-sm opacity-90 mt-2">{results.state} • Zone {results.zone} • {results.deeming_years} years</p>
                      </div>

                      {/* Breakdown */}
                      <div className="space-y-4">
                        {/* STC Rebate */}
                        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                          <div>
                            <h4 className="font-semibold">STC Rebate</h4>
                            <p className="text-sm text-muted-foreground">
                              {results.stcs} certificates × {formatCurrency(results.stc_price_aud)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatCurrency(results.stc_value_aud)}</p>
                          </div>
                        </div>

                        {/* Battery Rebate */}
                        {results.battery_program.battery_rebate_aud > 0 && (
                          <div className="flex justify-between items-center p-4 bg-accent rounded-lg">
                            <div>
                              <h4 className="font-semibold flex items-center gap-2">
                                <Battery className="w-4 h-4" />
                                {results.battery_program.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {results.battery_program.calc_basis}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatCurrency(results.battery_program.battery_rebate_aud)}</p>
                            </div>
                          </div>
                        )}

                        {/* VPP Incentive */}
                        {results.vpp.vpp_incentive_aud > 0 && (
                          <div className="flex justify-between items-center p-4 bg-gradient-vpp rounded-lg text-white shadow-vpp">
                            <div>
                              <h4 className="font-semibold flex items-center gap-2">
                                <Network className="w-4 h-4" />
                                {results.vpp.provider}
                              </h4>
                              <p className="text-sm opacity-90">
                                {results.vpp.conditions}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatCurrency(results.vpp.vpp_incentive_aud)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}