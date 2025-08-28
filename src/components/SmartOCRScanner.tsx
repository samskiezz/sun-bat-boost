import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Eye, CheckCircle, AlertCircle, Edit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useDropzone } from "react-dropzone";
import { pdfExtractor } from "@/utils/pdfExtract";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExtractedBillData {
  retailer?: string;
  plan?: string;
  address?: string;
  postcode?: string;
  usage?: number;
  billAmount?: number;
  dailySupply?: number;
  rate?: number;
  // Solar detection fields
  solarExportKwh?: number;
  solarFeedInRate?: number;
  solarCreditAmount?: number;
  hasSolar?: boolean;
  estimatedSolarSize?: number;
}

interface SmartOCRScannerProps {
  onExtraction: (data: ExtractedBillData) => void;
  onProcessing: (processing: boolean) => void;
}

interface ExtractedField {
  label: string;
  value: string | number;
  confidence: number;
  editable: boolean;
  key: keyof ExtractedBillData;
}

const RETAILER_PATTERNS = [
  { name: "AGL Energy", patterns: ["AGL", "A.G.L"] },
  { name: "Origin Energy", patterns: ["ORIGIN", "ORIGIN ENERGY"] },
  { name: "Energy Australia", patterns: ["ENERGY AUSTRALIA", "ENERGYAUSTRALIA"] },
  { name: "Red Energy", patterns: ["RED ENERGY", "RED"] },
  { name: "Alinta Energy", patterns: ["ALINTA", "ALINTA ENERGY"] },
  { name: "Simply Energy", patterns: ["SIMPLY ENERGY", "SIMPLY"] },
  { name: "Momentum Energy", patterns: ["MOMENTUM", "MOMENTUM ENERGY"] },
  { name: "Dodo", patterns: ["DODO", "DODO POWER"] },
  { name: "Powershop", patterns: ["POWERSHOP"] },
  { name: "Lumo Energy", patterns: ["LUMO", "LUMO ENERGY"] }
];

