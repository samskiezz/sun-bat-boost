import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, Sun, Compass, Eye, Calculator, CheckCircle, AlertCircle, 
  Loader2, Home, Satellite, FileText, Target, TrendingUp, Info 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SiteShadingAnalyzer from './SiteShadingAnalyzer';

// Updated for Leaflet/OpenStreetMap integration

interface SiteData {
  address?: string;
  postcode?: string;
  roofTilt?: number;
  roofAzimuth?: number;
  shadingFactor?: number;
  latitude?: number;
  longitude?: number;
}

interface DataSource {
  name: string;
  type: 'bill' | 'proposal' | 'maps' | 'manual';
  confidence: number;
  data: Partial<SiteData>;
  timestamp: number;
  icon: React.ComponentType<any>;
  color: string;
}

interface ComprehensiveShadeAnalyzerProps {
  billData?: Partial<SiteData>;
  proposalData?: Partial<SiteData>;
  onFinalDataUpdate: (data: SiteData) => void;
}

export default function ComprehensiveShadeAnalyzer({ 
  billData, 
  proposalData, 
  onFinalDataUpdate 
}: ComprehensiveShadeAnalyzerProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [finalData, setFinalData] = useState<SiteData>({});
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState<'sources' | 'analysis' | 'results'>('sources');
  const { toast } = useToast();

  // Initialize data sources
  useEffect(() => {
    const sources: DataSource[] = [];

    if (billData && Object.keys(billData).length > 0) {
      sources.push({
        name: 'Electricity Bill',
        type: 'bill',
        confidence: 0.8,
        data: billData,
        timestamp: Date.now(),
        icon: FileText,
        color: 'text-blue-500'
      });
    }

    if (proposalData && Object.keys(proposalData).length > 0) {
      sources.push({
        name: 'Solar Proposal',
        type: 'proposal',
        confidence: 0.85,
        data: proposalData,
        timestamp: Date.now(),
        icon: Sun,
        color: 'text-orange-500'
      });
    }

    setDataSources(sources);
  }, [billData, proposalData]);

  // Add OpenStreetMap analysis result
  const addMapsAnalysis = (mapsData: Partial<SiteData>) => {
    const newSource: DataSource = {
      name: 'OpenStreetMap Analysis',
      type: 'maps',
      confidence: 0.9,
      data: mapsData,
      timestamp: Date.now(),
      icon: Satellite,
      color: 'text-green-500'
    };

    setDataSources(prev => {
      // Remove existing maps analysis if any
      const filtered = prev.filter(s => s.type !== 'maps');
      return [...filtered, newSource];
    });
  };

  // Cross-reference and determine most accurate data
  const performCrossReference = () => {
    setCurrentStep('analysis');
    
    setTimeout(() => {
      const crossReferencedData: SiteData = {};
      const dataFields: (keyof SiteData)[] = [
        'address', 'postcode', 'roofTilt', 'roofAzimuth', 'shadingFactor', 'latitude', 'longitude'
      ];

      dataFields.forEach(field => {
        const fieldSources = dataSources.filter(source => 
          source.data[field] !== undefined && source.data[field] !== null
        );

        if (fieldSources.length === 0) return;

        if (fieldSources.length === 1) {
          // Only one source, use it
          (crossReferencedData as any)[field] = fieldSources[0].data[field];
        } else {
          // Multiple sources - determine best one
          let bestSource = fieldSources[0];
          
          // Prioritize by type and confidence
          for (const source of fieldSources) {
            // OpenStreetMap has highest priority for location data
            if ((field === 'latitude' || field === 'longitude' || field === 'shadingFactor') && source.type === 'maps') {
              bestSource = source;
              break;
            }
            // Proposals have priority for technical data
            else if ((field === 'roofTilt' || field === 'roofAzimuth') && source.type === 'proposal') {
              bestSource = source;
              break;
            }
            // Bills have priority for address
            else if (field === 'address' && source.type === 'bill') {
              bestSource = source;
              break;
            }
            // Otherwise use highest confidence
            else if (source.confidence > bestSource.confidence) {
              bestSource = source;
            }
          }
          
          (crossReferencedData as any)[field] = bestSource.data[field];
        }
      });

      setFinalData(crossReferencedData);
      onFinalDataUpdate(crossReferencedData);
      setCurrentStep('results');
      setAnalysisComplete(true);

      toast({
        title: "Cross-Reference Complete",
        description: "Most accurate data determined from all sources",
        variant: "default"
      });
    }, 2000);
  };

  const getFieldAccuracyInfo = (field: keyof SiteData) => {
    const sources = dataSources.filter(s => s.data[field] !== undefined);
    if (sources.length === 0) return null;

    const agreements = sources.length > 1 ? 
      sources.every(s => s.data[field] === sources[0].data[field]) : true;

    return {
      sourceCount: sources.length,
      agreement: agreements,
      highestConfidence: Math.max(...sources.map(s => s.confidence)),
      bestSource: sources.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      )
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-white/20 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Comprehensive Shade Analysis
            {analysisComplete && (
              <Badge variant="default" className="ml-auto">
                <CheckCircle className="w-4 h-4 mr-1" />
                Analysis Complete
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'sources' ? 'bg-primary text-primary-foreground' : 
                'bg-primary/20 text-primary'
              }`}>
                1
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'analysis' ? 'bg-primary text-primary-foreground' : 
                currentStep === 'results' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'results' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                3
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {currentStep === 'sources' && 'Collecting Data Sources'}
              {currentStep === 'analysis' && 'Cross-Referencing Data'}
              {currentStep === 'results' && 'Final Analysis'}
            </div>
          </div>
          
          <Progress 
            value={currentStep === 'sources' ? 33 : currentStep === 'analysis' ? 66 : 100} 
            className="h-2"
          />
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {/* Step 1: Data Sources */}
        {currentStep === 'sources' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card className="border-white/20 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Available Data Sources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataSources.map((source, index) => {
                  const IconComponent = source.icon as React.ComponentType<{ className?: string }>;
                  return (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <IconComponent className={`w-5 h-5 ${source.color}`} />
                        <div>
                          <h4 className="font-medium">{source.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {Object.keys(source.data).length} parameters detected
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {Math.round(source.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  );
                })}

                {dataSources.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No data sources detected yet.</p>
                    <p className="text-sm">Upload bills or proposals to begin analysis.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* OpenStreetMap Integration */}
            <SiteShadingAnalyzer
              onLocationUpdate={(data) => {
                addMapsAnalysis(data);
                setFinalData(prev => ({ ...prev, ...data }));
              }}
              onSiteUpdate={(mapsData) => {
                addMapsAnalysis(mapsData);
                setFinalData(prev => ({ ...prev, ...mapsData }));
              }}
            />

            {dataSources.length > 0 && (
              <div className="flex justify-center">
                <Button 
                  onClick={performCrossReference}
                  size="lg"
                  className="bg-primary/20 hover:bg-primary/30"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Cross-Reference All Data
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Analysis in Progress */}
        {currentStep === 'analysis' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="border-white/20 bg-white/5">
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                  <h3 className="text-lg font-semibold">Cross-Referencing Data Sources</h3>
                  <p className="text-muted-foreground">
                    Analyzing {dataSources.length} data sources to determine most accurate values...
                  </p>
                  <div className="max-w-md mx-auto">
                    <Progress value={66} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Final Results */}
        {currentStep === 'results' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Site Overview */}
            <Card className="border-white/20 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-primary" />
                  Site Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {finalData.address && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">Installation Address</span>
                      {getFieldAccuracyInfo('address') && (
                        <Badge variant="outline" className="ml-auto">
                          {getFieldAccuracyInfo('address')!.sourceCount} source(s)
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg">{finalData.address}</p>
                    {finalData.postcode && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Postcode: {finalData.postcode}
                      </p>
                    )}
                  </div>
                )}

                {/* Site Parameters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Roof Tilt */}
                  {finalData.roofTilt !== undefined && (
                    <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Compass className="w-5 h-5 text-primary" />
                        {getFieldAccuracyInfo('roofTilt')?.agreement && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className="text-2xl font-bold text-primary">{finalData.roofTilt}°</div>
                      <div className="text-sm text-muted-foreground">Roof Tilt</div>
                      {getFieldAccuracyInfo('roofTilt') && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {Math.round(getFieldAccuracyInfo('roofTilt')!.highestConfidence * 100)}% confident
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Roof Azimuth */}
                  {finalData.roofAzimuth !== undefined && (
                    <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Compass className="w-5 h-5 text-primary" />
                        {getFieldAccuracyInfo('roofAzimuth')?.agreement && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className="text-2xl font-bold text-primary">{finalData.roofAzimuth}°</div>
                      <div className="text-sm text-muted-foreground">
                        Azimuth ({finalData.roofAzimuth === 0 ? 'North' : 
                                 finalData.roofAzimuth === 90 ? 'East' :
                                 finalData.roofAzimuth === 180 ? 'South' :
                                 finalData.roofAzimuth === 270 ? 'West' : 'Direction'})
                      </div>
                      {getFieldAccuracyInfo('roofAzimuth') && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {Math.round(getFieldAccuracyInfo('roofAzimuth')!.highestConfidence * 100)}% confident
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Shading Factor */}
                  {finalData.shadingFactor !== undefined && (
                    <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Sun className="w-5 h-5 text-primary" />
                        {getFieldAccuracyInfo('shadingFactor')?.agreement && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className="text-2xl font-bold text-primary">{finalData.shadingFactor}%</div>
                      <div className="text-sm text-muted-foreground">Shading Factor</div>
                      <div className="text-xs mt-1">
                        {finalData.shadingFactor < 5 
                          ? "🟢 Excellent" 
                          : finalData.shadingFactor < 12 
                          ? "🟡 Good" 
                          : "🟠 Moderate"}
                      </div>
                      {getFieldAccuracyInfo('shadingFactor') && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {Math.round(getFieldAccuracyInfo('shadingFactor')!.highestConfidence * 100)}% confident
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Data Source Comparison */}
            <Card className="border-white/20 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Data Source Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dataSources.map((source, index) => {
                    const IconComponent = source.icon;
                    return (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-3">
                          <IconComponent className={`w-4 h-4 ${source.color}`} />
                          <span className="font-medium">{source.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {Math.round(source.confidence * 100)}% confidence
                          </Badge>
                          <Badge variant="secondary">
                            {Object.keys(source.data).length} fields
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Cross-Reference Complete</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Final values determined using highest confidence data from each source type. 
                    {dataSources.filter(s => s.type === 'maps').length > 0 && 
                      " OpenStreetMap analysis provided the most accurate shading data."
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
