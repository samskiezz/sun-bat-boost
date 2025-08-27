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
  const [dnspOptions, setDnspOptions] = useState<DnspDetails[]>([]);
  const [selectedDnsp, setSelectedDnsp] = useState<DnspDetails | null>(null);
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

    setLoading(true);
    try {
      const dnsps = await getDnspByPostcode(postcode);
      
      if (dnsps.length === 0) {
        toast({
          title: "Postcode Not Found",
          description: "No distribution network found for this postcode. Please check and try again.",
          variant: "destructive"
        });
        setDnspOptions([]);
        setSelectedDnsp(null);
        return;
      }

      setDnspOptions(dnsps);
      
      // Auto-select if only one option
      if (dnsps.length === 1) {
        const dnsp = dnsps[0];
        setSelectedDnsp(dnsp);
        const defaultMeter = getDefaultMeterType(dnsp.state);
        setMeterType(defaultMeter);
        
        // Notify parent component
        if (onLocationUpdate) {
          onLocationUpdate({
            postcode,
            state: dnsp.state,
            network: dnsp.network,
            meterType: defaultMeter,
            exportCapKw: dnsp.export_cap_kw
          });
        }

        toast({
          title: "Location Details Found",
          description: `${dnsp.network}, ${dnsp.state} - ${defaultMeter} meter`,
        });
      } else {
        toast({
          title: "Multiple Networks Found",
          description: `Found ${dnsps.length} distribution networks. Please select one.`,
        });
      }
    } catch (error) {
      console.error('DNSP lookup error:', error);
      toast({
        title: "Lookup Failed", 
        description: "Unable to fetch location details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [postcode, onLocationUpdate, toast]);

  const handleDnspSelection = useCallback((dnsp: DnspDetails) => {
    setSelectedDnsp(dnsp);
    const defaultMeter = getDefaultMeterType(dnsp.state);
    setMeterType(defaultMeter);
    
    if (onLocationUpdate) {
      onLocationUpdate({
        postcode,
        state: dnsp.state,
        network: dnsp.network,
        meterType: defaultMeter,
        exportCapKw: dnsp.export_cap_kw
      });
    }
  }, [postcode, onLocationUpdate]);

  const handleMeterTypeChange = useCallback((newMeterType: "Single" | "TOU" | "Demand") => {
    setMeterType(newMeterType);
    
    if (selectedDnsp && onLocationUpdate) {
      onLocationUpdate({
        postcode,
        state: selectedDnsp.state,
        network: selectedDnsp.network,
        meterType: newMeterType,
        exportCapKw: selectedDnsp.export_cap_kw
      });
    }
  }, [postcode, selectedDnsp, onLocationUpdate]);

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

        {/* DNSP Selection */}
        {dnspOptions.length > 1 && (
          <div>
            <Label>Distribution Network</Label>
            <div className="grid gap-2 mt-2">
              {dnspOptions.map((dnsp, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all ${
                    selectedDnsp === dnsp 
                      ? 'bg-primary/20 border-primary' 
                      : 'bg-white/5 border-white/20 hover:bg-white/10'
                  }`}
                  onClick={() => handleDnspSelection(dnsp)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          {dnsp.network}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {dnsp.state} • Export Cap: {dnsp.export_cap_kw}kW
                        </div>
                      </div>
                      {selectedDnsp === dnsp && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Selected Location Summary */}
        {selectedDnsp && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-white/5 border border-white/20">
              <div>
                <Label className="text-xs text-muted-foreground">State</Label>
                <div className="font-medium">{selectedDnsp.state}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Distribution Network</Label>
                <div className="font-medium">{selectedDnsp.network}</div>
              </div>
            </div>

            {/* Meter Type Selection */}
            <div>
              <Label htmlFor="meter-type">Meter Type</Label>
              <Select value={meterType} onValueChange={handleMeterTypeChange}>
                <SelectTrigger className="bg-white/5 border-white/20">
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