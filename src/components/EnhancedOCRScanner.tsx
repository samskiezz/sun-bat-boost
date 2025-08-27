import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Eye, CheckCircle, AlertCircle, Edit, Loader2, Clock, Sun, Moon, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDropzone } from "react-dropzone";
import { pdfExtractor } from "@/utils/pdfExtract";
import { useToast } from "@/components/ui/use-toast";

interface EnhancedBillData {
  retailer?: string;
  plan?: string;
  usage?: number;
  billAmount?: number;
  dailySupply?: number;
  rate?: number;
  // TOU Data
  peakUsage?: number;
  offPeakUsage?: number;
  shoulderUsage?: number;
  peakRate?: number;
  offPeakRate?: number;
  shoulderRate?: number;
  // System Data (from quotes/proposals)
  systemSize?: number;
  panelCount?: number;
  batterySize?: number;
  inverterSize?: number;
  estimatedGeneration?: number;
}

interface EnhancedOCRScannerProps {
  onExtraction: (data: EnhancedBillData) => void;
  onProcessing: (processing: boolean) => void;
  mode: 'bill' | 'quote';
}

interface ExtractedField {
  label: string;
  value: string | number;
  confidence: number;
  editable: boolean;
  key: keyof EnhancedBillData;
  category: 'basic' | 'tou' | 'system';
}

const RETAILER_PATTERNS = [
  { name: "AGL Energy", patterns: ["AGL", "A.G.L"] },
  { name: "Origin Energy", patterns: ["ORIGIN", "ORIGIN ENERGY"] },
  { name: "Energy Australia", patterns: ["ENERGY AUSTRALIA", "ENERGYAUSTRALIA"] },
  { name: "Red Energy", patterns: ["RED ENERGY", "RED"] },
  { name: "Alinta Energy", patterns: ["ALINTA", "ALINTA ENERGY"] },
  { name: "Simply Energy", patterns: ["SIMPLY ENERGY", "SIMPLY"] }
];

