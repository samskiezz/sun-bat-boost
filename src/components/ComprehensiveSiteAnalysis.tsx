import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Satellite, Sun, Zap, Info, Camera, Ruler, Compass } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

interface LocationData {
  postcode: string;
  state: string;
  network: string;
  meterType: 'Single' | 'TOU' | 'Demand';
  exportCapacity?: number;
  phaseLimit?: string;
}

interface SiteData {
  address?: string;
  latitude?: number;
  longitude?: number;
  roofSlope?: number;
  roofAzimuth?: number;
  roofTilt?: number;
  shadingFactor?: number;
  roofArea?: number;
  solarAccess?: number;
}

interface ComprehensiveSiteAnalysisProps {
  initialPostcode?: string;
  onLocationUpdate: (data: LocationData) => void;
  onSiteUpdate: (data: SiteData) => void;
}

export default function ComprehensiveSiteAnalysis({ 
  initialPostcode, 
  onLocationUpdate, 
  onSiteUpdate 
}: ComprehensiveSiteAnalysisProps) {
  const [postcode, setPostcode] = useState(initialPostcode || '');
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [siteData, setSiteData] = useState<SiteData>({
    roofSlope: 22, // Typical Australian roof slope
    roofAzimuth: 0, // North facing
    roofTilt: 22,
    shadingFactor: 0.85, // 15% shading losses
    solarAccess: 95
  });
  const [activeTab, setActiveTab] = useState('dnsp');
  const mapContainer = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handlePostcodeLookup = async () => {
    if (!postcode) {
      toast({
        title: "Error",
        description: "Please enter a postcode",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log(`🔍 Looking up DNSP for postcode: ${postcode}`);
      
      const { getDnspByPostcode } = await import('@/utils/dnspResolver');
      const dnspDetails = await getDnspByPostcode(postcode);
      
      const locationInfo: LocationData = {
        postcode: postcode,
        state: dnspDetails.state,
        network: dnspDetails.network,
        meterType: 'TOU',
        exportCapacity: dnspDetails.export_cap_kw,
        phaseLimit: dnspDetails.phase_limit || '1P≤5kW;3P≤10kW'
      };
      
      setLocationData(locationInfo);
      onLocationUpdate(locationInfo);
      
      toast({
        title: "Location Found",
        description: `${dnspDetails.network} - ${dnspDetails.state}`,
      });

      // Try to get coordinates for mapping
      await getCoordinatesFromPostcode(postcode);
      
    } catch (error) {
      console.error('DNSP lookup failed:', error);
      toast({
        title: "Error",
        description: "Failed to lookup location details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCoordinatesFromPostcode = async (postcode: string) => {
    try {
      // Use a free geocoding service or build coordinates from postcode
      // For Australian postcodes, we can estimate coordinates
      const coords = estimateCoordinatesFromPostcode(postcode);
      if (coords) {
        setSiteData(prev => ({
          ...prev,
          latitude: coords.lat,
          longitude: coords.lng
        }));
        initializeMap(coords.lat, coords.lng);
      }
    } catch (error) {
      console.error('Failed to get coordinates:', error);
    }
  };

  const estimateCoordinatesFromPostcode = (postcode: string) => {
    const pc = parseInt(postcode);
    // Rough Australian postcode to coordinates mapping
    if (pc >= 2000 && pc <= 2999) return { lat: -33.8688, lng: 151.2093 }; // Sydney
    if (pc >= 3000 && pc <= 3999) return { lat: -37.8136, lng: 144.9631 }; // Melbourne  
    if (pc >= 4000 && pc <= 4999) return { lat: -27.4698, lng: 153.0251 }; // Brisbane
    if (pc >= 5000 && pc <= 5999) return { lat: -34.9285, lng: 138.6007 }; // Adelaide
    if (pc >= 6000 && pc <= 6999) return { lat: -31.9505, lng: 115.8605 }; // Perth
    if (pc >= 7000 && pc <= 7999) return { lat: -42.8821, lng: 147.3272 }; // Hobart
    return null;
  };

  const initializeMap = (lat: number, lng: number) => {
    if (!mapContainer.current) return;
    
    // Initialize satellite view - placeholder for now
    // In production, you'd use Mapbox, Google Maps, or similar
    mapContainer.current.innerHTML = `
      <div class="w-full h-64 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
        <div class="text-white text-center">
          <Satellite class="h-12 w-12 mx-auto mb-2" />
          <p class="text-lg font-semibold">Satellite View</p>
          <p class="text-sm opacity-90">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</p>
          <p class="text-xs mt-2 opacity-75">Interactive mapping requires Mapbox API key</p>
        </div>
      </div>
    `;
  };

  const updateSiteParameter = (key: keyof SiteData, value: number | string) => {
    const updated = { ...siteData, [key]: value };
    setSiteData(updated);
    onSiteUpdate(updated);
  };

  const calculateSolarPotential = () => {
    const { roofSlope, roofAzimuth, shadingFactor, solarAccess } = siteData;
    
    // Simplified solar potential calculation
    let azimuthFactor = 1;
    if (roofAzimuth !== undefined) {
      // Best is north (0°), worst is south (180°)
      const azimuthDiff = Math.abs(roofAzimuth);
      azimuthFactor = Math.cos((azimuthDiff * Math.PI) / 180);
    }
    
    let tiltFactor = 1;
    if (roofSlope !== undefined) {
      // Optimal tilt varies by latitude, assume ~30° optimal
      const optimalTilt = 30;
      const tiltDiff = Math.abs(roofSlope - optimalTilt);
      tiltFactor = Math.cos((tiltDiff * Math.PI) / 180) * 0.9 + 0.1;
    }
    
    const shadingFactorDecimal = (shadingFactor || 0.85);
    const accessFactor = (solarAccess || 95) / 100;
    
    return Math.round(azimuthFactor * tiltFactor * shadingFactorDecimal * accessFactor * 100);
  };

  return (
    <Card className="border-primary/20 bg-white/10 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Site Analysis & Solar Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Postcode Lookup */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="e.g., 2000"
                className="bg-white/10 border-white/20"
              />
            </div>
            <Button 
              onClick={handlePostcodeLookup}
              disabled={loading}
              className="mt-6 bg-primary hover:bg-primary/90"
            >
              {loading ? 'Looking up...' : 'Analyze Site'}
            </Button>
          </div>
        </div>

        {locationData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dnsp">DNSP & Limits</TabsTrigger>
                <TabsTrigger value="satellite">Satellite View</TabsTrigger>
                <TabsTrigger value="shading">Shading Analysis</TabsTrigger>
                <TabsTrigger value="solar">Solar Assessment</TabsTrigger>
              </TabsList>

              {/* DNSP Information */}
              <TabsContent value="dnsp" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Network Provider
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">DNSP</Label>
                        <div className="text-lg font-semibold">{locationData.network}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">State</Label>
                        <div className="font-medium">{locationData.state}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Postcode</Label>
                        <div className="font-medium">{locationData.postcode}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Export Limits
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">Export Capacity</Label>
                        <div className="text-lg font-semibold text-green-500">
                          {locationData.exportCapacity}kW
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Phase Limits</Label>
                        <div className="text-sm font-medium">{locationData.phaseLimit}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                          Single Phase: ≤5kW
                        </Badge>
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-700">
                          Three Phase: ≤10kW  
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Label htmlFor="meterType">Meter Type</Label>
                  <Select
                    value={locationData.meterType}
                    onValueChange={(value: 'Single' | 'TOU' | 'Demand') => {
                      const updated = { ...locationData, meterType: value };
                      setLocationData(updated);
                      onLocationUpdate(updated);
                    }}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single Rate</SelectItem>
                      <SelectItem value="TOU">Time of Use</SelectItem>
                      <SelectItem value="Demand">Demand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Satellite View */}
              <TabsContent value="satellite" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Satellite className="h-5 w-5" />
                    Satellite Imagery
                  </div>
                  <div ref={mapContainer} className="w-full h-64 rounded-lg overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                      <div className="text-white text-center">
                        <Camera className="h-12 w-12 mx-auto mb-2" />
                        <p>Click "Analyze Site" to load satellite view</p>
                      </div>
                    </div>
                  </div>
                  
                  {siteData.latitude && siteData.longitude && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Latitude</Label>
                        <div className="font-mono">{siteData.latitude.toFixed(6)}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Longitude</Label>
                        <div className="font-mono">{siteData.longitude.toFixed(6)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Shading Analysis */}
              <TabsContent value="shading" className="space-y-4">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Sun className="h-5 w-5" />
                    Shading & Obstruction Analysis
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="shadingFactor">Shading Factor</Label>
                        <div className="flex items-center gap-4 mt-2">
                          <Slider
                            value={[Math.round((siteData.shadingFactor || 0.85) * 100)]}
                            onValueChange={([value]) => updateSiteParameter('shadingFactor', value / 100)}
                            min={50}
                            max={100}
                            step={1}
                            className="flex-1"
                          />
                          <div className="text-sm font-medium w-16">
                            {Math.round((siteData.shadingFactor || 0.85) * 100)}%
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          85% = minimal shading, 70% = moderate, 50% = heavy shading
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="solarAccess">Solar Access</Label>
                        <div className="flex items-center gap-4 mt-2">
                          <Slider
                            value={[siteData.solarAccess || 95]}
                            onValueChange={([value]) => updateSiteParameter('solarAccess', value)}
                            min={60}
                            max={100}
                            step={1}
                            className="flex-1"
                          />
                          <div className="text-sm font-medium w-16">
                            {siteData.solarAccess || 95}%
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Percentage of roof area with good sun exposure
                        </div>
                      </div>
                    </div>

                    <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">Shading Impact</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Morning (6AM-12PM)</span>
                            <Badge variant={siteData.shadingFactor! >= 0.8 ? "default" : "secondary"}>
                              {siteData.shadingFactor! >= 0.8 ? "Good" : "Moderate"}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Afternoon (12PM-6PM)</span>
                            <Badge variant={siteData.solarAccess! >= 90 ? "default" : "secondary"}>
                              {siteData.solarAccess! >= 90 ? "Excellent" : "Good"}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Overall Rating</span>
                            <Badge variant={calculateSolarPotential() >= 80 ? "default" : "secondary"}>
                              {calculateSolarPotential()}%
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Solar Assessment */}
              <TabsContent value="solar" className="space-y-4">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Compass className="h-5 w-5" />
                    Roof Orientation & Tilt Analysis
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="roofAzimuth">Roof Azimuth (Direction)</Label>
                        <div className="flex items-center gap-4 mt-2">
                          <Slider
                            value={[siteData.roofAzimuth || 0]}
                            onValueChange={([value]) => updateSiteParameter('roofAzimuth', value)}
                            min={-180}
                            max={180}
                            step={5}
                            className="flex-1"
                          />
                          <div className="text-sm font-medium w-16">
                            {siteData.roofAzimuth || 0}°
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          0° = North (best), ±90° = East/West, ±180° = South (worst)
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="roofSlope">Roof Tilt/Slope</Label>
                        <div className="flex items-center gap-4 mt-2">
                          <Slider
                            value={[siteData.roofTilt || 22]}
                            onValueChange={([value]) => updateSiteParameter('roofTilt', value)}
                            min={0}
                            max={60}
                            step={1}
                            className="flex-1"
                          />
                          <div className="text-sm font-medium w-16">
                            {siteData.roofTilt || 22}°
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Optimal: 20-30° for most Australian locations
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="roofArea">Available Roof Area (m²)</Label>
                        <Input
                          id="roofArea"
                          type="number"
                          value={siteData.roofArea || ''}
                          onChange={(e) => updateSiteParameter('roofArea', parseFloat(e.target.value) || 0)}
                          placeholder="e.g., 50"
                          className="bg-white/10 border-white/20"
                        />
                      </div>
                    </div>

                    <Card className="bg-gradient-to-br from-blue-500/10 to-green-500/10 border-blue-500/20">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3">Solar Performance Rating</h4>
                        <div className="text-center space-y-2">
                          <div className="text-3xl font-bold text-primary">
                            {calculateSolarPotential()}%
                          </div>
                          <div className="text-sm text-muted-foreground">Overall Solar Potential</div>
                        </div>
                        
                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Azimuth Factor</span>
                            <span>{Math.round(Math.cos(((siteData.roofAzimuth || 0) * Math.PI) / 180) * 100)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tilt Factor</span>
                            <span>{Math.round((Math.cos((Math.abs((siteData.roofTilt || 22) - 30) * Math.PI) / 180) * 0.9 + 0.1) * 100)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Shading Factor</span>
                            <span>{Math.round((siteData.shadingFactor || 0.85) * 100)}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}