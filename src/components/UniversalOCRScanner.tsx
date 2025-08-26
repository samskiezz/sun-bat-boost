import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { extractFromOcr, ExtractResult } from '@/ocr/extract';
import { pdfExtractor } from '@/utils/pdfExtract';
import { Upload, FileText, Zap, Battery, Gauge, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import OCRResultDisplay from './OCRResultDisplay';

interface UniversalOCRScannerProps {
  onExtractComplete?: (data: any) => void;
}

export default function UniversalOCRScanner({ onExtractComplete }: UniversalOCRScannerProps) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExtractResult | null>(null);

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

      // Extract text from PDF
      const extractedContent = await pdfExtractor.extractFromFile(file);
      const pages = [{ page: 1, text: extractedContent.text }];
      
      const extractedResult = extractFromOcr(pages);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setResult(extractedResult);
      
      const totalFound = extractedResult.panels.candidates.length + extractedResult.battery.candidates.length + (extractedResult.inverter.value ? 1 : 0);
      
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
      {result && <OCRResultDisplay result={result} onExtractComplete={onExtractComplete} />}
    </div>
  );
}