export default function EnhancedOCRScanner({ onExtraction, onProcessing, mode }: EnhancedOCRScannerProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const { toast } = useToast();

  const extractBillData = (text: string): ExtractedField[] => {
    const upperText = text.toUpperCase();
    const fields: ExtractedField[] = [];

    // Basic bill data
    let retailer = "";
    let retailerConfidence = 0;
    for (const { name, patterns } of RETAILER_PATTERNS) {
      for (const pattern of patterns) {
        if (upperText.includes(pattern)) {
          retailer = name;
          retailerConfidence = 0.95;
          break;
        }
      }
      if (retailer) break;
    }

    if (retailer) {
      fields.push({
        label: "Retailer",
        value: retailer,
        confidence: retailerConfidence,
        editable: true,
        key: "retailer",
        category: "basic"
      });
    }

    // TOU Analysis
    const peakMatches = text.match(/peak[:\s]*(\d+(?:\.\d{1,2})?)/i) ||
                       text.match(/(\d+(?:\.\d{1,2})?)\s*c\/kwh.*peak/i);
    if (peakMatches) {
      fields.push({
        label: "Peak Rate (c/kWh)",
        value: parseFloat(peakMatches[1]),
        confidence: 0.85,
        editable: true,
        key: "peakRate",
        category: "tou"
      });
    }

    const offPeakMatches = text.match(/off.?peak[:\s]*(\d+(?:\.\d{1,2})?)/i) ||
                          text.match(/(\d+(?:\.\d{1,2})?)\s*c\/kwh.*off.?peak/i);
    if (offPeakMatches) {
      fields.push({
        label: "Off-Peak Rate (c/kWh)",
        value: parseFloat(offPeakMatches[1]),
        confidence: 0.85,
        editable: true,
        key: "offPeakRate",
        category: "tou"
      });
    }

    const shoulderMatches = text.match(/shoulder[:\s]*(\d+(?:\.\d{1,2})?)/i);
    if (shoulderMatches) {
      fields.push({
        label: "Shoulder Rate (c/kWh)",
        value: parseFloat(shoulderMatches[1]),
        confidence: 0.80,
        editable: true,
        key: "shoulderRate",
        category: "tou"
      });
    }

    // Total Usage (most important for navigation)
    const totalUsageMatches = text.match(/total.*?(\d+(?:,\d{3})*)\s*kwh/i) ||
                              text.match(/consumption[:\s]*(\d+(?:,\d{3})*)\s*kwh/i) ||
                              text.match(/(\d+(?:,\d{3})*)\s*kwh.*total/i) ||
                              text.match(/usage[:\s]*(\d+(?:,\d{3})*)\s*kwh/i) ||
                              text.match(/electricity.*?(\d+(?:,\d{3})*)\s*kwh/i);
    if (totalUsageMatches) {
      fields.push({
        label: "Total Usage (kWh)",
        value: parseInt(totalUsageMatches[1].replace(/,/g, '')),
        confidence: 0.90,
        editable: true,
        key: "usage",
        category: "basic"
      });
    }

    // Total Bill Amount (most important for navigation)
    const billAmountMatches = text.match(/total[:\s]*\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i) ||
                              text.match(/amount[:\s]*\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i) ||
                              text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?).{0,20}total/i) ||
                              text.match(/bill[:\s]*\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i) ||
                              text.match(/charges[:\s]*\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (billAmountMatches) {
      fields.push({
        label: "Bill Amount ($)",
        value: parseFloat(billAmountMatches[1].replace(/,/g, '')),
        confidence: 0.90,
        editable: true,
        key: "billAmount",
        category: "basic"
      });
    }

    // Daily Supply Charge
    const dailySupplyMatches = text.match(/daily.*?(\d+(?:\.\d{2})?)\s*c/i) ||
                               text.match(/supply.*?(\d+(?:\.\d{2})?)\s*c/i) ||
                               text.match(/(\d+(?:\.\d{2})?)\s*c.*daily/i) ||
                               text.match(/(\d+(?:\.\d{2})?)\s*c.*supply/i);
    if (dailySupplyMatches) {
      fields.push({
        label: "Daily Supply (c/day)",
        value: parseFloat(dailySupplyMatches[1]),
        confidence: 0.85,
        editable: true,
        key: "dailySupply",
        category: "basic"
      });
    }

    // Usage patterns
    const peakUsageMatches = text.match(/peak.*?(\d+(?:,\d{3})*)\s*kwh/i);
    if (peakUsageMatches) {
      fields.push({
        label: "Peak Usage (kWh)",
        value: parseInt(peakUsageMatches[1].replace(/,/g, '')),
        confidence: 0.80,
        editable: true,
        key: "peakUsage",
        category: "tou"
      });
    }

    const offPeakUsageMatches = text.match(/off.?peak.*?(\d+(?:,\d{3})*)\s*kwh/i);
    if (offPeakUsageMatches) {
      fields.push({
        label: "Off-Peak Usage (kWh)",
        value: parseInt(offPeakUsageMatches[1].replace(/,/g, '')),
        confidence: 0.80,
        editable: true,
        key: "offPeakUsage",
        category: "tou"
      });
    }

    // System data (for quotes/proposals)
    if (mode === 'quote') {
      const systemSizeMatches = text.match(/(\d+(?:\.\d{1,2})?)\s*kw/i) ||
                               text.match(/system.*?(\d+(?:\.\d{1,2})?)/i);
      if (systemSizeMatches) {
        fields.push({
          label: "System Size (kW)",
          value: parseFloat(systemSizeMatches[1]),
          confidence: 0.90,
          editable: true,
          key: "systemSize",
          category: "system"
        });
      }

      const panelMatches = text.match(/(\d+)\s*panels?/i) ||
                          text.match(/panels?[:\s]*(\d+)/i);
      if (panelMatches) {
        fields.push({
          label: "Panel Count",
          value: parseInt(panelMatches[1]),
          confidence: 0.85,
          editable: true,
          key: "panelCount",
          category: "system"
        });
      }

      const batteryMatches = text.match(/battery[:\s]*(\d+(?:\.\d{1,2})?)/i) ||
                            text.match(/(\d+(?:\.\d{1,2})?)\s*kwh.*battery/i);
      if (batteryMatches) {
        fields.push({
          label: "Battery Size (kWh)",
          value: parseFloat(batteryMatches[1]),
          confidence: 0.80,
          editable: true,
          key: "batterySize",
          category: "system"
        });
      }
    }

    return fields;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadedFiles([file]);
    setProcessing(true);
    onProcessing(true);

    try {
      let extractedText = "";

      if (file.type === "application/pdf") {
        const result = await pdfExtractor.extractFromFile(file);
        extractedText = result.text;
      }

      if (extractedText.length > 0) {
        const fields = extractBillData(extractedText);
        setExtractedFields(fields);

        const billData: EnhancedBillData = {};
        fields.forEach(field => {
          if (field.key === 'retailer' || field.key === 'plan') {
            billData[field.key] = field.value as string;
          } else {
            billData[field.key] = field.value as number;
          }
        });

        onExtraction(billData);
        
        toast({
          title: `${mode === 'bill' ? 'Bill' : 'Quote'} Processed`,
          description: `Extracted ${fields.length} fields with TOU analysis`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error("OCR processing error:", error);
      toast({
        title: "Processing Failed",
        description: "Failed to process the file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      onProcessing(false);
    }
  }, [onExtraction, onProcessing, toast, mode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"]
    },
    maxFiles: 1
  });

  const handleFieldEdit = (index: number, newValue: string) => {
    setExtractedFields(prev => {
      const updated = prev.map((field, i) => 
        i === index ? { ...field, value: newValue } : field
      );
      
      const billData: EnhancedBillData = {};
      updated.forEach(field => {
        if (field.key === 'retailer' || field.key === 'plan') {
          billData[field.key] = field.value as string;
        } else {
          billData[field.key] = field.value as number;
        }
      });
      onExtraction(billData);
      
      return updated;
    });
  };

  const fieldsByCategory = {
    basic: extractedFields.filter(f => f.category === 'basic'),
    tou: extractedFields.filter(f => f.category === 'tou'),
    system: extractedFields.filter(f => f.category === 'system')
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-white/20 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload Your {mode === 'bill' ? 'Electricity Bill' : 'Solar Quote/Proposal'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            {...getRootProps()} 
            className={`
              border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200 hover:border-white/40 hover:bg-white/5
              ${isDragActive ? 'border-primary/50 bg-primary/5' : ''}
              ${processing ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            <motion.div
              animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {processing ? (
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              ) : (
                <Upload className="w-12 h-12 mx-auto opacity-60" />
              )}
              <div>
                <h4 className="text-lg font-medium mb-2">
                  {processing 
                    ? "Analyzing with AI..." 
                    : isDragActive 
                    ? `Drop your ${mode} here` 
                    : `Drag & drop your ${mode === 'bill' ? 'electricity bill' : 'solar quote'}`
                  }
                </h4>
                <p className="text-muted-foreground mb-4">
                  {mode === 'bill' 
                    ? 'AI will extract TOU rates, usage patterns, and tariff details'
                    : 'AI will extract system specs, panel count, and battery details'
                  }
                </p>
                {!processing && (
                  <Button variant="outline" className="bg-white/5 border-white/20">
                    Or click to browse files
                  </Button>
                )}
              </div>
            </motion.div>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">Uploaded File:</h4>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">{file.name}</span>
                  <Badge variant="outline" className="ml-auto">
                    {processing ? 'Analyzing...' : 'Complete'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Data Tabs */}
      {extractedFields.length > 0 && (
        <Card className="border-white/20 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Extracted Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-white/10 border border-white/20">
                <TabsTrigger value="basic" className="data-[state=active]:bg-white/20 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="tou" className="data-[state=active]:bg-white/20 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time of Use
                </TabsTrigger>
                <TabsTrigger value="system" className="data-[state=active]:bg-white/20 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  System Specs
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {fieldsByCategory.basic.map((field, index) => (
                    <FieldDisplay key={index} field={field} onEdit={(value) => handleFieldEdit(extractedFields.indexOf(field), value)} />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="tou" className="space-y-4 mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {fieldsByCategory.tou.map((field, index) => (
                    <FieldDisplay key={index} field={field} onEdit={(value) => handleFieldEdit(extractedFields.indexOf(field), value)} />
                  ))}
                </div>
                {fieldsByCategory.tou.length > 0 && (
                  <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="w-5 h-5 text-yellow-500" />
                      <Moon className="w-5 h-5 text-blue-500" />
                      <h4 className="font-semibold">Usage Profile Detected</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI has identified your time-of-use patterns. This will be used for optimal solar sizing.
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="system" className="space-y-4 mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {fieldsByCategory.system.map((field, index) => (
                    <FieldDisplay key={index} field={field} onEdit={(value) => handleFieldEdit(extractedFields.indexOf(field), value)} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400">
                ✅ {mode === 'bill' ? 'Energy profile' : 'System specs'} extracted successfully! Continue to optimize your savings.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FieldDisplay({ field, onEdit }: { field: ExtractedField; onEdit: (value: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{field.label}</Label>
        <div className="flex items-center gap-2">
          {field.confidence >= 0.9 ? (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          ) : field.confidence >= 0.8 ? (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <Badge 
            variant={field.confidence >= 0.8 ? "default" : "destructive"}
            className="text-xs"
          >
            {Math.round(field.confidence * 100)}%
          </Badge>
        </div>
      </div>
      
      <div className="relative">
        <Input
          value={field.value}
          onChange={(e) => onEdit(e.target.value)}
          className={`
            bg-white/5 border-white/20 
            ${field.confidence < 0.8 ? 'border-amber-500/50 bg-amber-500/5' : ''}
          `}
          disabled={!field.editable}
        />
        {field.editable && (
          <Edit className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
        )}
      </div>
    </motion.div>
  );
}