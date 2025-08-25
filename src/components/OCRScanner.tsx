import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Upload, Camera, AlertTriangle, CheckCircle, Zap, Battery } from 'lucide-react';
import { processQuoteImage, validateExtractedData, type OCRResult } from '@/utils/ocrProcessor';

interface OCRScannerProps {
  onDataExtracted: (data: OCRResult['extractedData']) => void;
}

export default function OCRScanner({ onDataExtracted }: OCRScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateExtractedData> | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setResult(null);
    setValidationResult(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 85));
      }, 200);

      const ocrResult = await processQuoteImage(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      setResult(ocrResult);

      if (ocrResult.success && ocrResult.extractedData) {
        const validation = validateExtractedData(ocrResult.extractedData);
        setValidationResult(validation);
        onDataExtracted(ocrResult.extractedData);
      }

    } catch (error) {
      console.error('OCR processing failed:', error);
      setResult({
        success: false,
        error: 'Failed to process the quote image'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onDataExtracted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.pdf']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Quote Scanner
        </CardTitle>
        <CardDescription>
          Upload your solar quote to automatically extract system details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
            ${isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
            }
            ${isProcessing ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            {isProcessing ? (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary animate-pulse" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
            )}
            
            <div>
              {isProcessing ? (
                <p className="text-lg font-medium">Processing quote...</p>
              ) : isDragActive ? (
                <p className="text-lg font-medium">Drop your quote here</p>
              ) : (
                <>
                  <p className="text-lg font-medium">Drop your solar quote here</p>
                  <p className="text-sm text-muted-foreground">
                    Supports JPG, PNG, and PDF files
                  </p>
                </>
              )}
            </div>
            
            {!isProcessing && (
              <Button variant="outline" size="sm">
                Browse Files
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Extracting system details from your quote...
            </p>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-4">
            {result.success && result.extractedData ? (
              <div className="space-y-4">
                {/* Validation Status */}
                {validationResult && (
                  <Alert variant={validationResult.isValid ? "default" : "destructive"}>
                    <div className="flex items-center gap-2">
                      {validationResult.isValid ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      <AlertDescription>
                        {validationResult.isValid 
                          ? "Quote processed successfully! System details extracted."
                          : `${validationResult.warnings.length} issues found. Please review extracted data.`
                        }
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                {/* Extracted Panels */}
                {result.extractedData.panels && result.extractedData.panels.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Solar Panels Detected
                    </h4>
                    <div className="space-y-2">
                      {result.extractedData.panels.map((panel, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{panel.suggestedMatch?.model || panel.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {panel.suggestedMatch?.watts && `${panel.suggestedMatch.watts}W`}
                              {panel.cecId && ` • CEC: ${panel.cecId}`}
                            </p>
                          </div>
                          <Badge 
                            variant={panel.confidence > 0.7 ? "default" : panel.confidence > 0.4 ? "secondary" : "destructive"}
                          >
                            {Math.round(panel.confidence * 100)}% match
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Batteries */}
                {result.extractedData.batteries && result.extractedData.batteries.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Battery className="w-4 h-4" />
                      Batteries Detected
                    </h4>
                    <div className="space-y-2">
                      {result.extractedData.batteries.map((battery, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{battery.suggestedMatch?.model || battery.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {battery.suggestedMatch?.capacity_kwh && `${battery.suggestedMatch.capacity_kwh}kWh`}
                              {battery.cecId && ` • CEC: ${battery.cecId}`}
                            </p>
                          </div>
                          <Badge 
                            variant={battery.confidence > 0.7 ? "default" : battery.confidence > 0.4 ? "secondary" : "destructive"}
                          >
                            {Math.round(battery.confidence * 100)}% match
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Details */}
                {(result.extractedData.systemSize || result.extractedData.postcode || result.extractedData.installer) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {result.extractedData.systemSize && (
                        <div>
                          <p className="font-medium">System Size</p>
                          <p className="text-muted-foreground">{result.extractedData.systemSize.value}{result.extractedData.systemSize.unit}</p>
                        </div>
                      )}
                      {result.extractedData.postcode && (
                        <div>
                          <p className="font-medium">Postcode</p>
                          <p className="text-muted-foreground">{result.extractedData.postcode.value}</p>
                        </div>
                      )}
                      {result.extractedData.installer && (
                        <div className="col-span-2">
                          <p className="font-medium">Installer</p>
                          <p className="text-muted-foreground">{result.extractedData.installer.name}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Warnings and Suggestions */}
                {validationResult && (validationResult.warnings.length > 0 || validationResult.suggestions.length > 0) && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        {validationResult.warnings.map((warning, index) => (
                          <p key={index} className="text-sm">• {warning}</p>
                        ))}
                        {validationResult.suggestions.length > 0 && (
                          <p className="text-sm font-medium mt-2">Suggestions:</p>
                        )}
                        {validationResult.suggestions.map((suggestion, index) => (
                          <p key={index} className="text-sm text-muted-foreground">• {suggestion}</p>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {result.error || 'Failed to extract data from the quote'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
