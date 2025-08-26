import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertCircle, Brain, Zap } from 'lucide-react';
import { processSmartDocument, SmartProcessorResult } from '@/utils/smartDocumentProcessor';
import SmartConfirmDialog from './SmartConfirmDialog';
import { MatchHit, Product, SmartMatcher } from '@/utils/smartMatcher';
import { toast } from 'sonner';

interface SmartOCRScannerProps {
  onDataExtracted: (data: SmartProcessorResult['extractedData']) => void;
}

const SmartOCRScanner: React.FC<SmartOCRScannerProps> = ({ onDataExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SmartProcessorResult | null>(null);
  const [pendingConfirmations, setPendingConfirmations] = useState<{
    type: 'panel' | 'battery' | 'inverter';
    index: number;
    candidates: MatchHit[];
  }[]>([]);
  const [currentConfirmation, setCurrentConfirmation] = useState<{
    type: 'panel' | 'battery' | 'inverter';
    index: number;
    candidates: MatchHit[];
  } | null>(null);

  const simulateProgress = useCallback(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);
    return interval;
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setResult(null);
    setPendingConfirmations([]);
    const progressInterval = simulateProgress();

    try {
      console.log('🧠 Starting smart document processing...');
      const processingResult = await processSmartDocument(file);
      
      clearInterval(progressInterval);
      setProgress(100);

      if (processingResult.success && processingResult.extractedData) {
        setResult(processingResult);

        // Collect items that need confirmation
        const confirmations = [];
        
        if (processingResult.extractedData.panels) {
          processingResult.extractedData.panels.forEach((panel, index) => {
            if (panel.needsConfirmation && panel.candidates) {
              confirmations.push({
                type: 'panel' as const,
                index,
                candidates: panel.candidates
              });
            }
          });
        }

        if (processingResult.extractedData.batteries) {
          processingResult.extractedData.batteries.forEach((battery, index) => {
            if (battery.needsConfirmation && battery.candidates) {
              confirmations.push({
                type: 'battery' as const,
                index,
                candidates: battery.candidates
              });
            }
          });
        }

        if (processingResult.extractedData.inverters) {
          processingResult.extractedData.inverters.forEach((inverter, index) => {
            if (inverter.needsConfirmation && inverter.candidates) {
              confirmations.push({
                type: 'inverter' as const,
                index,
                candidates: inverter.candidates
              });
            }
          });
        }

        setPendingConfirmations(confirmations);

        if (confirmations.length > 0) {
          // Show first confirmation
          setCurrentConfirmation(confirmations[0]);
          toast.info('Some matches need confirmation to improve accuracy', {
            description: `${confirmations.length} item(s) need your review`
          });
        } else {
          // All matches were auto-accepted
          onDataExtracted(processingResult.extractedData);
          toast.success('Document processed successfully!', {
            description: 'All equipment detected with high confidence'
          });
        }
      } else {
        toast.error('Failed to process document', {
          description: processingResult.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      console.error('Smart OCR processing failed:', error);
      clearInterval(progressInterval);
      setProgress(0);
      toast.error('Processing failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [simulateProgress, onDataExtracted]);

  const handleConfirm = async (hit: MatchHit) => {
    if (!result?.matcher || !currentConfirmation) return;

    try {
      // Learn from confirmation
      await result.matcher.learnConfirm(hit, hit.raw);
      
      // Update the result data
      const updatedData = { ...result.extractedData };
      const { type, index } = currentConfirmation;
      
      if (type === 'panel' && updatedData.panels?.[index]) {
        updatedData.panels[index].needsConfirmation = false;
        delete updatedData.panels[index].candidates;
      } else if (type === 'battery' && updatedData.batteries?.[index]) {
        updatedData.batteries[index].needsConfirmation = false;
        delete updatedData.batteries[index].candidates;
      } else if (type === 'inverter' && updatedData.inverters?.[index]) {
        updatedData.inverters[index].needsConfirmation = false;
        delete updatedData.inverters[index].candidates;
      }

      setResult({ ...result, extractedData: updatedData });
      
      toast.success('Match confirmed and learned!', {
        description: `System learned: ${hit.product.brand} ${hit.product.model}`
      });

      processNextConfirmation();
    } catch (error) {
      console.error('Failed to learn confirmation:', error);
      toast.error('Failed to save learning data');
    }
  };

  const handleCorrection = async (falseHit: MatchHit, trueProduct: Product) => {
    if (!result?.matcher || !currentConfirmation) return;

    try {
      // Learn from correction
      await result.matcher.learnCorrection(falseHit, trueProduct, falseHit.raw);
      
      // Update the result data with the correct product
      const updatedData = { ...result.extractedData };
      const { type, index } = currentConfirmation;
      
      if (type === 'panel' && updatedData.panels?.[index]) {
        updatedData.panels[index].needsConfirmation = false;
        updatedData.panels[index].suggestedMatch = {
          id: trueProduct.id,
          brand: trueProduct.brand,
          model: trueProduct.model,
          watts: trueProduct.power_rating || 0,
          cec_id: trueProduct.specs?.certificate || 'CEC-LISTED',
          confidence: 1.0, // User corrected = 100% confidence
          matchType: 'user_corrected'
        };
        delete updatedData.panels[index].candidates;
      } else if (type === 'battery' && updatedData.batteries?.[index]) {
        updatedData.batteries[index].needsConfirmation = false;
        updatedData.batteries[index].suggestedMatch = {
          id: trueProduct.id,
          brand: trueProduct.brand,
          model: trueProduct.model,
          capacity_kwh: trueProduct.capacity_kwh || 0,
          cec_id: trueProduct.specs?.certificate || 'CEC-LISTED',
          confidence: 1.0,
          matchType: 'user_corrected'
        };
        delete updatedData.batteries[index].candidates;
      }

      setResult({ ...result, extractedData: updatedData });
      
      toast.success('Correction learned!', {
        description: `System learned: ${trueProduct.brand} ${trueProduct.model}`
      });

      processNextConfirmation();
    } catch (error) {
      console.error('Failed to learn correction:', error);
      toast.error('Failed to save correction');
    }
  };

  const processNextConfirmation = () => {
    const remaining = pendingConfirmations.slice(1);
    setPendingConfirmations(remaining);
    
    if (remaining.length > 0) {
      setCurrentConfirmation(remaining[0]);
    } else {
      setCurrentConfirmation(null);
      // All confirmations done, extract final data
      if (result?.extractedData) {
        onDataExtracted(result.extractedData);
        toast.success('All confirmations complete!', {
          description: 'System has learned from your feedback'
        });
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false,
    disabled: isProcessing
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Smart Learning Quote Scanner
          </CardTitle>
          <CardDescription>
            AI-powered OCR that learns from your corrections and gets smarter over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : isProcessing
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            
            {isProcessing ? (
              <div className="space-y-4">
                <Zap className="w-12 h-12 mx-auto text-blue-500 animate-pulse" />
                <div>
                  <p className="text-lg font-medium">Processing with Smart AI...</p>
                  <p className="text-sm text-gray-600">Learning patterns and extracting data</p>
                </div>
                <Progress value={progress} className="w-full max-w-xs mx-auto" />
                <p className="text-xs text-gray-500">{Math.round(progress)}% complete</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive ? 'Drop your document here' : 'Drop your solar document here'}
                  </p>
                  <p className="text-sm text-gray-600">
                    PDF, images, or Excel files supported • Self-learning AI • Gets better over time
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Results Display */}
          {result && result.extractedData && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Smart Extraction Results
                </h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {result.detectionMethod} • {result.processingTime}ms
                  </Badge>
                  {pendingConfirmations.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {pendingConfirmations.length} pending confirmations
                    </Badge>
                  )}
                </div>
              </div>

              {/* Equipment Results */}
              <div className="grid gap-4">
                {/* Panels */}
                {result.extractedData.panels && result.extractedData.panels.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                      Solar Panels ({result.extractedData.panels.length})
                    </h4>
                    {result.extractedData.panels.map((panel, idx) => (
                      <div key={idx} className={`p-3 border rounded ${panel.needsConfirmation ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {panel.suggestedMatch?.brand} {panel.suggestedMatch?.model}
                            </p>
                            <p className="text-sm text-gray-600">Found: "{panel.description}"</p>
                            {panel.watts && <p className="text-sm text-blue-600">{panel.watts}W</p>}
                          </div>
                          <div className="text-right">
                            <Badge variant={panel.needsConfirmation ? "secondary" : "default"}>
                              {(panel.confidence * 100).toFixed(0)}%
                            </Badge>
                            {panel.needsConfirmation && (
                              <p className="text-xs text-orange-600 mt-1">Needs confirmation</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Batteries */}
                {result.extractedData.batteries && result.extractedData.batteries.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded"></div>
                      Batteries ({result.extractedData.batteries.length})
                    </h4>
                    {result.extractedData.batteries.map((battery, idx) => (
                      <div key={idx} className={`p-3 border rounded ${battery.needsConfirmation ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {battery.suggestedMatch?.brand} {battery.suggestedMatch?.model}
                            </p>
                            <p className="text-sm text-gray-600">Found: "{battery.description}"</p>
                            {battery.capacity_kwh && <p className="text-sm text-blue-600">{battery.capacity_kwh}kWh</p>}
                          </div>
                          <div className="text-right">
                            <Badge variant={battery.needsConfirmation ? "secondary" : "default"}>
                              {(battery.confidence * 100).toFixed(0)}%
                            </Badge>
                            {battery.needsConfirmation && (
                              <p className="text-xs text-orange-600 mt-1">Needs confirmation</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* System Info */}
                {(result.extractedData.systemSize || result.extractedData.postcode) && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <h4 className="font-medium mb-2">System Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {result.extractedData.systemSize && (
                        <div>
                          <span className="text-gray-600">System Size:</span>
                          <span className="ml-2 font-medium">{result.extractedData.systemSize.value}{result.extractedData.systemSize.unit}</span>
                        </div>
                      )}
                      {result.extractedData.postcode && (
                        <div>
                          <span className="text-gray-600">Postcode:</span>
                          <span className="ml-2 font-medium">{result.extractedData.postcode.value}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Confirmation Dialog */}
      {currentConfirmation && result && (
        <SmartConfirmDialog
          isOpen={!!currentConfirmation}
          onClose={() => setCurrentConfirmation(null)}
          candidates={currentConfirmation.candidates}
          onConfirm={handleConfirm}
          onCorrect={handleCorrection}
          alternativeProducts={result.allProducts || []}
        />
      )}
    </div>
  );
};

export default SmartOCRScanner;