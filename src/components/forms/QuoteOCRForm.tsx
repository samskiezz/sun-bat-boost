import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Check, AlertCircle, Edit3, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { processAdvancedDocument, validateAdvancedExtractedData } from "@/utils/advancedDocumentProcessor";

interface QuoteOCRFormProps {
  onSubmit: (data: any) => void;
}

interface ExtractedData {
  postcode?: string;
  solarKw?: number;
  batteryKwh?: number;
  inverter?: { make?: string; model?: string; confidence: number };
  panels?: Array<{ make?: string; model?: string; confidence: number; watts?: number; }>;
  batteries?: Array<{ make?: string; model?: string; confidence: number; capacity_kwh?: number; }>;
  priceAud?: number;
  selectedPanelIndex?: number;
  selectedBatteryIndex?: number;
}

export const QuoteOCRForm = ({ onSubmit }: QuoteOCRFormProps) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [manualData, setManualData] = useState({
    postcode: "",
    solarKw: "",
    batteryKwh: "",
    stcPrice: "38"
  });
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setProcessing(true);
    setProgress(0);

    try {
      // Process document with advanced OCR/parsing
      setProgress(25);
      const result = await processAdvancedDocument(file);
      
      setProgress(75);
      
      if (result.success && result.extractedData) {
        const data = result.extractedData;
        
        // Convert to expected format with all detected options
        const mockData: ExtractedData = {
          postcode: data.postcode?.value,
          solarKw: data.systemSize?.value,
          batteryKwh: data.batteries?.[0]?.capacity_kwh,
          inverter: undefined, // Inverters not currently processed
          panels: data.panels?.map(panel => ({
            make: panel.suggestedMatch?.brand || 'Unknown',
            model: panel.suggestedMatch?.model || 'Unknown',
            confidence: panel.confidence,
            watts: panel.suggestedMatch?.watts
          })),
          batteries: data.batteries?.map(battery => ({
            make: battery.suggestedMatch?.brand || 'Unknown',
            model: battery.suggestedMatch?.model || 'Unknown',
            confidence: battery.confidence,
            capacity_kwh: battery.suggestedMatch?.capacity_kwh
          })),
          priceAud: data.totalCost?.value,
          selectedPanelIndex: 0,
          selectedBatteryIndex: 0
        };
        
        setExtractedData(mockData);
        setManualData({
          postcode: mockData.postcode || "",
          solarKw: mockData.solarKw?.toString() || "",
          batteryKwh: mockData.batteries?.[0]?.capacity_kwh?.toString() || "",
          stcPrice: "38"
        });
        
        setProgress(100);
        toast({
          title: "Document processed successfully",
          description: "Review the extracted data and make any corrections needed."
        });
      } else {
        throw new Error(result.error || 'Failed to extract data');
      }
    } catch (error) {
      console.error('Document processing error:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Could not extract data from the document. Please try again or enter manually.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      mode: "ocr",
      ...manualData,
      solarKw: parseFloat(manualData.solarKw),
      batteryKwh: manualData.batteryKwh ? parseFloat(manualData.batteryKwh) : undefined,
      stcPrice: parseFloat(manualData.stcPrice),
      extractedData
    });
  };

  const ConfidenceChip = ({ confidence, label }: { confidence: number; label: string }) => (
    <Badge variant={confidence > 0.8 ? "default" : confidence > 0.6 ? "secondary" : "destructive"}>
      {confidence > 0.8 ? <Check className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
      {label} ({Math.round(confidence * 100)}%)
    </Badge>
  );

  return (
    <Card className="backdrop-blur-sm bg-gradient-glass border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Upload Solar Quote
        </CardTitle>
        <CardDescription>
          Upload your PDF or image quote for automatic data extraction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!extractedData && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop your quote here' : 'Drag & drop your quote'}
            </p>
            <p className="text-sm text-muted-foreground">
              Supports PDF, JPG, PNG, XLSX files
            </p>
          </div>
        )}

        {processing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 animate-pulse text-primary" />
              <span className="text-sm font-medium">Processing quote...</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {extractedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Check className="w-5 h-5 text-green-500" />
              <span className="font-medium">Data extracted successfully</span>
            </div>

            {/* Smart Extraction Results */}
            <div className="space-y-4 p-4 bg-green-50/50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Smart Extraction Results</span>
                <Badge variant="secondary" className="text-xs">native • 990ms</Badge>
              </div>

              {/* Solar Panels */}
              {extractedData.panels && extractedData.panels.length > 0 && (
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 font-medium text-sm">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    Solar Panels ({extractedData.panels.length})
                  </h4>
                  <div className="space-y-2">
                    {extractedData.panels.map((panel, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          extractedData.selectedPanelIndex === index 
                            ? 'bg-green-100 border-green-300' 
                            : 'bg-green-50 border-green-200 hover:bg-green-100'
                        }`}
                        onClick={() => setExtractedData({...extractedData, selectedPanelIndex: index})}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm text-green-800">
                              {panel.make} {panel.model}
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                              Found: "{panel.model}"
                            </div>
                            {panel.watts && (
                              <div className="text-blue-600 font-medium text-sm mt-1">
                                {panel.watts}W
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-purple-700 bg-purple-100">
                            {Math.round(panel.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Batteries */}
              {extractedData.batteries && extractedData.batteries.length > 0 && (
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 font-medium text-sm">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    Batteries ({extractedData.batteries.length})
                  </h4>
                  <div className="space-y-2">
                    {extractedData.batteries.map((battery, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          extractedData.selectedBatteryIndex === index 
                            ? 'bg-green-100 border-green-300' 
                            : 'bg-green-50 border-green-200 hover:bg-green-100'
                        }`}
                        onClick={() => {
                          setExtractedData({...extractedData, selectedBatteryIndex: index});
                          setManualData({...manualData, batteryKwh: battery.capacity_kwh?.toString() || ""});
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm text-green-800">
                              {battery.make} {battery.model}
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                              Found: "{battery.model}"
                            </div>
                            {battery.capacity_kwh && (
                              <div className="text-blue-600 font-medium text-sm mt-1">
                                {battery.capacity_kwh}kWh
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-purple-700 bg-purple-100">
                            {Math.round(battery.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postcode" className="flex items-center gap-2">
                    Postcode
                    <Edit3 className="w-3 h-3 text-muted-foreground" />
                  </Label>
                  <Input
                    id="postcode"
                    value={manualData.postcode}
                    onChange={(e) => setManualData({...manualData, postcode: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solarKw">Solar Size (kW)</Label>
                  <Input
                    id="solarKw"
                    value={manualData.solarKw}
                    onChange={(e) => setManualData({...manualData, solarKw: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batteryKwh">Battery Size (kWh)</Label>
                  <Input
                    id="batteryKwh"
                    value={manualData.batteryKwh}
                    onChange={(e) => setManualData({...manualData, batteryKwh: e.target.value})}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stcPrice">STC Price ($)</Label>
                  <Input
                    id="stcPrice"
                    value={manualData.stcPrice}
                    onChange={(e) => setManualData({...manualData, stcPrice: e.target.value})}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Calculate Rebates
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
};