export default function SmartOCRScanner({ onExtraction, onProcessing }: SmartOCRScannerProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const extractBillData = (text: string): ExtractedField[] => {
    const upperText = text.toUpperCase();
    const fields: ExtractedField[] = [];

    // Extract retailer
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
        key: "retailer"
      });
    }

    // Extract usage (kWh)
    const usageMatches = text.match(/(\d+(?:,\d{3})*)\s*kWh/i) || 
                        text.match(/usage[:\s]*(\d+(?:,\d{3})*)/i) ||
                        text.match(/electricity[:\s]*(\d+(?:,\d{3})*)/i);
    if (usageMatches) {
      const usage = parseInt(usageMatches[1].replace(/,/g, ''));
      fields.push({
        label: "Usage (kWh)",
        value: usage,
        confidence: 0.85,
        editable: true,
        key: "usage"
      });
    }

    // Extract bill amount
    const billMatches = text.match(/total[:\s]*\$?(\d+(?:\.\d{2})?)/i) ||
                       text.match(/amount[:\s]*\$?(\d+(?:\.\d{2})?)/i) ||
                       text.match(/\$(\d+(?:\.\d{2})?)/);
    if (billMatches) {
      const amount = parseFloat(billMatches[1]);
      fields.push({
        label: "Bill Amount ($)",
        value: amount,
        confidence: 0.75,
        editable: true,
        key: "billAmount"
      });
    }

    // Extract service address
    const addressPatterns = [
      /service\s+address[:\s]*([^\n]+)/i,
      /supply\s+address[:\s]*([^\n]+)/i,
      /premises[:\s]*([^\n]+)/i,
      /property[:\s]*([^\n]+)/i,
      /address[:\s]*([^\n]+(?:\d{4}))/i
    ];
    
    for (const pattern of addressPatterns) {
      const addressMatch = text.match(pattern);
      if (addressMatch) {
        const address = addressMatch[1].trim().replace(/\s+/g, ' ');
        fields.push({
          label: "Service Address",
          value: address,
          confidence: 0.85,
          editable: true,
          key: "address"
        });
        
        // Extract postcode from address
        const postcodeMatch = address.match(/\b(\d{4})\b/);
        if (postcodeMatch) {
          fields.push({
            label: "Postcode",
            value: postcodeMatch[1],
            confidence: 0.90,
            editable: true,
            key: "postcode"
          });
        }
        break;
      }
    }

    // Extract daily supply charge
    const supplyMatches = text.match(/daily[:\s]*supply[:\s]*\$?(\d+(?:\.\d{2})?)/i) ||
                         text.match(/supply[:\s]*charge[:\s]*\$?(\d+(?:\.\d{2})?)/i);
    if (supplyMatches) {
      const supply = parseFloat(supplyMatches[1]);
      fields.push({
        label: "Daily Supply ($)",
        value: supply,
        confidence: 0.80,
        editable: true,
        key: "dailySupply"
      });
    }

    // Extract rate (c/kWh)
    const rateMatches = text.match(/(\d+(?:\.\d+)?)\s*¢?\/kWh/i) ||
                       text.match(/rate[:\s]*(\d+(?:\.\d+)?)/i);
    if (rateMatches) {
      const rate = parseFloat(rateMatches[1]);
      fields.push({
        label: "Rate (c/kWh)",
        value: rate,
        confidence: 0.70,
        editable: true,
        key: "rate"
      });
    }

    // SOLAR DETECTION (CRITICAL ADDITION)
    // Look for solar feed-in tariff patterns
    const solarPatterns = [
      /(?:feed-?in|solar export|solar credit|feed in tariff|solar feed-in)[\s\S]*?(\d+(?:\.\d+)?)\s*(?:kwh|kWh)/gi,
      /(?:exported|generation|solar|feed)[\s\S]*?(\d+(?:\.\d+)?)\s*(?:kwh|kWh)/gi,
      /(?:credit|rebate)[\s\S]*?solar[\s\S]*?\$(\d+(?:\.\d+)?)/gi,
      /(\d+(?:\.\d+)?)\s*(?:kwh|kWh)[\s\S]*?(?:exported|feed-?in|solar)/gi
    ];

    let solarExportKwh = 0;
    let solarCreditAmount = 0;
    let hasSolar = false;

    for (const pattern of solarPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        hasSolar = true;
        const value = parseFloat(matches[0][1]);
        if (pattern.source.includes('$')) {
          solarCreditAmount = Math.max(solarCreditAmount, value);
        } else {
          solarExportKwh = Math.max(solarExportKwh, value);
        }
      }
    }

    // Estimate solar system size based on monthly exports
    let estimatedSolarSize = 0;
    if (solarExportKwh > 0) {
      // Rough estimation: 1kW system exports ~100-150kWh/month in good conditions
      // Conservative estimate: 1kW = 120kWh/month
      estimatedSolarSize = Math.round((solarExportKwh / 120) * 10) / 10; // Round to 1 decimal
      estimatedSolarSize = Math.max(3.0, Math.min(15.0, estimatedSolarSize)); // Cap between 3-15kW
    }

    if (hasSolar) {
      fields.push({
        label: "Solar System Detected",
        value: "Yes - Feed-in credits found",
        confidence: 0.95,
        editable: false,
        key: "hasSolar"
      });

      if (solarExportKwh > 0) {
        fields.push({
          label: "Solar Export (kWh)",
          value: solarExportKwh,
          confidence: 0.90,
          editable: true,
          key: "solarExportKwh"
        });
      }

      if (estimatedSolarSize > 0) {
        fields.push({
          label: "Estimated Solar Size (kW)",
          value: estimatedSolarSize,
          confidence: 0.75,
          editable: true,
          key: "estimatedSolarSize"
        });
      }

      if (solarCreditAmount > 0) {
        fields.push({
          label: "Solar Credit ($)",
          value: solarCreditAmount,
          confidence: 0.85,
          editable: true,
          key: "solarCreditAmount"
        });
      }
    } else {
      fields.push({
        label: "Solar System Detected",
        value: "No - No feed-in credits found",
        confidence: 0.90,
        editable: false,
        key: "hasSolar"
      });
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
      } else if (file.type.startsWith("image/")) {
        // For images, we'd use OCR directly - placeholder for now
        extractedText = "Image OCR processing would happen here";
        toast({
          title: "Image Processing",
          description: "Image OCR is coming soon. Please use PDF bills for now.",
          variant: "default"
        });
      }

      if (extractedText.length > 0) {
        // First try AI-powered extraction
        try {
          const { data: aiResult, error } = await supabase.functions.invoke('ai-document-analyzer', {
            body: {
              text: extractedText,
              documentType: 'bill',
              filename: file.name
            }
          });

          if (!error && aiResult?.success && aiResult?.data) {
            const aiData = aiResult.data;
            
            // Convert AI result to display fields
            const aiFields: ExtractedField[] = [];
            
            if (aiData.retailer) {
              aiFields.push({ label: "Retailer", value: aiData.retailer, confidence: 0.95, editable: true, key: "retailer" });
            }
            if (aiData.address) {
              aiFields.push({ label: "Address", value: aiData.address, confidence: 0.90, editable: true, key: "address" });
            }
            if (aiData.postcode) {
              aiFields.push({ label: "Postcode", value: aiData.postcode, confidence: 0.90, editable: true, key: "postcode" });
            }
            if (aiData.usage) {
              aiFields.push({ label: "Usage (kWh)", value: aiData.usage, confidence: 0.85, editable: true, key: "usage" });
            }
            if (aiData.billAmount) {
              aiFields.push({ label: "Bill Amount ($)", value: aiData.billAmount, confidence: 0.85, editable: true, key: "billAmount" });
            }
            
            // Solar detection results (HIGH PRIORITY)
            if (aiData.hasSolar !== undefined) {
              aiFields.push({
                label: "Solar System Detected",
                value: aiData.hasSolar ? "Yes - Feed-in credits found" : "No - No solar detected",
                confidence: 0.95,
                editable: false,
                key: "hasSolar"
              });
            }
            
            if (aiData.solarExportKwh) {
              aiFields.push({
                label: "Solar Export (kWh)",
                value: aiData.solarExportKwh,
                confidence: 0.90,
                editable: true,
                key: "solarExportKwh"
              });
            }
            
            if (aiData.estimatedSolarSize) {
              aiFields.push({
                label: "Estimated Solar Size (kW)",
                value: aiData.estimatedSolarSize,
                confidence: 0.80,
                editable: true,
                key: "estimatedSolarSize"
              });
            }
            
            if (aiData.solarCreditAmount) {
              aiFields.push({
                label: "Solar Credit ($)",
                value: aiData.solarCreditAmount,
                confidence: 0.85,
                editable: true,
                key: "solarCreditAmount"
              });
            }

            setExtractedFields(aiFields);

            // Convert to billData format with solar info
            const billData: ExtractedBillData = {};
            aiFields.forEach(field => {
              const key = field.key;
              if (key === 'hasSolar') {
                billData[key] = field.value === 'Yes - Feed-in credits found';
              } else if (key === 'retailer' || key === 'plan' || key === 'address' || key === 'postcode') {
                billData[key] = String(field.value);
              } else if (typeof field.value === 'number') {
                (billData as any)[key] = field.value;
              } else if (typeof field.value === 'string' && !isNaN(parseFloat(field.value))) {
                (billData as any)[key] = parseFloat(field.value);
              }
            });

            // Ensure solar detection is properly set
            billData.hasSolar = aiData.hasSolar;
            billData.solarExportKwh = aiData.solarExportKwh;
            billData.estimatedSolarSize = aiData.estimatedSolarSize;
            billData.solarCreditAmount = aiData.solarCreditAmount;

            onExtraction(billData);
            
            toast({
              title: "AI Analysis Complete",
              description: `Extracted ${aiFields.length} fields${aiData.hasSolar ? ' - Solar system detected!' : ''}`,
            });
            
          } else {
            throw new Error('AI extraction failed, falling back to regex');
          }
        } catch (aiError) {
          console.log('AI extraction failed, using regex fallback:', aiError);
          
          // Fallback to regex-based extraction
          const fields = extractBillData(extractedText);
          setExtractedFields(fields);

          const billData: ExtractedBillData = {};
          fields.forEach(field => {
            const key = field.key;
            if (key === 'hasSolar') {
              // Handle boolean conversion for hasSolar field
              billData[key] = typeof field.value === 'string' && field.value.toLowerCase().includes('yes');
            } else if (key === 'retailer' || key === 'plan' || key === 'address' || key === 'postcode') {
              billData[key] = String(field.value);
            } else if (typeof field.value === 'number') {
              (billData as any)[key] = field.value;
            } else if (typeof field.value === 'string' && !isNaN(parseFloat(field.value))) {
              (billData as any)[key] = parseFloat(field.value);
            }
          });

          onExtraction(billData);

          toast({
            title: "Regex Analysis Complete",
            description: `Extracted ${fields.length} fields using pattern matching`,
          });
        }
      } else {
        toast({
          title: "Processing Error",
          description: "Could not extract text from the file",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("OCR processing error:", error);
      toast({
        title: "Processing Failed",
        description: "Failed to process the bill. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      onProcessing(false);
    }
  }, [onExtraction, onProcessing, toast]);

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
      
      // Update the parent with new data and proper typing
      const billData: ExtractedBillData = {};
      updated.forEach(field => {
        const key = field.key;
        if (key === 'hasSolar') {
          billData[key] = typeof field.value === 'string' && field.value.toLowerCase().includes('yes');
        } else if (key === 'retailer' || key === 'plan' || key === 'address' || key === 'postcode') {
          billData[key] = String(field.value);
        } else if (typeof field.value === 'number') {
          (billData as any)[key] = field.value;
        } else if (typeof field.value === 'string' && !isNaN(parseFloat(field.value))) {
          (billData as any)[key] = parseFloat(field.value);
        }
      });
      onExtraction(billData);
      
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-white/20 bg-white/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Upload Your Electricity Bill</h3>
          </div>

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
                    ? "Processing your bill..." 
                    : isDragActive 
                    ? "Drop your bill here" 
                    : "Drag & drop your electricity bill"
                  }
                </h4>
                <p className="text-muted-foreground mb-4">
                  Supports PDF, JPG, PNG • We'll extract retailer, usage, and costs
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
                    {processing ? 'Processing...' : 'Completed'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Data */}
      {extractedFields.length > 0 && (
        <Card className="border-white/20 bg-white/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Extracted Bill Information</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {extractedFields.map((field, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
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
                      onChange={(e) => handleFieldEdit(index, e.target.value)}
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
              ))}
            </div>

            <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400 mb-2">
                ✅ Bill data extracted successfully! Review the fields above and continue to the next step.
              </p>
              {(extractedFields.some(f => f.key === 'address') || extractedFields.some(f => f.key === 'postcode')) && (
                <p className="text-xs text-green-300">
                  🏠 Address information detected - this will be automatically used for site analysis
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}