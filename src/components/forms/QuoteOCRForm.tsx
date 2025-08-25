import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Check, AlertCircle, Edit3 } from "lucide-react";
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
  panel?: { make?: string; model?: string; confidence: number };
  battery?: { make?: string; model?: string; confidence: number };
  priceAud?: number;
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
        
        // Convert to expected format
        const mockData: ExtractedData = {
          postcode: data.postcode?.value,
          solarKw: data.systemSize?.value,
          batteryKwh: data.batteries?.[0]?.capacity_kwh,
          inverter: undefined, // Inverters not currently processed
          panel: data.panels?.[0] ? { 
            make: data.panels[0].suggestedMatch?.brand || 'Unknown', 
            model: data.panels[0].suggestedMatch?.model || 'Unknown', 
            confidence: data.panels[0].confidence 
          } : undefined,
          battery: data.batteries?.[0] ? { 
            make: data.batteries[0].suggestedMatch?.brand || 'Unknown', 
            model: data.batteries[0].suggestedMatch?.model || 'Unknown', 
            confidence: data.batteries[0].confidence 
          } : undefined,
          priceAud: data.totalCost?.value
        };
        
        setExtractedData(mockData);
        setManualData({
          postcode: mockData.postcode || "",
          solarKw: mockData.solarKw?.toString() || "",
          batteryKwh: mockData.batteryKwh?.toString() || "",
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

            {/* Confidence indicators */}
            <div className="flex flex-wrap gap-2">
              {extractedData.inverter && (
                <ConfidenceChip confidence={extractedData.inverter.confidence} label="Inverter" />
              )}
              {extractedData.panel && (
                <ConfidenceChip confidence={extractedData.panel.confidence} label="Panel" />
              )}
              {extractedData.battery && (
                <ConfidenceChip confidence={extractedData.battery.confidence} label="Battery" />
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