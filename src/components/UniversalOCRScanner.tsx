import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { masterOCRPipeline, OCRResult } from '@/utils/masterOCRPipeline';
import { Upload, FileText, Zap, Battery, Gauge, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UniversalOCRScannerProps {
  onDataExtracted?: (data: OCRResult) => void;
}

export default function UniversalOCRScanner({ onDataExtracted }: UniversalOCRScannerProps) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
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
      toast({
        title: "Processing Document",
        description: "Running universal OCR pipeline...",
      });

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 15, 90));
      }, 500);

      const extractedResult = await masterOCRPipeline.process(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setResult(extractedResult);
      onDataExtracted?.(extractedResult);
      
      const totalFound = extractedResult.panels.length + extractedResult.batteries.length + extractedResult.inverters.length;
      
      toast({
        title: "Extraction Complete",
        description: `Found ${totalFound} products with universal matching`,
      });

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
                ? 'Drop your PDF here...' 
                : 'Drag & drop your PDF or click to browse'
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
        <div className="grid gap-4 md:grid-cols-3">
          {/* Panels */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4" />
                Solar Panels ({result.panels.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.panels.length === 0 ? (
                <p className="text-sm text-muted-foreground">No panels detected</p>
              ) : (
                result.panels.map((panel, idx) => {
                  const ConfidenceIcon = getConfidenceIcon(panel.confidence);
                  return (
                    <div key={idx} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium">{panel.brand} {panel.model}</h4>
                          <p className="text-xs text-muted-foreground">
                            {panel.specs.watts}W • ID: {panel.productId}
                          </p>
                        </div>
                        <ConfidenceIcon className={`h-4 w-4 ${panel.confidence >= 0.85 ? 'text-green-500' : 'text-yellow-500'}`} />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`h-2 flex-1 rounded-full ${getConfidenceColor(panel.confidence)}`} 
                             style={{ width: `${panel.confidence * 100}%` }} />
                        <span className="text-xs font-mono">{Math.round(panel.confidence * 100)}%</span>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            View Evidence ({panel.evidence.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Evidence: {panel.brand} {panel.model}</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-96">
                            <div className="space-y-3">
                              {panel.evidence.map((evidence, evidenceIdx) => (
                                <div key={evidenceIdx} className="rounded-lg border p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant={evidence.matchType === 'regex' ? 'default' : 'secondary'}>
                                      {evidence.matchType}
                                    </Badge>
                                    <span className="text-sm font-mono">Score: {evidence.score.toFixed(2)}</span>
                                    {evidence.sectionBoost && (
                                      <Badge variant="outline">Section Boost</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm bg-muted p-2 rounded">
                                    "{evidence.snippet}"
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Context: ...{evidence.context.substring(0, 100)}...
                                  </p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Batteries */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Battery className="h-4 w-4" />
                Batteries ({result.batteries.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.batteries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No batteries detected</p>
              ) : (
                result.batteries.map((battery, idx) => {
                  const ConfidenceIcon = getConfidenceIcon(battery.confidence);
                  return (
                    <div key={idx} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium">{battery.brand} {battery.model}</h4>
                          <p className="text-xs text-muted-foreground">
                            {battery.specs.kWh}kWh • ID: {battery.productId}
                          </p>
                        </div>
                        <ConfidenceIcon className={`h-4 w-4 ${battery.confidence >= 0.85 ? 'text-green-500' : 'text-yellow-500'}`} />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`h-2 flex-1 rounded-full ${getConfidenceColor(battery.confidence)}`} 
                             style={{ width: `${battery.confidence * 100}%` }} />
                        <span className="text-xs font-mono">{Math.round(battery.confidence * 100)}%</span>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            View Evidence ({battery.evidence.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Evidence: {battery.brand} {battery.model}</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-96">
                            <div className="space-y-3">
                              {battery.evidence.map((evidence, evidenceIdx) => (
                                <div key={evidenceIdx} className="rounded-lg border p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant={evidence.matchType === 'regex' ? 'default' : 'secondary'}>
                                      {evidence.matchType}
                                    </Badge>
                                    <span className="text-sm font-mono">Score: {evidence.score.toFixed(2)}</span>
                                    {evidence.sectionBoost && (
                                      <Badge variant="outline">Section Boost</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm bg-muted p-2 rounded">
                                    "{evidence.snippet}"
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Context: ...{evidence.context.substring(0, 100)}...
                                  </p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Inverters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="h-4 w-4" />
                Inverters ({result.inverters.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.inverters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inverters detected</p>
              ) : (
                result.inverters.map((inverter, idx) => {
                  const ConfidenceIcon = getConfidenceIcon(inverter.confidence);
                  return (
                    <div key={idx} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium">{inverter.brand} {inverter.model}</h4>
                          <p className="text-xs text-muted-foreground">
                            {inverter.specs.kW}kW • No DB Match
                          </p>
                        </div>
                        <ConfidenceIcon className={`h-4 w-4 ${inverter.confidence >= 0.85 ? 'text-green-500' : 'text-yellow-500'}`} />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`h-2 flex-1 rounded-full ${getConfidenceColor(inverter.confidence)}`} 
                             style={{ width: `${inverter.confidence * 100}%` }} />
                        <span className="text-xs font-mono">{Math.round(inverter.confidence * 100)}%</span>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            View Evidence ({inverter.evidence.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Evidence: {inverter.brand} {inverter.model}</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-96">
                            <div className="space-y-3">
                              {inverter.evidence.map((evidence, evidenceIdx) => (
                                <div key={evidenceIdx} className="rounded-lg border p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="default">regex</Badge>
                                    <span className="text-sm font-mono">Score: {evidence.score.toFixed(2)}</span>
                                    {evidence.sectionBoost && (
                                      <Badge variant="outline">Section Boost</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm bg-muted p-2 rounded">
                                    "{evidence.snippet}"
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Context: ...{evidence.context.substring(0, 100)}...
                                  </p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}