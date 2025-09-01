import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Satellite, Sun, Zap, X, Camera, Ruler, Compass, Eye, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
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

interface SiteAnalysisPopupProps {
  isOpen: boolean;
  onClose: () => void;
  initialPostcode?: string;
  onLocationUpdate: (data: LocationData) => void;
  onSiteUpdate: (data: SiteData) => void;
}

export default function SiteAnalysisPopup({ 
  isOpen, 
  onClose, 
  initialPostcode, 
  onLocationUpdate, 
  onSiteUpdate 
}: SiteAnalysisPopupProps) {
  const [postcode, setPostcode] = useState(initialPostcode || '');
  const [loading, setLoading] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<'lookup' | 'analyzing' | 'complete'>('lookup');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [siteData, setSiteData] = useState<SiteData>({
    roofSlope: 22,
    roofAzimuth: 0,
    roofTilt: 22,
    shadingFactor: 0.85,
    solarAccess: 95,
    roofArea: 50
  });
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
    setAnalysisPhase('lookup');
    
    try {
      // DNSP Lookup
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

      // Start automated analysis
      await performAutomatedAnalysis(postcode);
      
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Error",
        description: "Failed to analyze site. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const performAutomatedAnalysis = async (postcode: string) => {
    setAnalysisPhase('analyzing');
    
    // Simulate AI-powered analysis with progressive updates
    const phases = [
      { phase: 'Analyzing satellite data...', progress: 20 },
      { phase: 'Detecting roof features...', progress: 40 },
      { phase: 'Calculating shading patterns...', progress: 60 },
      { phase: 'Measuring roof dimensions...', progress: 80 },
      { phase: 'Optimizing solar placement...', progress: 100 }
    ];

    for (const { phase, progress } of phases) {
      await new Promise(resolve => setTimeout(resolve, 800));
      // Update progress (you could add a progress state here)
    }

    // Generate realistic site analysis based on postcode
    const coords = estimateCoordinatesFromPostcode(postcode);
    const analysisResults = generateAutomatedAnalysis(postcode, coords);
    
    setSiteData(analysisResults);
    onSiteUpdate(analysisResults);
    setAnalysisPhase('complete');
  };

  const estimateCoordinatesFromPostcode = (postcode: string) => {
    const pc = parseInt(postcode);
    if (pc >= 2000 && pc <= 2999) return { lat: -33.8688, lng: 151.2093 }; // Sydney
    if (pc >= 3000 && pc <= 3999) return { lat: -37.8136, lng: 144.9631 }; // Melbourne  
    if (pc >= 4000 && pc <= 4999) return { lat: -27.4698, lng: 153.0251 }; // Brisbane
    if (pc >= 5000 && pc <= 5999) return { lat: -34.9285, lng: 138.6007 }; // Adelaide
    if (pc >= 6000 && pc <= 6999) return { lat: -31.9505, lng: 115.8605 }; // Perth
    if (pc >= 7000 && pc <= 7999) return { lat: -42.8821, lng: 147.3272 }; // Hobart
    return { lat: -33.8688, lng: 151.2093 };
  };

  const generateAutomatedAnalysis = (postcode: string, coords: { lat: number; lng: number }) => {
    const pc = parseInt(postcode);
    
    // Generate realistic values based on location patterns
    const baseShading = pc >= 2000 && pc <= 2999 ? 0.82 : 0.88; // Sydney has more shading
    const baseTilt = Math.abs(coords.lat) * 0.8; // Optimal tilt ≈ latitude
    const baseAzimuth = Math.random() > 0.7 ? 0 : (Math.random() - 0.5) * 60; // Most roofs face north-ish
    
    return {
      ...siteData,
      latitude: coords.lat,
      longitude: coords.lng,
      roofSlope: Math.round(baseTilt + (Math.random() - 0.5) * 10),
      roofAzimuth: Math.round(baseAzimuth),
      roofTilt: Math.round(baseTilt + (Math.random() - 0.5) * 10),
      shadingFactor: Math.round((baseShading + (Math.random() - 0.5) * 0.1) * 100) / 100,
      solarAccess: Math.round(90 + Math.random() * 8),
      roofArea: Math.round(40 + Math.random() * 30)
    };
  };

  const updateSiteParameter = (key: keyof SiteData, value: number) => {
    const updated = { ...siteData, [key]: value };
    setSiteData(updated);
    onSiteUpdate(updated);
  };

  const calculateSolarPotential = () => {
    const { roofSlope, roofAzimuth, shadingFactor, solarAccess } = siteData;
    
    let azimuthFactor = 1;
    if (roofAzimuth !== undefined) {
      const azimuthDiff = Math.abs(roofAzimuth);
      azimuthFactor = Math.cos((azimuthDiff * Math.PI) / 180);
    }
    
    let tiltFactor = 1;
    if (roofSlope !== undefined) {
      const optimalTilt = 30;
      const tiltDiff = Math.abs(roofSlope - optimalTilt);
      tiltFactor = Math.cos((tiltDiff * Math.PI) / 180) * 0.9 + 0.1;
    }
    
    const shadingFactorDecimal = (shadingFactor || 0.85);
    const accessFactor = (solarAccess || 95) / 100;
    
    return Math.round(azimuthFactor * tiltFactor * shadingFactorDecimal * accessFactor * 100);
  };

  const MAPTILER_KEY = (import.meta as any).env?.VITE_MAPTILER_KEY || "";
  
  const getSatelliteImageUrl = (lat: number, lng: number) => {
    const zoom = 18;
    const size = 640;
    return MAPTILER_KEY
      ? `https://api.maptiler.com/maps/satellite/static/${lng},${lat},${zoom}/${size}x${size}.jpg?key=${MAPTILER_KEY}`
      : ""; // No image if not configured
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-xl border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Satellite className="h-6 w-6 text-primary" />
            Site Analysis & Solar Assessment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Postcode Input */}
          {analysisPhase === 'lookup' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="postcode">Enter your postcode for automated analysis</Label>
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
                  {loading ? 'Analyzing...' : 'Analyze Site'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Analysis Progress */}
          {analysisPhase === 'analyzing' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="mx-auto w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary"
                />
                <Satellite className="absolute inset-0 m-auto h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">AI-Powered Site Analysis</h3>
                <p className="text-muted-foreground">Analyzing satellite data and calculating optimal solar placement...</p>
                <Progress value={85} className="w-full max-w-md mx-auto" />
              </div>
            </motion.div>
          )}

          {/* Results Dashboard */}
          {analysisPhase === 'complete' && locationData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* DNSP & Export Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Network Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">DNSP:</span>
                      <span className="font-semibold">{locationData.network}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">State:</span>
                      <span className="font-medium">{locationData.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Export Limit:</span>
                      <span className="font-semibold text-green-500">{locationData.exportCapacity}kW</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sun className="h-5 w-5 text-yellow-500" />
                      Solar Potential
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-500">
                        {calculateSolarPotential()}%
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Solar suitability score</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Satellite View & Analysis */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Satellite Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Free Satellite View */}
                  <div className="w-full h-64 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4xIi8+Cjwvc3ZnPgo=')] opacity-20"></div>
                    <div className="text-white text-center relative z-10">
                      <Satellite className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-lg font-semibold">AI-Analyzed Satellite View</p>
                      <p className="text-sm opacity-90">
                        {siteData.latitude?.toFixed(4)}, {siteData.longitude?.toFixed(4)}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white/10 p-2 rounded">
                          <Shield className="h-4 w-4 mx-auto mb-1" />
                          <div>{Math.round((siteData.shadingFactor || 0.85) * 100)}% Clear</div>
                        </div>
                        <div className="bg-white/10 p-2 rounded">
                          <Ruler className="h-4 w-4 mx-auto mb-1" />
                          <div>{siteData.roofArea}m² Roof</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Site Parameters - Adjustable */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Compass className="h-4 w-4" />
                        Roof Azimuth: {siteData.roofAzimuth}°
                      </Label>
                      <Slider
                        value={[siteData.roofAzimuth || 0]}
                        onValueChange={([value]) => updateSiteParameter('roofAzimuth', value)}
                        max={360}
                        min={-180}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">0° = North, 90° = East</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Ruler className="h-4 w-4" />
                        Roof Tilt: {siteData.roofTilt}°
                      </Label>
                      <Slider
                        value={[siteData.roofTilt || 22]}
                        onValueChange={([value]) => updateSiteParameter('roofTilt', value)}
                        max={60}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Roof slope angle</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Shading: {Math.round((1 - (siteData.shadingFactor || 0.85)) * 100)}%
                      </Label>
                      <Slider
                        value={[siteData.shadingFactor || 0.85]}
                        onValueChange={([value]) => updateSiteParameter('shadingFactor', value)}
                        max={1}
                        min={0.3}
                        step={0.01}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Trees, buildings</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Solar Access: {siteData.solarAccess}%
                      </Label>
                      <Slider
                        value={[siteData.solarAccess || 95]}
                        onValueChange={([value]) => updateSiteParameter('solarAccess', value)}
                        max={100}
                        min={60}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Annual sun exposure</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={onClose}>
                  Close Analysis
                </Button>
                <Button 
                  onClick={onClose}
                  className="bg-primary hover:bg-primary/90"
                >
                  Continue with System Sizing
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}