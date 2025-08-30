import * as React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from "react-leaflet";
import type * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { polyAreaSqm, polyBounds, polyCentroid } from "@/lib/geo/polygon-core";
import { embedPolygon, matchPolygon } from "@/services/geoml-client";
import { setLastPolygon } from "@/lib/orch/event-bus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MapPin, Zap, Search } from "lucide-react";
import { MapClickHandler } from "./MapClickHandler";

type LatLng = [number, number];

function MapEffects({ whenVisibleKey, bounds }: { whenVisibleKey?: string | number | boolean; bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  React.useEffect(() => { setTimeout(() => map.invalidateSize(), 0); }, [map]);
  React.useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [24, 24] }); }, [map, bounds]);
  React.useEffect(() => { if (whenVisibleKey !== undefined) map.invalidateSize(); }, [map, whenVisibleKey]);
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
    bounds?: L.LatLngBoundsLiteral;
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

  const onMapClick = (e: any) => {
    if (!drawing) return;
    const { lat, lng } = e.latlng as L.LatLng;
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
            <MapClickHandler onMapClick={onMapClick} />
            
            {/* live sketch line */}
            {drawing && points.length > 0 && !closed && <Polyline positions={polyAsL as any} />}
            
            {/* final polygon */}
            {polygonReady && <Polygon positions={polyAsL as any} />}

            {/* vertices markers */}
            {points.map((p, idx) => (
              <Marker key={idx} position={p}>
                <Popup>Vertex {idx + 1}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!drawing && !polygonReady && <button onClick={onStart} className="px-3 py-2 rounded-lg bg-black/80 text-white">Start drawing</button>}
          {drawing && <button onClick={onUndo} className="px-3 py-2 rounded-lg bg-gray-200">Undo</button>}
          {drawing && canFinish && <button onClick={onFinish} className="px-3 py-2 rounded-lg bg-emerald-600 text-white">Finish polygon</button>}
          {(drawing || polygonReady) && <button onClick={onClear} className="px-3 py-2 rounded-lg bg-rose-600 text-white">Clear</button>}
          {polygonReady && <button disabled={busy} onClick={onEmbed} className="px-3 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50">Embed</button>}
          {polygonReady && <button disabled={busy} onClick={onMatch} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">Match</button>}
          {err && <span className="text-rose-600 ml-2">{err}</span>}
        </div>
      </div>

      <div className="col-span-1">
        <div className="rounded-2xl border p-3">
          <h3 className="font-semibold mb-2">Polygon Features</h3>
          <ul className="text-sm space-y-1">
            <li>Vertices: {points.length}</li>
            <li>Closed: {String(polygonReady)}</li>
            <li>Area: {features?.areaSqm ? `${features.areaSqm.toFixed(1)} m²` : "-"}</li>
            <li>Centroid: {features?.centroid ? `${features.centroid[0].toFixed(5)}, ${features.centroid[1].toFixed(5)}` : "-"}</li>
            <li>Bounds: {features?.bounds ? JSON.stringify(features.bounds) : "-"}</li>
          </ul>
        </div>

        <div className="rounded-2xl border p-3 mt-3">
          <h3 className="font-semibold mb-2">Matches</h3>
          <div className="space-y-2">
            {matches.length === 0 && <div className="text-sm text-gray-500">No matches yet.</div>}
            {matches.map((m) => (
              <div key={m.id} className="border rounded-lg p-2">
                <div className="text-sm font-medium">{m.label || m.id}</div>
                <div className="text-xs text-gray-500">score: {m.score.toFixed(3)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}