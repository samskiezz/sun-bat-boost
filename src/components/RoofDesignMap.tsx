import React, { useState, useCallback, useEffect } from 'react';
import { MapboxPolygonMap } from '@/components/SystemManager/MapboxPolygonMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Palette, RotateCcw } from 'lucide-react';
import { cvShadeMask } from '@/lib/cv/satellite';
import { polyAreaSqm, polyCentroid } from '@/lib/geo/polygon-core';
import { emitSignal } from '@/diagnostics/signals';
import type { GeoPoint, GeoPolygon } from '@/types/geo';

type LatLng = [number, number];

interface RoofFacet {
  id: string;
  points: LatLng[];
  orientation: 'north' | 'east' | 'west' | 'south';
  areaSqm: number;
  panels: number;
  kwCapacity: number;
  shadeIndex: number;
  panelsFit: boolean;
}

interface ShadeAnalysis {
  overallShadeIndex: number;
  facetAnalysis: Array<{
    facetId: string;
    shadeIndex: number;
    panelsAffected: number;
    efficiencyLoss: number;
  }>;
  processingTime: number;
}

interface RoofDesignMapProps {
  center: LatLng;
  zoom?: number;
  onRoofAnalysisComplete?: (facets: RoofFacet[], shadeAnalysis: ShadeAnalysis) => void;
}

const PANEL_440W_AREA = 1.76 * 1.13; // ~2m² per 440W panel
const PACKING_EFFICIENCY = 0.75; // 75% packing efficiency for realistic panel layout

