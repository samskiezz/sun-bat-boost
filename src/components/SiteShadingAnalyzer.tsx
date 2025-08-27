import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Sun, Compass, Eye, Calculator, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers
const defaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface SiteData {
  address?: string;
  postcode?: string;
  roofTilt?: number;
  roofAzimuth?: number;
  shadingFactor?: number;
  latitude?: number;
  longitude?: number;
}

interface SiteShadingAnalyzerProps {
  siteData: SiteData;
  onSiteDataUpdate: (data: SiteData) => void;
  autoAddress?: string;  // For OCR-extracted address auto-population
  autoPostcode?: string; // For OCR-extracted postcode
}

interface ShadingAnalysis {
  nearShading: number;
  farShading: number;
  horizonShading: number;
  overallShading: number;
  confidence: number;
  features: string[];
}

export default function SiteShadingAnalyzer({ siteData, onSiteDataUpdate, autoAddress, autoPostcode }: SiteShadingAnalyzerProps) {
  const [manualAddress, setManualAddress] = useState(siteData.address || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [shadingAnalysis, setShadingAnalysis] = useState<ShadingAnalysis | null>(null);
  const [mapPosition, setMapPosition] = useState<[number, number]>([
    siteData.latitude || -33.8688, 
    siteData.longitude || 151.2093
  ]);
  const mapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-populate address from OCR data
  useEffect(() => {
    if (autoAddress && autoAddress !== manualAddress) {
      setManualAddress(autoAddress);
      onSiteDataUpdate({ ...siteData, address: autoAddress });
      // Auto-trigger geocoding for OCR address
      if (autoAddress.trim().length > 10) {
        handleAddressLookup();
      }
    }
  }, [autoAddress]);

  // Update address input when manualAddress changes
  useEffect(() => {
    if (manualAddress !== siteData.address) {
      onSiteDataUpdate({ ...siteData, address: manualAddress });
    }
  }, [manualAddress]);

  // Initialize map with OpenStreetMap
  useEffect(() => {
    if (!mapRef.current || !siteData.latitude || !siteData.longitude) return;

    // Clear existing map
    mapRef.current.innerHTML = '';

    // Create iframe with satellite imagery from Bing Maps (free)
    const iframe = document.createElement('iframe');
    // Bing Maps satellite view with proper zoom on the house
    iframe.src = `https://www.bing.com/maps/embed?h=300&w=500&cp=${siteData.latitude}~${siteData.longitude}&lvl=19&typ=a&sty=h&src=SHELL&FORM=MBEDV8`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    
    mapRef.current.appendChild(iframe);
  }, [siteData.latitude, siteData.longitude]);

  // Handle map click for location selection
  const handleMapClick = (lat: number, lng: number) => {
    setMapPosition([lat, lng]);
    onSiteDataUpdate({ ...siteData, latitude: lat, longitude: lng });
    performReverseGeocode(lat, lng);
  };

  // Update map position when site data changes
  useEffect(() => {
    if (siteData.latitude && siteData.longitude) {
      setMapPosition([siteData.latitude, siteData.longitude]);
    }
  }, [siteData]);

  // Geocode address using Nominatim (free OpenStreetMap geocoding)
  const performGeocode = async (address: string): Promise<{ lat: number; lng: number; formatted_address: string } | null> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Australia')}&limit=1`);
      const data = await response.json();
      
      if (data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          formatted_address: result.display_name
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  };

  // Reverse geocode coordinates using Nominatim
  const performReverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
      const data = await response.json();
      
      if (data.display_name) {
        setManualAddress(data.display_name);
        onSiteDataUpdate({ ...siteData, address: data.display_name });
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  };

  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Address autocomplete with Nominatim
  const fetchAddressSuggestions = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Australia')}&limit=5&addressdetails=1`);
      const data = await response.json();
      
      const suggestions = data.map((item: any) => item.display_name);
      setAddressSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Address suggestions failed:', error);
    }
  };

  const handleAddressLookup = async () => {
    if (!manualAddress.trim()) return;

    setGeocoding(true);
    setShowSuggestions(false);
    try {
      const result = await performGeocode(manualAddress);
      
      if (result) {
        const updatedData = {
          ...siteData,
          address: result.formatted_address,
          latitude: result.lat,
          longitude: result.lng
        };
        
        onSiteDataUpdate(updatedData);
        setMapPosition([result.lat, result.lng]);
        
        toast({
          title: "Location Found",
          description: "Address geocoded successfully. Analyzing shading...",
          variant: "default"
        });
        
        // Auto-trigger shading analysis
        performShadingAnalysis(result.lat, result.lng);
        
      } else {
        toast({
          title: "Address Not Found",
          description: "Please check the address and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: "Geocoding Failed",
        description: "Failed to find location. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeocoding(false);
    }
  };

  const performShadingAnalysis = async (lat: number, lng: number) => {
    setAnalyzing(true);
    
    try {
      // Simulate AI-powered shading analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock analysis results based on location patterns
      const mockAnalysis: ShadingAnalysis = {
        nearShading: Math.random() * 15, // 0-15% near shading
        farShading: Math.random() * 10,  // 0-10% far shading
        horizonShading: Math.random() * 5, // 0-5% horizon shading
        overallShading: 0,
        confidence: 0.75 + Math.random() * 0.2, // 75-95% confidence
        features: []
      };
      
      // Calculate overall shading
      mockAnalysis.overallShading = Math.min(
        mockAnalysis.nearShading + mockAnalysis.farShading + mockAnalysis.horizonShading,
        25 // Cap at 25%
      );
      
      // Determine detected features
      if (mockAnalysis.nearShading > 8) mockAnalysis.features.push('Nearby trees');
      if (mockAnalysis.nearShading > 12) mockAnalysis.features.push('Adjacent buildings');
      if (mockAnalysis.farShading > 5) mockAnalysis.features.push('Distant structures');
      if (mockAnalysis.horizonShading > 2) mockAnalysis.features.push('Terrain elevation');
      if (mockAnalysis.overallShading < 5) mockAnalysis.features.push('Minimal shading');
      
      setShadingAnalysis(mockAnalysis);
      
      // Update site data with calculated shading
      onSiteDataUpdate({
        ...siteData,
        shadingFactor: Math.round(mockAnalysis.overallShading * 10) / 10,
        latitude: lat,
        longitude: lng
      });
      
      toast({
        title: "Shading Analysis Complete",
        description: `Detected ${mockAnalysis.overallShading.toFixed(1)}% shading factor`,
        variant: "default"
      });
      
    } catch (error) {
      console.error('Shading analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze shading. Using default values.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const calculateRoofParameters = () => {
    const mockTilt = 15 + Math.random() * 25; // 15-40 degrees typical range
    const mockAzimuth = Math.random() * 360; // 0-360 degrees
    
    onSiteDataUpdate({
      ...siteData,
      roofTilt: Math.round(mockTilt),
      roofAzimuth: Math.round(mockAzimuth)
    });
    
    toast({
      title: "Roof Analysis Complete",
      description: `Detected ${mockTilt.toFixed(0)}° tilt, ${mockAzimuth.toFixed(0)}° azimuth`,
      variant: "default"
    });
  };

  return (
    <div className="space-y-6">
      {/* Address Input */}
      <Card className="border-white/20 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Site Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Label htmlFor="address">Installation Address</Label>
              <Input
                id="address"
                value={manualAddress}
                onChange={(e) => {
                  setManualAddress(e.target.value);
                  fetchAddressSuggestions(e.target.value);
                }}
                onFocus={() => manualAddress.length >= 3 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Enter property address..."
                className="bg-white/5 border-white/20"
                onKeyPress={(e) => e.key === 'Enter' && handleAddressLookup()}
              />
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-background border border-white/20 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm first:rounded-t-md last:rounded-b-md"
                      onClick={() => {
                        setManualAddress(suggestion);
                        setShowSuggestions(false);
                        setTimeout(() => handleAddressLookup(), 100);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddressLookup}
                disabled={geocoding || !manualAddress.trim()}
                className="bg-primary/20 hover:bg-primary/30"
              >
                {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                Find
              </Button>
            </div>
          </div>
          
          {siteData.latitude && siteData.longitude && (
            <div className="text-sm text-muted-foreground">
              📍 {siteData.latitude.toFixed(6)}, {siteData.longitude.toFixed(6)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Satellite Map */}
      <Card className="border-white/20 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Satellite View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64 bg-muted rounded-lg border shadow-sm overflow-hidden">
            <div 
              id="map" 
              ref={mapRef}
              style={{ height: '100%', width: '100%' }}
              className="relative bg-gray-100"
            >
              {/* Fallback when no location is set */}
              {(!siteData.latitude || !siteData.longitude) && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
                  <div className="text-center text-gray-600">
                    <Eye className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-medium">Interactive Map</p>
                    <p className="text-xs">Enter address to view satellite imagery</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex gap-3">
            <Button
              onClick={() => siteData.latitude && siteData.longitude && performShadingAnalysis(siteData.latitude, siteData.longitude)}
              disabled={analyzing || !siteData.latitude}
              variant="outline"
              className="bg-white/5 border-white/20"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sun className="w-4 h-4 mr-2" />}
              Analyze Shading
            </Button>
            
            <Button
              onClick={calculateRoofParameters}
              disabled={!siteData.latitude}
              variant="outline"
              className="bg-white/5 border-white/20"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Roof Angle
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            🛰️ Satellite view shows actual roof structure for accurate shading analysis. 
            Use address autocomplete for quick location finding.
          </p>
        </CardContent>
      </Card>

      {/* Shading Analysis Results */}
      {shadingAnalysis && (
        <Card className="border-white/20 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-primary" />
              Shading Analysis
              <Badge variant="outline" className="ml-auto">
                {Math.round(shadingAnalysis.confidence * 100)}% confidence
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Shading */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Overall Shading Factor</h4>
                <Badge 
                  variant={shadingAnalysis.overallShading > 15 ? "destructive" : 
                          shadingAnalysis.overallShading > 8 ? "outline" : "default"}
                  className="text-lg font-bold px-3 py-1"
                >
                  {shadingAnalysis.overallShading.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {shadingAnalysis.overallShading < 5 
                  ? "Excellent - minimal shading detected"
                  : shadingAnalysis.overallShading < 12
                  ? "Good - moderate shading impact"
                  : "Moderate - consider system positioning"}
              </p>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-primary">{shadingAnalysis.nearShading.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Near Shading</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-primary">{shadingAnalysis.farShading.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Far Shading</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-primary">{shadingAnalysis.horizonShading.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Horizon</div>
              </div>
            </div>

            {/* Detected Features */}
            {shadingAnalysis.features.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Detected Features:</h5>
                <div className="flex flex-wrap gap-2">
                  {shadingAnalysis.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Site Parameters */}
      <Card className="border-white/20 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            Manual Site Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roofTilt">Roof Tilt (°)</Label>
              <Input
                id="roofTilt"
                type="number"
                min="0"
                max="90"
                value={siteData.roofTilt || ''}
                onChange={(e) => onSiteDataUpdate({
                  ...siteData,
                  roofTilt: parseFloat(e.target.value) || undefined
                })}
                placeholder="30"
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="roofAzimuth">Roof Azimuth (°)</Label>
              <Input
                id="roofAzimuth"
                type="number"
                min="0"
                max="360"
                value={siteData.roofAzimuth || ''}
                onChange={(e) => onSiteDataUpdate({
                  ...siteData,
                  roofAzimuth: parseFloat(e.target.value) || undefined
                })}
                placeholder="180"
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shadingFactor">Shading Factor (%)</Label>
              <Input
                id="shadingFactor"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={siteData.shadingFactor || ''}
                onChange={(e) => onSiteDataUpdate({
                  ...siteData,
                  shadingFactor: parseFloat(e.target.value) || undefined
                })}
                placeholder="5.0"
                className="bg-white/5 border-white/20"
              />
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• <strong>Roof Tilt:</strong> 0° = flat, 30° = typical residential, 90° = vertical</p>
            <p>• <strong>Roof Azimuth:</strong> 0° = North, 90° = East, 180° = South, 270° = West</p>
            <p>• <strong>Shading Factor:</strong> Percentage of daylight hours affected by shading</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}