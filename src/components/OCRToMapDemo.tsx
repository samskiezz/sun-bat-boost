import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, MapPin, Zap, CheckCircle, ArrowRight, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import SmartOCRScanner from './SmartOCRScanner';
import SiteShadingAnalyzer from './SiteShadingAnalyzer';

interface ExtractedBillData {
  retailer?: string;
  plan?: string;
  usage?: number;
  billAmount?: number;
  dailySupply?: number;
  rate?: number;
  address?: string;
  postcode?: string;
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

interface DemoState {
  step: 'upload' | 'processing' | 'mapping';
  extractedData?: ExtractedBillData;
  siteData: SiteData;
}

export default function OCRToMapDemo() {
  const [state, setState] = useState<DemoState>({ 
    step: 'upload', 
    siteData: {}
  });
  const { toast } = useToast();

  // Auto-advance to mapping when address is extracted
  useEffect(() => {
    if (state.extractedData?.address && state.step === 'processing') {
      setTimeout(() => {
        setState(prev => ({ ...prev, step: 'mapping' }));
        toast({
          title: "Address Found!",
          description: `Auto-populating: ${state.extractedData?.address}`,
          variant: "default"
        });
      }, 1500);
    }
  }, [state.extractedData, state.step, toast]);

  const handleExtraction = (data: ExtractedBillData) => {
    console.log('📄 OCR Extraction completed:', data);
    setState(prev => ({ 
      ...prev, 
      extractedData: data,
      step: 'processing'
    }));
  };

  const handleSiteDataUpdate = (data: SiteData) => {
    setState(prev => ({ ...prev, siteData: data }));
  };

  const renderUploadStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-white/20 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Upload Your Electricity Bill
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your electricity bill PDF and watch as we automatically extract your service address 
            and populate it into the satellite mapping tool.
          </p>
          <SmartOCRScanner 
            onExtraction={handleExtraction}
            onProcessing={(processing) => {
              if (processing) {
                setState(prev => ({ ...prev, step: 'processing' }));
              }
            }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderProcessingStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
            Processing Your Bill
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground mb-2">Analyzing document and extracting address...</p>
            {state.extractedData?.address && (
              <div className="flex items-center justify-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Address found: {state.extractedData.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderMappingStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Extraction Success Card */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Address Extracted Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-green-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">{state.extractedData?.address}</p>
                <div className="flex gap-2">
                  {state.extractedData?.postcode && (
                    <Badge variant="outline" className="text-xs">
                      {state.extractedData.postcode}
                    </Badge>
                  )}
                  {state.extractedData?.retailer && (
                    <Badge variant="secondary" className="text-xs">
                      {state.extractedData.retailer}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-green-300">
              <span>Auto-populating site analyzer</span>
              <ArrowRight className="w-4 h-4" />
              <span>Loading satellite imagery...</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-white/10" />

      {/* Site Analysis */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Site Analysis with Auto-Populated Address</h3>
          <Badge variant="secondary" className="ml-auto">
            Auto-filled from OCR
          </Badge>
        </div>
        
        <SiteShadingAnalyzer
          siteData={state.siteData}
          onSiteDataUpdate={handleSiteDataUpdate}
          autoAddress={state.extractedData?.address}
          autoPostcode={state.extractedData?.postcode}
        />
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          OCR → Satellite Map Integration
        </h2>
        <p className="text-muted-foreground">
          Upload your electricity bill to automatically extract the service address and view satellite imagery for shading analysis
        </p>
      </div>

      {/* Progress Indicator */}
      <Card className="border-white/20 bg-white/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-6">
            {[
              { key: 'upload', label: 'Upload Bill', icon: FileText, color: 'text-blue-400' },
              { key: 'processing', label: 'Extract Data', icon: Zap, color: 'text-amber-400' },
              { key: 'mapping', label: 'Satellite View', icon: Eye, color: 'text-green-400' }
            ].map(({ key, label, icon: Icon, color }, index) => {
              const isActive = state.step === key;
              const isCompleted = ['upload', 'processing'].indexOf(state.step) > ['upload', 'processing'].indexOf(key);
              
              return (
                <React.Fragment key={key}>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive ? `${color} bg-white/10 border border-white/20` : 
                    isCompleted ? `${color} opacity-75` : 
                    'text-muted-foreground opacity-50'
                  }`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{label}</span>
                    {isCompleted && <CheckCircle className="w-4 h-4 ml-1" />}
                  </div>
                  {index < 2 && (
                    <ArrowRight className={`w-5 h-5 transition-colors ${
                      isCompleted || isActive ? 'text-primary' : 'text-muted-foreground/30'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {state.step === 'upload' && renderUploadStep()}
      {state.step === 'processing' && renderProcessingStep()}
      {state.step === 'mapping' && renderMappingStep()}

      {/* Results Summary */}
      {state.step === 'mapping' && state.siteData.latitude && state.siteData.shadingFactor !== undefined && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-green-400">🎉 Complete Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium mb-2 text-green-300">📄 Extracted from Bill:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Address: {state.extractedData?.address}</li>
                  <li>• Postcode: {state.extractedData?.postcode}</li>
                  {state.extractedData?.usage && <li>• Usage: {state.extractedData.usage} kWh</li>}
                  {state.extractedData?.billAmount && <li>• Amount: ${state.extractedData.billAmount}</li>}
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2 text-green-300">🛰️ Site Analysis:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Coordinates: {state.siteData.latitude?.toFixed(4)}, {state.siteData.longitude?.toFixed(4)}</li>
                  <li>• Shading Factor: {state.siteData.shadingFactor}% 
                    <span className={`ml-2 ${state.siteData.shadingFactor < 10 ? 'text-green-400' : state.siteData.shadingFactor < 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                      ({state.siteData.shadingFactor < 10 ? 'Excellent' : state.siteData.shadingFactor < 20 ? 'Good' : 'Moderate'})
                    </span>
                  </li>
                  {state.siteData.roofTilt && <li>• Roof Tilt: {state.siteData.roofTilt}°</li>}
                  {state.siteData.roofAzimuth && <li>• Roof Azimuth: {state.siteData.roofAzimuth}°</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset Button */}
      {state.step === 'mapping' && (
        <div className="text-center pt-6">
          <Button 
            variant="outline" 
            onClick={() => setState({ step: 'upload', siteData: {} })}
            className="bg-white/5 border-white/20"
          >
            Try Another Bill
          </Button>
        </div>
      )}
    </div>
  );
}