import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { calculateBatteryRebates, calculateNetPrice, getStateFromPostcode, type RebateInputs, type RebateResult } from '@/utils/rebateCalculations';
import { DollarSign, Battery, Zap } from 'lucide-react';

interface RebateCalculatorProps {
  onRebateCalculated?: (result: RebateResult, netPrice: number) => void;
}

export const RebateCalculator: React.FC<RebateCalculatorProps> = ({ onRebateCalculated }) => {
  const [inputs, setInputs] = useState<RebateInputs>({
    install_date: new Date().toISOString().split('T')[0],
    state_or_territory: '',
    has_rooftop_solar: true,
    battery: {
      usable_kWh: 13.5,
      vpp_capable: true,
      battery_on_approved_list: true
    },
    stc_spot_price: 40.0,
    joins_vpp: false,
    household_income: undefined,
    dns_provider: undefined
  });

  const [quotedPrice, setQuotedPrice] = useState<number>(15000);
  const [postcode, setPostcode] = useState<string>('');
  const [result, setResult] = useState<RebateResult | null>(null);
  const [netPrice, setNetPrice] = useState<number>(0);

  // Auto-detect state from postcode
  useEffect(() => {
    if (postcode && postcode.length >= 3) {
      const postcodeNum = parseInt(postcode);
      if (!isNaN(postcodeNum)) {
        const detectedState = getStateFromPostcode(postcodeNum);
        if (detectedState !== 'Unknown' && detectedState !== inputs.state_or_territory) {
          setInputs(prev => ({ ...prev, state_or_territory: detectedState }));
        }
      }
    }
  }, [postcode, inputs.state_or_territory]);

  const calculateRebates = () => {
    const rebateResult = calculateBatteryRebates(inputs);
    const calculatedNetPrice = calculateNetPrice(quotedPrice, rebateResult);
    
    setResult(rebateResult);
    setNetPrice(calculatedNetPrice);
    
    if (onRebateCalculated) {
      onRebateCalculated(rebateResult, calculatedNetPrice);
    }
  };

  const updateBatteryProperty = (key: keyof RebateInputs['battery'], value: any) => {
    setInputs(prev => ({
      ...prev,
      battery: { ...prev.battery, [key]: value }
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Australian Battery Rebate Calculator
          </CardTitle>
          <CardDescription>
            Calculate federal and state rebates for home battery installations (updated Aug 2025)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Installation Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="install-date">Installation Date</Label>
              <Input
                id="install-date"
                type="date"
                value={inputs.install_date}
                onChange={(e) => setInputs(prev => ({ ...prev, install_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                placeholder="e.g. 2000"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State/Territory</Label>
            <Select value={inputs.state_or_territory} onValueChange={(value) => setInputs(prev => ({ ...prev, state_or_territory: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select state/territory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NSW">New South Wales</SelectItem>
                <SelectItem value="VIC">Victoria</SelectItem>
                <SelectItem value="QLD">Queensland</SelectItem>
                <SelectItem value="SA">South Australia</SelectItem>
                <SelectItem value="WA">Western Australia</SelectItem>
                <SelectItem value="TAS">Tasmania</SelectItem>
                <SelectItem value="ACT">Australian Capital Territory</SelectItem>
                <SelectItem value="NT">Northern Territory</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Battery Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Battery className="h-5 w-5" />
              Battery Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usable-kwh">Usable Capacity (kWh)</Label>
                <Input
                  id="usable-kwh"
                  type="number"
                  step="0.1"
                  value={inputs.battery.usable_kWh}
                  onChange={(e) => updateBatteryProperty('usable_kWh', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quoted-price">Quoted Price ($AUD)</Label>
                <Input
                  id="quoted-price"
                  type="number"
                  value={quotedPrice}
                  onChange={(e) => setQuotedPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="has-solar">Has Rooftop Solar</Label>
              <Switch
                id="has-solar"
                checked={inputs.has_rooftop_solar}
                onCheckedChange={(checked) => setInputs(prev => ({ ...prev, has_rooftop_solar: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="vpp-capable">VPP Capable</Label>
              <Switch
                id="vpp-capable"
                checked={inputs.battery.vpp_capable}
                onCheckedChange={(checked) => updateBatteryProperty('vpp_capable', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="joins-vpp">Will Join VPP</Label>
              <Switch
                id="joins-vpp"
                checked={inputs.joins_vpp || false}
                onCheckedChange={(checked) => setInputs(prev => ({ ...prev, joins_vpp: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="approved-list">On CEC Approved List</Label>
              <Switch
                id="approved-list"
                checked={inputs.battery.battery_on_approved_list}
                onCheckedChange={(checked) => updateBatteryProperty('battery_on_approved_list', checked)}
              />
            </div>
          </div>

          {/* State-specific inputs */}
          {inputs.state_or_territory === 'WA' && (
            <div className="space-y-4">
              <h4 className="font-medium">WA Specific Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dns-provider">Electricity Provider</Label>
                  <Select value={inputs.dns_provider || ''} onValueChange={(value) => setInputs(prev => ({ ...prev, dns_provider: value as 'Synergy' | 'Horizon' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Synergy">Synergy</SelectItem>
                      <SelectItem value="Horizon">Horizon Power</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="household-income">Household Income ($AUD)</Label>
                  <Input
                    id="household-income"
                    type="number"
                    placeholder="For loan eligibility"
                    value={inputs.household_income || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, household_income: parseFloat(e.target.value) || undefined }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="space-y-2">
            <Label htmlFor="stc-price">STC Spot Price ($AUD)</Label>
            <Input
              id="stc-price"
              type="number"
              step="0.01"
              value={inputs.stc_spot_price}
              onChange={(e) => setInputs(prev => ({ ...prev, stc_spot_price: parseFloat(e.target.value) || 40 }))}
            />
          </div>

          <Button onClick={calculateRebates} className="w-full">
            Calculate Rebates
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Rebate Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cash Incentives */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cash Incentives</h3>
              
              {result.federal_discount > 0 && (
                <div className="flex justify-between items-center">
                  <span>Federal STC Discount</span>
                  <Badge variant="outline" className="text-green-600">
                    ${result.federal_discount.toFixed(2)}
                  </Badge>
                </div>
              )}
              
              {result.state_rebate > 0 && (
                <div className="flex justify-between items-center">
                  <span>State Rebate</span>
                  <Badge variant="outline" className="text-green-600">
                    ${result.state_rebate.toFixed(2)}
                  </Badge>
                </div>
              )}
              
              {result.vpp_bonus > 0 && (
                <div className="flex justify-between items-center">
                  <span>VPP Signup Bonus</span>
                  <Badge variant="outline" className="text-green-600">
                    ${result.vpp_bonus.toFixed(2)}
                  </Badge>
                </div>
              )}
              
              {result.nt_grant > 0 && (
                <div className="flex justify-between items-center">
                  <span>NT Grant</span>
                  <Badge variant="outline" className="text-green-600">
                    ${result.nt_grant.toFixed(2)}
                  </Badge>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Cash Incentive</span>
                <Badge className="text-green-600 bg-green-50">
                  ${result.total_cash_incentive.toFixed(2)}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Net Price After Rebates</span>
                <Badge variant="outline" className="text-blue-600">
                  ${netPrice.toFixed(2)}
                </Badge>
              </div>
            </div>

            {/* Financing Options */}
            {result.financing_options.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Available Financing</h3>
                {result.financing_options.map((option, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{option.provider}</span>
                      <Badge variant="secondary">
                        {option.rate === 0 ? 'Interest Free' : `${(option.rate * 100).toFixed(1)}% p.a.`}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                    <div className="text-sm mt-1">
                      Up to ${option.amount.toLocaleString()} • {option.term_years} years maximum
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Eligibility Notes */}
            {result.eligibility_notes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Eligibility & Notes</h3>
                <ul className="space-y-2">
                  {result.eligibility_notes.map((note, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};