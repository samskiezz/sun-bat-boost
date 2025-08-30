import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MapPin, Zap, Search } from "lucide-react";

type LatLng = [number, number];

// Simple polygon area calculation (placeholder)
function calculateArea(points: LatLng[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return Math.abs(area) / 2 * 111000 * 111000; // Rough conversion to m²
}

// Simple centroid calculation
function calculateCentroid(points: LatLng[]): LatLng {
  if (points.length === 0) return [0, 0];
  const lat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const lng = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  return [lat, lng];
}

export function PolygonMonitorTab() {
  const [drawing, setDrawing] = React.useState<boolean>(false);
  const [points, setPoints] = React.useState<LatLng[]>([]);
  const [closed, setClosed] = React.useState<boolean>(false);

  const [features, setFeatures] = React.useState<{ 
    areaSqm?: number; 
    centroid?: LatLng; 
    bounds?: [[number, number], [number, number]];
    perimeter?: number;
  } | null>(null);
  
  const [matches, setMatches] = React.useState<Array<{ 
    id: string; 
    score: number; 
    label?: string;
    metadata?: Record<string, any>;
  }>>([]);
  
  const [busy, setBusy] = React.useState<boolean>(false);
  const [err, setErr] = React.useState<string | null>(null);

  const canFinish = drawing && points.length >= 3 && !closed;
  const polygonReady = closed && points.length >= 3;

  const addPoint = (lat: number, lng: number) => {
    if (!drawing) return;
    setPoints(prev => [...prev, [lat, lng]]);
  };

  const onStart = () => { 
    setErr(null); 
    setMatches([]); 
    setFeatures(null); 
    setClosed(false); 
    setPoints([]); 
    setDrawing(true); 
  };
  
  const onUndo = () => { 
    if (!drawing || !points.length) return; 
    setPoints(prev => prev.slice(0, -1)); 
  };
  
  const onClear = () => { 
    setDrawing(false); 
    setClosed(false); 
    setPoints([]); 
    setFeatures(null); 
    setMatches([]); 
    setErr(null); 
  };
  
  const onFinish = () => { 
    if (!canFinish) return; 
    setClosed(true); 
    setDrawing(false); 
  };

  const computeLocalFeatures = React.useCallback(() => {
    if (!polygonReady) return;
    
    try {
      const areaSqm = calculateArea(points);
      const centroid = calculateCentroid(points);
      
      // Simple bounds calculation
      const lats = points.map(p => p[0]);
      const lngs = points.map(p => p[1]);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      ];
      
      setFeatures({ 
        areaSqm, 
        bounds, 
        centroid,
        perimeter: points.length * 10 // Simple approximation
      });
    } catch (error) {
      console.error('Error computing features:', error);
      setErr('Failed to compute polygon features');
    }
  }, [polygonReady, points]);

  React.useEffect(() => { 
    computeLocalFeatures(); 
  }, [computeLocalFeatures]);

  const onEmbed = async () => {
    try {
      setBusy(true); 
      setErr(null);
      
      // Simulate embedding for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock response
      setFeatures(prev => ({ 
        ...(prev || {}), 
        embedVector: Array.from({length: 8}, (_, i) => Math.random())
      }));
      
    } catch (e: any) {
      setErr(e?.message || "Embed failed");
    } finally { 
      setBusy(false); 
    }
  };

  const onMatch = async () => {
    try {
      setBusy(true); 
      setErr(null);
      
      // Simulate matching for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock matches
      const mockMatches = Array.from({ length: 5 }, (_, i) => ({
        id: `roof-${i + 1}`,
        score: Math.max(0.1, 0.9 - i * 0.15),
        label: `Similar Roof ${i + 1}`,
        metadata: {
          area: Math.floor(Math.random() * 200) + 50,
          location: `Building ${String.fromCharCode(65 + i)}`
        }
      }));
      
      setMatches(mockMatches);
      
    } catch (e: any) {
      setErr(e?.message || "Match failed");
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Geo/ML (Polygons) - Interactive Roof Analysis
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section (Simplified) */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="h-[460px] w-full rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-4">
                  <MapPin className="w-16 h-16 mx-auto text-gray-400" />
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-600">Interactive Map (Demo Mode)</h3>
                    <p className="text-sm text-gray-500">Click "Start Drawing" to begin polygon creation</p>
                  </div>
                  
                  {/* Simulated coordinates display */}
                  {points.length > 0 && (
                    <div className="bg-white p-3 rounded border text-left text-xs">
                      <div className="font-medium mb-1">Current Points:</div>
                      {points.map((point, idx) => (
                        <div key={idx} className="text-gray-600">
                          {idx + 1}: {point[0].toFixed(4)}, {point[1].toFixed(4)}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Simulate clicking to add points */}
                  {drawing && (
                    <Button 
                      onClick={() => addPoint(-33.8688 + Math.random() * 0.01, 151.2093 + Math.random() * 0.01)}
                      variant="outline"
                      size="sm"
                    >
                      Add Random Point (Demo)
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {!drawing && !polygonReady && (
                  <Button onClick={onStart} className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Start Drawing
                  </Button>
                )}
                
                {drawing && (
                  <>
                    <Button onClick={onUndo} variant="outline">
                      Undo Point
                    </Button>
                    {canFinish && (
                      <Button onClick={onFinish} className="bg-emerald-600 hover:bg-emerald-700">
                        Finish Polygon
                      </Button>
                    )}
                  </>
                )}
                
                {(drawing || polygonReady) && (
                  <Button onClick={onClear} variant="destructive">
                    Clear All
                  </Button>
                )}
                
                {polygonReady && (
                  <>
                    <Button 
                      disabled={busy} 
                      onClick={onEmbed} 
                      className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Embed
                    </Button>
                    <Button 
                      disabled={busy} 
                      onClick={onMatch} 
                      className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Match
                    </Button>
                  </>
                )}
              </div>
              
              {err && (
                <Alert className="mt-3" variant="destructive">
                  <AlertDescription>{err}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Panels */}
        <div className="col-span-1 space-y-4">
          {/* Features Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Polygon Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Vertices:</div>
                <div>{points.length}</div>
                
                <div className="font-medium">Status:</div>
                <div>
                  <Badge variant={polygonReady ? "default" : drawing ? "secondary" : "outline"}>
                    {polygonReady ? "Complete" : drawing ? "Drawing" : "Ready"}
                  </Badge>
                </div>
                
                <div className="font-medium">Area:</div>
                <div>{features?.areaSqm ? `${features.areaSqm.toFixed(1)} m²` : "-"}</div>
                
                <div className="font-medium">Perimeter:</div>
                <div>{features?.perimeter ? `${features.perimeter.toFixed(1)} m` : "-"}</div>
              </div>
              
              {features?.centroid && (
                <div className="pt-2 border-t">
                  <div className="text-xs font-medium mb-1">Centroid:</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {features.centroid[0].toFixed(5)}, {features.centroid[1].toFixed(5)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Matches Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Similar Roofs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {matches.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No matches yet. Draw a polygon and click "Match" to find similar roofs.
                  </div>
                )}
                
                {matches.map((match) => (
                  <div key={match.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">
                        {match.label || match.id}
                      </div>
                      <Badge variant="secondary">
                        {(match.score * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    
                    {match.metadata && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        {match.metadata.area && (
                          <div>Area: {match.metadata.area}m²</div>
                        )}
                        {match.metadata.location && (
                          <div>Location: {match.metadata.location}</div>
                        )}
                        {match.metadata.confidence && (
                          <div>Confidence: {(match.metadata.confidence * 100).toFixed(0)}%</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}