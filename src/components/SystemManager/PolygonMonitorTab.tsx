import * as React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap, useMapEvents } from "react-leaflet";
import type * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { polyAreaSqm, polyBounds, polyCentroid } from "@/lib/geo/polygon-core";
import { embedPolygon, matchPolygon } from "@/services/geoml-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MapPin, Zap, Search } from "lucide-react";

type LatLng = [number, number];

function MapEffects({ 
  whenVisibleKey, 
  bounds 
}: { 
  whenVisibleKey?: string | number | boolean; 
  bounds?: L.LatLngBoundsExpression 
}) {
  const map = useMap();
  
  React.useEffect(() => { 
    setTimeout(() => map.invalidateSize(), 0); 
  }, [map]);
  
  React.useEffect(() => { 
    if (bounds) map.fitBounds(bounds, { padding: [24, 24] }); 
  }, [map, bounds]);
  
  React.useEffect(() => { 
    if (whenVisibleKey !== undefined) map.invalidateSize(); 
  }, [map, whenVisibleKey]);
  
  return null;
}

function MapClickHandler({ 
  onMapClick, 
  drawing 
}: { 
  onMapClick: (latlng: L.LatLng) => void;
  drawing: boolean;
}) {
  useMapEvents({
    click: drawing ? (e) => onMapClick(e.latlng) : () => {},
  });
  return null;
}

export function PolygonMonitorTab() {
  const [drawing, setDrawing] = React.useState<boolean>(false);
  const [points, setPoints] = React.useState<LatLng[]>([]);
  const [closed, setClosed] = React.useState<boolean>(false);
  const [center] = React.useState<LatLng>([-33.8688, 151.2093]); // Sydney default
  const [zoom] = React.useState<number>(15);

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

  const polyAsL = React.useMemo<L.LatLngExpression[] | null>(() => {
    if (!points.length) return null;
    return points.map(p => ({ lat: p[0], lng: p[1] }));
  }, [points]);

  const canFinish = drawing && points.length >= 3 && !closed;
  const polygonReady = closed && points.length >= 3;

  const onMapClick = (latlng: L.LatLng) => {
    if (!drawing) return;
    const { lat, lng } = latlng;
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
      const areaSqm = polyAreaSqm({ coordinates: points.map(([lat, lng]) => ({ lat, lng })) });
      const bounds = polyBounds({ coordinates: points.map(([lat, lng]) => ({ lat, lng })) });
      const centroid = polyCentroid({ coordinates: points.map(([lat, lng]) => ({ lat, lng })) });
      
      // Convert bounds to the expected format
      const boundsFormatted: [[number, number], [number, number]] = [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east]
      ];
      
      setFeatures({ 
        areaSqm, 
        bounds: boundsFormatted, 
        centroid: [centroid.lat, centroid.lng],
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
      
      const res = await embedPolygon({ points });
      
      // Merge server features if available
      if (res?.features) {
        setFeatures(prev => ({ ...(prev || {}), ...res.features }));
      }
      
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
      
      const res = await matchPolygon({ points, k: 8 });
      setMatches(res?.matches || []);
      
    } catch (e: any) {
      setErr(e?.message || "Match failed");
    } finally { 
      setBusy(false); 
    }
  };

  // Guard for SSR
  if (typeof window === "undefined") {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading map...</div>
        </CardContent>
      </Card>
    );
  }

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
        {/* Map Section */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="h-[460px] w-full rounded-lg overflow-hidden shadow">
                <MapContainer 
                  center={center} 
                  zoom={zoom} 
                  className="h-full w-full" 
                  scrollWheelZoom
                >
                  <TileLayer 
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                    attribution="&copy; OpenStreetMap contributors" 
                  />
                  
                  <MapEffects whenVisibleKey="geoml" bounds={features?.bounds} />
                  <MapClickHandler onMapClick={onMapClick} drawing={drawing} />

                  {/* Live sketch line */}
                  {drawing && points.length > 0 && !closed && (
                    <Polyline positions={polyAsL as any} color="#3b82f6" weight={3} />
                  )}
                  
                  {/* Final polygon */}
                  {polygonReady && (
                    <Polygon 
                      positions={polyAsL as any} 
                      color="#10b981" 
                      fillColor="#10b981" 
                      fillOpacity={0.2}
                      weight={3}
                    />
                  )}

                  {/* Vertex markers */}
                  {points.map((p, idx) => (
                    <Marker key={idx} position={p}>
                      <Popup>Vertex {idx + 1}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
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