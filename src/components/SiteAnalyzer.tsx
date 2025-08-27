import React, { useEffect, useState } from 'react';
import { MapPin, Sun, Cloud, Navigation, Compass, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SiteAnalysisData {
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  roofTilt: number;
  roofAzimuth: number;
  shadingFactor: number;
  solarIrradiance: number;
  optimalTilt: number;
  optimalAzimuth: number;
  annualGeneration: number;
}

interface SiteAnalyzerProps {
  address?: string;
  postcode?: string;
  onAnalysisComplete: (analysis: SiteAnalysisData) => void;
}

export default function SiteAnalyzer({ address, postcode, onAnalysisComplete }: SiteAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SiteAnalysisData | null>(null);

  useEffect(() => {
    if (address || postcode) {
      performSiteAnalysis();
    }
  }, [address, postcode]);

  const performSiteAnalysis = async () => {
    setAnalyzing(true);
    
    try {
      // Simulate AI-powered site analysis
      // In reality, this would use Google Solar API, satellite imagery, etc.
      
      const mockAnalysis: SiteAnalysisData = {
        address: address || `Address for ${postcode}`,
        postcode: postcode || '2000',
        latitude: -33.8688 + (Math.random() - 0.5) * 0.2,
        longitude: 151.2093 + (Math.random() - 0.5) * 0.2,
        roofTilt: 25 + Math.floor(Math.random() * 10),
        roofAzimuth: Math.floor(Math.random() * 45), // 0-45 degrees from north
        shadingFactor: Math.random() * 0.3, // 0-30% shading
        solarIrradiance: 4.5 + Math.random() * 1.5, // kWh/m²/day
        optimalTilt: 32,
        optimalAzimuth: 0, // True north
        annualGeneration: 1400 + Math.floor(Math.random() * 200) // kWh per kW installed
      };

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setAnalysis(mockAnalysis);
      onAnalysisComplete(mockAnalysis);
    } catch (error) {
      console.error('Site analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!address && !postcode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Site Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Provide an address or postcode to enable automatic site analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (analyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing Site Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sun className="w-4 h-4" />
              <span>Analyzing solar irradiance patterns...</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Cloud className="w-4 h-4" />
              <span>Detecting shading obstructions...</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Compass className="w-4 h-4" />
              <span>Calculating optimal roof orientation...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Site Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={performSiteAnalysis} className="w-full">
            Analyze Site Conditions
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Site Analysis Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Location</div>
                <div className="text-sm">{analysis.address}</div>
                <div className="text-xs text-muted-foreground">
                  {analysis.latitude.toFixed(4)}°, {analysis.longitude.toFixed(4)}°
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-muted-foreground">Roof Orientation</div>
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  <span className="text-sm">{analysis.roofAzimuth}° from North</span>
                  <Badge variant={analysis.roofAzimuth <= 45 ? "default" : "secondary"}>
                    {analysis.roofAzimuth <= 45 ? "Optimal" : "Good"}
                  </Badge>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-muted-foreground">Roof Tilt</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{analysis.roofTilt}°</span>
                  <Badge variant={Math.abs(analysis.roofTilt - 32) <= 5 ? "default" : "secondary"}>
                    {Math.abs(analysis.roofTilt - 32) <= 5 ? "Optimal" : "Good"}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Solar Irradiance</div>
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">{analysis.solarIrradiance.toFixed(1)} kWh/m²/day</span>
                  <Badge variant={analysis.solarIrradiance >= 5 ? "default" : "secondary"}>
                    {analysis.solarIrradiance >= 5 ? "Excellent" : "Good"}
                  </Badge>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-muted-foreground">Shading Analysis</div>
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4" />
                  <span className="text-sm">{Math.round(analysis.shadingFactor * 100)}% shaded</span>
                  <Badge variant={analysis.shadingFactor <= 0.15 ? "default" : analysis.shadingFactor <= 0.3 ? "secondary" : "destructive"}>
                    {analysis.shadingFactor <= 0.15 ? "Minimal" : analysis.shadingFactor <= 0.3 ? "Moderate" : "High"}
                  </Badge>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-muted-foreground">Generation Potential</div>
                <div className="text-lg font-semibold text-primary">
                  {analysis.annualGeneration} kWh/kW/year
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Optimization Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {analysis.roofAzimuth > 45 && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">Roof Orientation</div>
                  <div className="text-muted-foreground">
                    Consider panels facing more towards north (optimal: 0°) for maximum generation.
                  </div>
                </div>
              </div>
            )}
            
            {Math.abs(analysis.roofTilt - 32) > 10 && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">Roof Tilt</div>
                  <div className="text-muted-foreground">
                    Optimal tilt for your location is around 32°. Consider tilt frames if feasible.
                  </div>
                </div>
              </div>
            )}
            
            {analysis.shadingFactor > 0.2 && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">Shading Mitigation</div>
                  <div className="text-muted-foreground">
                    Consider power optimizers or microinverters to minimize shading impact on overall system performance.
                  </div>
                </div>
              </div>
            )}
            
            {analysis.roofAzimuth <= 45 && analysis.shadingFactor <= 0.15 && Math.abs(analysis.roofTilt - 32) <= 10 && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">Excellent Site Conditions</div>
                  <div className="text-muted-foreground">
                    Your site has optimal conditions for solar generation. Standard string inverters should work well.
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}