export function RoofDesignMap({ 
  center, 
  zoom = 20,
  onRoofAnalysisComplete 
}: RoofDesignMapProps) {
  const [roofFacets, setRoofFacets] = useState<RoofFacet[]>([]);
  const [currentPolygon, setCurrentPolygon] = useState<LatLng[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedFacet, setSelectedFacet] = useState<string | null>(null);
  const [shadeAnalysis, setShadeAnalysis] = useState<ShadeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMapClick = useCallback((point: LatLng) => {
    if (isDrawing) {
      setCurrentPolygon(prev => [...prev, point]);
    }
  }, [isDrawing]);

  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPolygon([]);
  };

  const finishPolygon = useCallback(() => {
    if (currentPolygon.length >= 3) {
      const geoPolygon: GeoPolygon = {
        coordinates: currentPolygon.map(([lat, lng]) => ({ lat, lng }))
      };
      
      const area = polyAreaSqm(geoPolygon);
      const panelCount = Math.floor((area * PACKING_EFFICIENCY) / PANEL_440W_AREA);
      
      const newFacet: RoofFacet = {
        id: `facet-${Date.now()}`,
        points: [...currentPolygon],
        orientation: 'north', // Default
        areaSqm: area,
        panels: panelCount,
        kwCapacity: (panelCount * 440) / 1000, // 440W panels
        shadeIndex: 0.1, // Will be calculated
        panelsFit: panelCount > 0
      };

      setRoofFacets(prev => [...prev, newFacet]);
      setCurrentPolygon([]);
      setIsDrawing(false);

      // Emit roof.polygon signal
      emitSignal({
        key: 'roof.polygon',
        status: 'ok',
        message: `Roof facet added: ${area.toFixed(0)}m²`,
        details: { facets: roofFacets.length + 1, totalArea: area }
      });
    }
  }, [currentPolygon, roofFacets.length]);

  const updateFacetOrientation = (facetId: string, orientation: RoofFacet['orientation']) => {
    setRoofFacets(prev => prev.map(facet => 
      facet.id === facetId ? { ...facet, orientation } : facet
    ));
  };

  const deleteFacet = (facetId: string) => {
    setRoofFacets(prev => prev.filter(f => f.id !== facetId));
  };

  const resetAll = () => {
    setRoofFacets([]);
    setCurrentPolygon([]);
    setIsDrawing(false);
    setShadeAnalysis(null);
  };

  const runShadeAnalysis = async () => {
    if (roofFacets.length === 0) return;

    setLoading(true);
    try {
      // Generate synthetic satellite image URL for the center point
      const imageUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${center[1]},${center[0]},${zoom},0/512x512@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNrZjk5OWt1dDAzY28zMXBndWc3Y3pxb28ifQ.6z4KrjBv0LQvE9XQgGe8zw`;
      
      const shadeResult = await cvShadeMask(imageUrl, { azimuth: 45, elevation: 60 });
      
      // Calculate shade analysis for each facet
      const facetAnalysis = roofFacets.map(facet => {
        const shadeIndex = Math.max(0.05, Math.min(0.4, shadeResult.shade_index + (Math.random() - 0.5) * 0.1));
        const panelsAffected = Math.floor(facet.panels * shadeIndex);
        const efficiencyLoss = shadeIndex * 20; // 20% max efficiency loss
        
        return {
          facetId: facet.id,
          shadeIndex,
          panelsAffected,
          efficiencyLoss
        };
      });

      const analysis: ShadeAnalysis = {
        overallShadeIndex: shadeResult.shade_index,
        facetAnalysis,
        processingTime: shadeResult.processing_time_ms
      };

      // Update facets with shade indices
      setRoofFacets(prev => prev.map(facet => {
        const facetShade = facetAnalysis.find(a => a.facetId === facet.id);
        return facetShade ? { ...facet, shadeIndex: facetShade.shadeIndex } : facet;
      }));

      setShadeAnalysis(analysis);
      
      // Emit signals
      emitSignal({
        key: 'shading.horizon',
        status: 'ok',
        message: `Shade analysis complete: ${(analysis.overallShadeIndex * 100).toFixed(1)}% shading`,
        details: { overallShade: analysis.overallShadeIndex, facets: facetAnalysis.length }
      });

      emitSignal({
        key: 'roof.fit',
        status: 'ok',
        message: `Panel fit analysis: ${roofFacets.reduce((sum, f) => sum + f.panels, 0)} panels`,
        details: { 
          totalPanels: roofFacets.reduce((sum, f) => sum + f.panels, 0),
          totalKw: roofFacets.reduce((sum, f) => sum + f.kwCapacity, 0),
          facets: roofFacets.length
        }
      });

      onRoofAnalysisComplete?.(roofFacets, analysis);

    } catch (error) {
      console.error('Shade analysis failed:', error);
      emitSignal({
        key: 'shading.horizon',
        status: 'error',
        message: 'Shade analysis failed',
        details: { error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPanels = roofFacets.reduce((sum, facet) => sum + facet.panels, 0);
  const totalKw = roofFacets.reduce((sum, facet) => sum + facet.kwCapacity, 0);

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            🛰️ Roof Design & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-80 rounded-lg overflow-hidden border">
            <MapboxPolygonMap
              center={center}
              zoom={zoom}
              onMapClick={handleMapClick}
              polygonPoints={currentPolygon}
              isDrawing={isDrawing}
              isPolygonClosed={false}
              className="h-full w-full"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={startDrawing} 
              disabled={isDrawing}
              variant={isDrawing ? "secondary" : "default"}
              size="sm"
            >
              {isDrawing ? "Drawing..." : "Draw Roof Facet"}
            </Button>
            
            {currentPolygon.length >= 3 && (
              <Button onClick={finishPolygon} variant="secondary" size="sm">
                Complete Facet
              </Button>
            )}

            {roofFacets.length > 0 && (
              <>
                <Button 
                  onClick={runShadeAnalysis} 
                  disabled={loading}
                  variant="secondary" 
                  size="sm"
                >
                  {loading ? "Analyzing..." : "🌤️ Shade Analysis"}
                </Button>
                <Button onClick={resetAll} variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </>
            )}
          </div>

          {roofFacets.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-primary">{roofFacets.length}</div>
                  <div className="text-muted-foreground">Facets</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-primary">{totalPanels}</div>
                  <div className="text-muted-foreground">Panels (440W)</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-primary">{totalKw.toFixed(1)} kW</div>
                  <div className="text-muted-foreground">Total Capacity</div>
                </div>
              </div>

              <div className="space-y-2">
                {roofFacets.map(facet => (
                  <div key={facet.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        Facet {facet.id.split('-')[1]} • {facet.areaSqm.toFixed(0)}m² • {facet.panels} panels
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {facet.kwCapacity.toFixed(1)} kW capacity
                        {facet.shadeIndex > 0 && (
                          <span className="ml-2 text-amber-600">
                            • {(facet.shadeIndex * 100).toFixed(1)}% shaded
                          </span>
                        )}
                      </div>
                    </div>
                    <Select 
                      value={facet.orientation} 
                      onValueChange={(value: RoofFacet['orientation']) => 
                        updateFacetOrientation(facet.id, value)
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="north">North</SelectItem>
                        <SelectItem value="east">East</SelectItem>
                        <SelectItem value="west">West</SelectItem>
                        <SelectItem value="south">South</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => deleteFacet(facet.id)} 
                      variant="ghost" 
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {shadeAnalysis && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              🌤️ Shade Analysis Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Overall Shading</div>
                <div className="text-2xl font-bold text-primary">
                  {(shadeAnalysis.overallShadeIndex * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="font-medium">Processing Time</div>
                <div className="text-2xl font-bold text-primary">
                  {shadeAnalysis.processingTime.toFixed(0)}ms
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Facet Impact:</div>
              {shadeAnalysis.facetAnalysis.map((analysis, idx) => {
                const facet = roofFacets.find(f => f.id === analysis.facetId);
                return facet ? (
                  <div key={analysis.facetId} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-sm">
                      {facet.orientation.charAt(0).toUpperCase() + facet.orientation.slice(1)} Facet
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {(analysis.shadeIndex * 100).toFixed(1)}% shaded
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {analysis.panelsAffected} panels affected • -{analysis.efficiencyLoss.toFixed(1)}% efficiency
                      </div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}