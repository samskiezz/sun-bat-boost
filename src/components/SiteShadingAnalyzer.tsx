import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Satellite, Search } from 'lucide-react';
import { getDnspByPostcode } from '@/utils/dnspResolver';
import { useToast } from '@/hooks/use-toast';
import { Glass } from './Glass';

interface LocationData {
  address: string;
  postcode: string;
  state: string;
  network: string;
  meterType: "Single" | "TOU" | "Demand";
}

interface SiteShadingAnalyzerProps {
  onLocationUpdate?: (data: LocationData) => void;
  onSiteUpdate?: (data: any) => void;
  onEVUpdate?: (data: any) => void;
}

const ADDRESS_SUGGESTIONS = [
  { address: "123 Collins Street, Melbourne VIC 3000", postcode: "3000" },
  { address: "456 George Street, Sydney NSW 2000", postcode: "2000" },
];

export const SiteShadingAnalyzer: React.FC<SiteShadingAnalyzerProps> = ({
  onLocationUpdate,
  onSiteUpdate,
  onEVUpdate,
}) => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const analyzeAddress = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      const postcodeMatch = address.match(/(\d{4})/);
      if (!postcodeMatch) throw new Error('Please enter a valid address with postcode');
      
      const postcode = postcodeMatch[1];
      const dnspDetails = await getDnspByPostcode(postcode);
      
      const locationData: LocationData = {
        address,
        postcode,
        state: dnspDetails.state,
        network: dnspDetails.network,
        meterType: 'TOU'
      };
      
      onLocationUpdate?.(locationData);
      
      toast({
        title: "Site Analysis Complete! 🛰️",
        description: `${dnspDetails.network} network analyzed`,
      });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [address, onLocationUpdate, toast]);

  return (
    <Glass className="space-y-4 p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Site Analysis & Configuration
        </CardTitle>
      </CardHeader>

      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Label htmlFor="address">Property Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your street address..."
              className="bg-white/5 border-white/20 mt-1"
            />
            <Search className="absolute right-3 top-8 w-4 h-4 text-muted-foreground" />
          </div>
          <Button 
            onClick={analyzeAddress}
            disabled={loading || !address}
            className="bg-gradient-primary text-white mt-6"
          >
            {loading ? "Analyzing..." : (
              <>
                <Satellite className="w-4 h-4 mr-2" />
                Analyze Site
              </>
            )}
          </Button>
        </div>
      </div>
    </Glass>
  );
};

export default SiteShadingAnalyzer;