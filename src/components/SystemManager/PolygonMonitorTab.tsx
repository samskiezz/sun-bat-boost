import * as React from "react";
import { polyAreaSqm, polyBounds, polyCentroid } from "@/lib/geo/polygon-core";
import { embedPolygon, matchPolygon } from "@/services/geoml-client";
import { setLastPolygon } from "@/lib/orch/event-bus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MapPin, Zap, Search } from "lucide-react";
import { MapboxPolygonMap } from "./MapboxPolygonMap";

type LatLng = [number, number];

export function PolygonMonitorTab() {
  const [drawing, setDrawing] = React.useState<boolean>(false);
  const [points, setPoints] = React.useState<LatLng[]>([]);
  const [closed, setClosed] = React.useState<boolean>(false);
  const [center] = React.useState<LatLng>([-33.8688, 151.2093]); // Sydney default
  const [zoom] = React.useState<number>(15);

  const [features, setFeatures] = React.useState<{ 
    areaSqm?: number; 
    centroid?: LatLng; 
    bounds?: any;
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

  const onMapClick = (latlng: LatLng) => {
    if (!drawing) return;
    setPoints(prev => [...prev, latlng]);
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
    setLastPolygon(points); // <-- send polygon to orchestrator layer
  };

  const computeLocalFeatures = React.useCallback(() => {
    if (!polygonReady) return;
    const polygon = { coordinates: points.map(p => ({ lat: p[0], lng: p[1] })) };
    const areaSqm = polyAreaSqm(polygon);
    const bounds = polyBounds(polygon);
    const centroid = polyCentroid(polygon);
    setFeatures({ areaSqm, bounds: bounds as any, centroid: [centroid.lat, centroid.lng] });
  }, [polygonReady, points]);

  React.useEffect(() => { 
    computeLocalFeatures(); 
  }, [computeLocalFeatures]);

  const onEmbed = async () => {
    try {
      setBusy(true); 
      setErr(null);
      const res = await embedPolygon({ points });
      // optional: merge server features
      if (res?.features) {
        setFeatures(prev => ({ ...(prev || {}), ...res.features }));
      }
    } catch (e: any) {
      setErr(e?.message || "Embed failed");
    } finally { setBusy(false); }
  };

  const onMatch = async () => {
    try {
      setBusy(true); 
      setErr(null);
      const res = await matchPolygon({ points });
      setMatches(res?.matches || []);
    } catch (e: any) {
      setErr(e?.message || "Match failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="col-span-2">
        <div className="h-[460px] w-full rounded-2xl overflow-hidden shadow">
          <MapboxPolygonMap
            center={center}
            zoom={zoom}
            onMapClick={onMapClick}
            polygonPoints={points}
            isDrawing={drawing}
            isPolygonClosed={polygonReady}
            className="h-full w-full rounded-2xl"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!drawing && !polygonReady && (
            <Button onClick={onStart} className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Start Drawing
            </Button>
          )}
          {drawing && (
            <Button onClick={onUndo} variant="outline">
              Undo Point
            </Button>
          )}
          {drawing && canFinish && (
            <Button onClick={onFinish} className="bg-emerald-600 hover:bg-emerald-700">
              Finish Polygon
            </Button>
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
          {err && (
            <Alert className="mt-3" variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="col-span-1">
        <div className="rounded-2xl border p-3">
          <h3 className="font-semibold mb-2">Polygon Features</h3>
          <ul className="text-sm space-y-1">
            <li>Vertices: {points.length}</li>
            <li>Status: <Badge variant={polygonReady ? "default" : drawing ? "secondary" : "outline"}>
              {polygonReady ? "Complete" : drawing ? "Drawing" : "Ready"}
            </Badge></li>
            <li>Area: {features?.areaSqm ? `${features.areaSqm.toFixed(1)} m²` : "-"}</li>
            <li>Centroid: {features?.centroid ? `${features.centroid[0].toFixed(5)}, ${features.centroid[1].toFixed(5)}` : "-"}</li>
          </ul>
        </div>

        <div className="rounded-2xl border p-3 mt-3">
          <h3 className="font-semibold mb-2">Similar Roofs</h3>
          <div className="space-y-2">
            {matches.length === 0 && <div className="text-sm text-gray-500">No matches yet. Draw a polygon and click "Match" to find similar roofs.</div>}
            {matches.map((m) => (
              <div key={m.id} className="border rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium">{m.label || m.id}</div>
                  <Badge variant="secondary">{(m.score * 100).toFixed(1)}%</Badge>
                </div>
                {m.metadata && (
                  <div className="text-xs text-gray-500 space-y-1">
                    {m.metadata.area && <div>Area: {m.metadata.area}m²</div>}
                    {m.metadata.location && <div>Location: {m.metadata.location}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}