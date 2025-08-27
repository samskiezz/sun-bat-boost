import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { extractTextFromFile } from '@/utils/pdfTextExtractor';
import { masterOCRPipeline, OCRResult } from '@/utils/masterOCRPipeline';
import { Upload, FileText, Zap, Battery, Gauge, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import OCRResultDisplay from './OCRResultDisplay';

interface UniversalOCRScannerProps {
  onExtractComplete?: (data: any) => void;
}

export default function UniversalOCRScanner({ onExtractComplete }: UniversalOCRScannerProps) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false,
    onDrop: handleFileUpload
  });

  async function handleFileUpload(files: File[]) {
    const file = files[0];
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      const fileType = file.type || 'unknown';
      const fileName = file.name || 'unknown';
      
      toast({
        title: "Processing Document",
        description: `Extracting text from ${fileType.includes('pdf') ? 'PDF' : fileType.includes('image') ? 'image' : 'Excel'} file...`,
      });

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 15, 90));
      }, 500);

      console.log('🚀 Processing file:', fileName, 'Type:', fileType);

      // Use the MASTER OCR Pipeline that connects to your trained database
      const ocrResult = await masterOCRPipeline.process(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setResult(ocrResult);
      
      const totalFound = ocrResult.panels.length + ocrResult.batteries.length + ocrResult.inverters.length;
      
      toast({
        title: "Extraction Complete", 
        description: `Found ${totalFound} products from trained database (${ocrResult.panels.length} panels, ${ocrResult.batteries.length} batteries, ${ocrResult.inverters.length} inverters)`,
      });

      // Pass results to callback if provided
      if (onExtractComplete && totalFound > 0) {
        const extractedData = {
          mode: 'upload',
          panels: ocrResult.panels,
          batteries: ocrResult.batteries,
          inverters: ocrResult.inverters,
          systemSize: ocrResult.systemSize,
          postcode: ocrResult.postcode?.value,
          totalCost: ocrResult.totalCost
        };
        onExtractComplete(extractedData);
      }

    } catch (error) {
      console.error('OCR processing failed:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : 'Failed to process document',
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'bg-green-500';
    if (confidence >= 0.70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceIcon = (confidence: number) => {
    return confidence >= 0.85 ? CheckCircle : AlertCircle;
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload Solar Proposal</h3>
            <p className="text-muted-foreground">
              {isDragActive 
                ? 'Drop your file here...' 
                : 'Drag & drop PDF, image, or Excel file or click to browse'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {processing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing with Universal Pipeline...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Detected Products from Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Panels */}
            {result.panels.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Solar Panels ({result.panels.length} found)
                </h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {result.panels.map((panel, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-muted/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{panel.brand} {panel.model}</p>
                          {panel.specs.watts && <p className="text-sm text-muted-foreground">{panel.specs.watts}W</p>}
                        </div>
                        <Badge className={getConfidenceColor(panel.confidence)}>
                          {Math.round(panel.confidence * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ID: {panel.productId} • {panel.evidence.length} matches
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Batteries */}
            {result.batteries.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Battery className="w-4 h-4" />
                  Batteries ({result.batteries.length} found)
                </h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {result.batteries.map((battery, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-muted/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{battery.brand} {battery.model}</p>
                          {battery.specs.kWh && <p className="text-sm text-muted-foreground">{battery.specs.kWh}kWh</p>}
                        </div>
                        <Badge className={getConfidenceColor(battery.confidence)}>
                          {Math.round(battery.confidence * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ID: {battery.productId} • {battery.evidence.length} matches
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inverters */}
            {result.inverters.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  Inverters ({result.inverters.length} found)
                </h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {result.inverters.map((inverter, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-muted/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{inverter.brand} {inverter.model}</p>
                          {inverter.specs.kW && <p className="text-sm text-muted-foreground">{inverter.specs.kW}kW</p>}
                        </div>
                        <Badge className={getConfidenceColor(inverter.confidence)}>
                          {Math.round(inverter.confidence * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {inverter.evidence.length} matches found
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Info */}
            {(result.systemSize || result.postcode || result.totalCost) && (
              <div>
                <h4 className="font-semibold mb-3">System Information</h4>
                <div className="grid gap-2 md:grid-cols-3">
                  {result.systemSize && (
                    <div className="p-2 rounded bg-muted/20">
                      <p className="text-sm font-medium">System Size</p>
                      <p className="text-lg">{result.systemSize.value}{result.systemSize.unit}</p>
                    </div>
                  )}
                  {result.postcode && (
                    <div className="p-2 rounded bg-muted/20">
                      <p className="text-sm font-medium">Postcode</p>
                      <p className="text-lg">{result.postcode.value}</p>
                    </div>
                  )}
                  {result.totalCost && (
                    <div className="p-2 rounded bg-muted/20">
                      <p className="text-sm font-medium">Total Cost</p>
                      <p className="text-lg">${result.totalCost.value.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {result.panels.length === 0 && result.batteries.length === 0 && result.inverters.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
                <p className="text-muted-foreground">No products detected from database. Try uploading a clearer document.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}