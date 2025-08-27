import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Network, Zap, RefreshCw } from 'lucide-react';
import { getDnspByPostcode, getDefaultMeterType, DnspDetails } from '@/utils/dnspResolver';
import { useToast } from '@/hooks/use-toast';
import { Glass } from './Glass';

interface LocationData {
  postcode: string;
  state: string;
  network: string;
  meterType: "Single" | "TOU" | "Demand";
  exportCapKw?: number;
}

interface LocationAutoFillProps {
  onLocationUpdate?: (data: LocationData) => void;
  initialPostcode?: string;
  className?: string;
}

export const LocationAutoFill: React.FC<LocationAutoFillProps> = ({
  onLocationUpdate,
  initialPostcode = '',
  className = ''
}) => {
  const [postcode, setPostcode] = useState(initialPostcode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dnspResult, setDnspResult] = useState<DnspDetails | null>(null);
  const [meterType, setMeterType] = useState<"Single" | "TOU" | "Demand">("TOU");
  const { toast } = useToast();

  const handlePostcodeLookup = useCallback(async () => {
    if (!postcode || postcode.length < 3) {
      toast({
        title: "Invalid Postcode",
        description: "Please enter a valid Australian postcode",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      setError('');
      setDnspResult(null);
      
      if (!postcode.trim()) {
        throw new Error('Please enter a postcode');
      }

      const result = await getDnspByPostcode(postcode);
      setDnspResult(result);
      
      // Auto-fill with the single result
      handleDnspSelection(result);

      toast({
        title: "Location Details Found",
        description: `${result.network}, ${result.state}`,
      });
    } catch (error: any) {
      console.error('DNSP lookup error:', error);
      setError(error.message || 'Failed to lookup postcode');
      toast({
        title: "Lookup Failed", 
        description: error.message || "Unable to fetch location details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [postcode, toast]);

  const handleDnspSelection = useCallback((selectedDnsp: DnspDetails) => {
    const defaultMeterType = getDefaultMeterType(selectedDnsp.state);
    setMeterType(defaultMeterType);
    
    // Create location data and notify parent
    const locationData: LocationData = {
      postcode: postcode,
      state: selectedDnsp.state,
      network: selectedDnsp.network,
      meterType: defaultMeterType,
      exportCapKw: selectedDnsp.export_cap_kw
    };
    
    onLocationUpdate?.(locationData);
    
    toast({
      title: "Location Updated",
      description: `Selected ${selectedDnsp.network} in ${selectedDnsp.state}`,
    });
  }, [postcode, onLocationUpdate, toast]);

  const handleMeterTypeChange = useCallback((newMeterType: "Single" | "TOU" | "Demand") => {
    setMeterType(newMeterType);
    
    if (dnspResult) {
      const locationData: LocationData = {
        postcode: postcode,
        state: dnspResult.state,
        network: dnspResult.network,
        meterType: newMeterType,
        exportCapKw: dnspResult.export_cap_kw
      };
      
      onLocationUpdate?.(locationData);
    }
  }, [postcode, dnspResult, onLocationUpdate]);

  return (
    <Glass className={`p-6 ${className}`}>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="w-5 h-5 text-primary" />
          Your Location & Meter Details
        </CardTitle>
      </CardHeader>
      
      <CardContent className="px-0 space-y-4">
        {/* Postcode Input */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="e.g. 2211"
              className="bg-white/5 border-white/20"
              onKeyDown={(e) => e.key === 'Enter' && handlePostcodeLookup()}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handlePostcodeLookup}
              disabled={loading || !postcode}
              className="bg-gradient-primary text-white"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "Lookup"
              )}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Location Summary */}
        {dnspResult && (
          <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/20">
            <div className="text-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/70">Location:</span>
                <span className="text-white font-medium">{postcode}, {dnspResult.state}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/70">Network:</span>
                <span className="text-white font-medium">{dnspResult.network}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/70">Export Cap:</span>
                <span className="text-white font-medium">{dnspResult.export_cap_kw}kW</span>
              </div>
              {dnspResult.overlap_pct && (
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Coverage:</span>
                  <span className="text-white font-medium">{(dnspResult.overlap_pct * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>

            {/* Meter Type Selection */}
            <div>
              <Label htmlFor="meter-type" className="text-white/90">Meter Type</Label>
              <Select value={meterType} onValueChange={handleMeterTypeChange}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Single Rate
                    </div>
                  </SelectItem>
                  <SelectItem value="TOU">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Time of Use (TOU)
                    </div>
                  </SelectItem>
                  <SelectItem value="Demand">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Demand Tariff
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Glass>
  );
};

export default LocationAutoFill;