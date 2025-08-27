import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Sun, Compass, Eye, Calculator, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Google Maps type declarations
declare global {
  interface Window {
    google: any;
  }
}

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
}

interface ShadingAnalysis {
  nearShading: number;
  farShading: number;
  horizonShading: number;
  overallShading: number;
  confidence: number;
  features: string[];
}

export default function SiteShadingAnalyzer({ siteData, onSiteDataUpdate }: SiteShadingAnalyzerProps) {
  const [manualAddress, setManualAddress] = useState(siteData.address || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [shadingAnalysis, setShadingAnalysis] = useState<ShadingAnalysis | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const { toast } = useToast();

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      if (!window.google || !mapRef.current) return;

      try {
        const defaultLat = siteData.latitude || -33.8688;
        const defaultLng = siteData.longitude || 151.2093;

        const map = new (window as any).google.maps.Map(mapRef.current, {
          center: { lat: defaultLat, lng: defaultLng },
          zoom: 20,
          mapTypeId: 'satellite',
          tilt: 0,
          streetViewControl: false,
          fullscreenControl: false
        });

        // Add marker for the property
        const marker = new (window as any).google.maps.Marker({
          position: { lat: defaultLat, lng: defaultLng },
          map: map,
          title: 'Installation Site',
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#ff6b35',
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);

        // If we have coordinates but no address, try reverse geocoding
        if (siteData.latitude && siteData.longitude && !siteData.address) {
          performReverseGeocode(siteData.latitude, siteData.longitude);
        }

      } catch (error) {
        console.error('Error initializing map:', error);
        toast({
          title: "Map Error",
          description: "Failed to load satellite view. Please try again.",
          variant: "destructive"
        });
      }
    };

    // Load Google Maps script if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=geometry,places`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [siteData.latitude, siteData.longitude]);

  const performGeocode = async (address: string) => {
    if (!window.google) return null;

    return new Promise<{ lat: number; lng: number; formatted_address: string } | null>((resolve) => {
      const geocoder = new (window as any).google.maps.Geocoder();
      
      geocoder.geocode({ address: `${address}, Australia` }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng(),
            formatted_address: results[0].formatted_address
          });
        } else {
          resolve(null);
        }
      });
    });
  };

  const performReverseGeocode = async (lat: number, lng: number) => {
    if (!window.google) return;

    const geocoder = new (window as any).google.maps.Geocoder();
    
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        setManualAddress(results[0].formatted_address);
        onSiteDataUpdate({
          ...siteData,
          address: results[0].formatted_address
        });
      }
    });
  };

  const handleAddressLookup = async () => {
    if (!manualAddress.trim()) return;

    setGeocoding(true);
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
        
        // Update map
        if (mapInstanceRef.current) {
          const newCenter = { lat: result.lat, lng: result.lng };
          mapInstanceRef.current.setCenter(newCenter);
          
          // Add new marker
          new (window as any).google.maps.Marker({
            position: newCenter,
            map: mapInstanceRef.current,
            title: 'Installation Site',
            icon: {
              path: (window as any).google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#ff6b35',
              fillOpacity: 0.8,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }
          });
        }
        
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
      // In a real implementation, this would use satellite imagery analysis,
      // elevation data, and ML models to detect shading obstacles
      
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
    // Mock roof parameter calculation from satellite imagery
    // In reality, this would use ML models to analyze roof geometry
    
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
            <div className="flex-1">
              <Label htmlFor="address">Installation Address</Label>
              <Input
                id="address"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Enter property address..."
                className="bg-white/5 border-white/20"
                onKeyPress={(e) => e.key === 'Enter' && handleAddressLookup()}
              />
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
          <div 
            ref={mapRef}
            className="w-full h-64 rounded-lg bg-muted/20 flex items-center justify-center"
          >
            {!mapLoaded && (
              <div className="text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin mx-auto opacity-50" />
                <p className="text-sm text-muted-foreground">Loading satellite view...</p>
              </div>
            )}
          </div>
          
          {mapLoaded && (
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
          )}
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
              <div>
                <h4 className="font-medium mb-2">Detected Features:</h4>
                <div className="flex flex-wrap gap-2">
                  {shadingAnalysis.features.map((feature, index) => (
                    <Badge key={index} variant="outline" className="bg-white/5">
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
            Site Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="tilt">Roof Tilt (°)</Label>
              <Input
                id="tilt"
                type="number"
                min="0"
                max="60"
                value={siteData.roofTilt || ''}
                onChange={(e) => onSiteDataUpdate({
                  ...siteData,
                  roofTilt: parseFloat(e.target.value) || 0
                })}
                className="bg-white/5 border-white/20"
                placeholder="25"
              />
            </div>
            
            <div>
              <Label htmlFor="azimuth">Roof Azimuth (°)</Label>
              <Input
                id="azimuth"
                type="number"
                min="0"
                max="360"
                value={siteData.roofAzimuth || ''}
                onChange={(e) => onSiteDataUpdate({
                  ...siteData,
                  roofAzimuth: parseFloat(e.target.value) || 0
                })}
                className="bg-white/5 border-white/20"
                placeholder="0 (North)"
              />
            </div>
            
            <div>
              <Label htmlFor="shading">Shading (%)</Label>
              <Input
                id="shading"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={siteData.shadingFactor || ''}
                onChange={(e) => onSiteDataUpdate({
                  ...siteData,
                  shadingFactor: parseFloat(e.target.value) || 0
                })}
                className="bg-white/5 border-white/20"
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            💡 Tip: Use the satellite analysis tools above for accurate measurements, or enter known values manually.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}