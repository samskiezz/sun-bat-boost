import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Eye, CheckCircle, AlertCircle, Edit, Loader2, Clock, Sun, Moon, Zap, Home } from "lucide-react";
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
  // Site Data (from proposals)
  address?: string;
  postcode?: string;
  roofTilt?: number;
  roofAzimuth?: number;
  shadingFactor?: number;
  latitude?: number;
  longitude?: number;
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
  category: 'basic' | 'tou' | 'system' | 'site';
}

const RETAILER_PATTERNS = [
  { name: "AGL Energy", patterns: ["AGL", "A.G.L", "AGL ENERGY", "AGL AUSTRALIA"] },
  { name: "Origin Energy", patterns: ["ORIGIN", "ORIGIN ENERGY", "ORIGIN AUSTRALIA"] },
  { name: "Energy Australia", patterns: ["ENERGY AUSTRALIA", "ENERGYAUSTRALIA", "EA", "ENERGY AUST"] },
  { name: "Red Energy", patterns: ["RED ENERGY", "RED", "RED AUSTRALIA"] },
  { name: "Alinta Energy", patterns: ["ALINTA", "ALINTA ENERGY", "ALINTA AUSTRALIA"] },
  { name: "Simply Energy", patterns: ["SIMPLY ENERGY", "SIMPLY", "SIMPLY AUSTRALIA"] },
  { name: "EnergyLocals", patterns: ["ENERGYLOCALS", "ENERGY LOCALS", "LOCALS"] },
  { name: "Amber Electric", patterns: ["AMBER", "AMBER ELECTRIC", "AMBER ENERGY"] },
  { name: "Powershop", patterns: ["POWERSHOP", "POWER SHOP"] },
  { name: "Lumo Energy", patterns: ["LUMO", "LUMO ENERGY"] },
  { name: "ActewAGL", patterns: ["ACTEWAGL", "ACTEW AGL", "ACTEW"] },
  { name: "Aurora Energy", patterns: ["AURORA", "AURORA ENERGY"] },
  { name: "Synergy", patterns: ["SYNERGY"] },
  { name: "Ergon Energy", patterns: ["ERGON", "ERGON ENERGY"] },
  { name: "Energex", patterns: ["ENERGEX"] }
];

export default function EnhancedOCRScanner({ onExtraction, onProcessing, mode }: EnhancedOCRScannerProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const { toast } = useToast();

  const extractBillData = (text: string): ExtractedField[] => {
    console.log('🔍 Extracting bill data from text:', text.substring(0, 200) + '...');
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
          console.log('✅ Found retailer:', name, 'via pattern:', pattern);
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

    // TOU Analysis - Enhanced patterns
    const peakMatches = text.match(/peak[\s\w]*?(\d{1,2}(?:\.\d{1,2})?)\s*c(?:ents)?/i) ||
                       text.match(/(\d{1,2}(?:\.\d{1,2})?)\s*c(?:ents)?[\s\w]*?peak/i) ||
                       text.match(/peak\s+rate[\s:]*(\d{1,2}(?:\.\d{1,2})?)/i);
    if (peakMatches) {
      const peakValue = parseFloat(peakMatches[1]);
      console.log('✅ Found peak rate:', peakValue, 'c/kWh');
      fields.push({
        label: "Peak Rate (c/kWh)",
        value: peakValue,
        confidence: 0.85,
        editable: true,
        key: "peakRate",
        category: "tou"
      });
    }

    const offPeakMatches = text.match(/off.?peak[\s\w]*?(\d{1,2}(?:\.\d{1,2})?)\s*c(?:ents)?/i) ||
                          text.match(/(\d{1,2}(?:\.\d{1,2})?)\s*c(?:ents)?[\s\w]*?off.?peak/i) ||
                          text.match(/off.?peak\s+rate[\s:]*(\d{1,2}(?:\.\d{1,2})?)/i);
    if (offPeakMatches) {
      const offPeakValue = parseFloat(offPeakMatches[1]);
      console.log('✅ Found off-peak rate:', offPeakValue, 'c/kWh');
      fields.push({
        label: "Off-Peak Rate (c/kWh)",
        value: offPeakValue,
        confidence: 0.85,
        editable: true,
        key: "offPeakRate",
        category: "tou"
      });
    }

    const shoulderMatches = text.match(/shoulder[\s\w]*?(\d{1,2}(?:\.\d{1,2})?)\s*c(?:ents)?/i) ||
                           text.match(/(\d{1,2}(?:\.\d{1,2})?)\s*c(?:ents)?[\s\w]*?shoulder/i);
    if (shoulderMatches) {
      const shoulderValue = parseFloat(shoulderMatches[1]);
      console.log('✅ Found shoulder rate:', shoulderValue, 'c/kWh');
      fields.push({
        label: "Shoulder Rate (c/kWh)",
        value: shoulderValue,
        confidence: 0.80,
        editable: true,
        key: "shoulderRate",
        category: "tou"
      });
    }

    // Total Usage (most important for navigation) - Enhanced patterns for quarterly bills
    const allUsageMatches = [
      // Look for quarterly/billing period usage first (highest priority)
      ...Array.from(text.matchAll(/(?:quarter|billing\s+period|this\s+period|usage\s+charges?)[\s\w]*?(\d{1,4}(?:,\d{3})*(?:\.\d{1,2})?)\s*kwh/gi)).map(m => ({ value: parseFloat(m[1].replace(/,/g, '')), confidence: 0.95, source: 'quarterly' })),
      ...Array.from(text.matchAll(/(\d{1,4}(?:,\d{3})*(?:\.\d{1,2})?)\s*kwh[\s\w]*?(?:quarter|billing\s+period|this\s+period)/gi)).map(m => ({ value: parseFloat(m[1].replace(/,/g, '')), confidence: 0.95, source: 'quarterly' })),
      
      // Look for total consumption patterns (medium priority)
      ...Array.from(text.matchAll(/(?:total|consumption|electricity\s+used)[\s\w]*?(\d{1,4}(?:,\d{3})*(?:\.\d{1,2})?)\s*kwh/gi)).map(m => ({ value: parseFloat(m[1].replace(/,/g, '')), confidence: 0.85, source: 'total' })),
      ...Array.from(text.matchAll(/(\d{1,4}(?:,\d{3})*(?:\.\d{1,2})?)\s*kwh[\s\w]*?(?:total|consumption|electricity\s+used)/gi)).map(m => ({ value: parseFloat(m[1].replace(/,/g, '')), confidence: 0.85, source: 'total' })),
      
      // Generic kWh patterns (lowest priority)
      ...Array.from(text.matchAll(/(\d{1,4}(?:,\d{3})*(?:\.\d{1,2})?)\s*kwh/gi)).map(m => ({ value: parseFloat(m[1].replace(/,/g, '')), confidence: 0.60, source: 'generic' }))
    ];

    // Filter for realistic quarterly usage (200+ kWh, <8000 kWh) and sort by confidence and value
    const validUsage = allUsageMatches
      .filter(match => match.value >= 200 && match.value <= 8000) // Realistic quarterly usage range
      .sort((a, b) => {
        if (a.confidence !== b.confidence) return b.confidence - a.confidence;
        // For same confidence, prefer values in the 400-2000 range (most common)
        const aScore = (a.value >= 400 && a.value <= 2000) ? 1 : 0;
        const bScore = (b.value >= 400 && b.value <= 2000) ? 1 : 0;
        if (aScore !== bScore) return bScore - aScore;
        return b.value - a.value;
      });

    if (validUsage.length > 0) {
      const bestMatch = validUsage[0];
      console.log(`✅ Found usage: ${bestMatch.value} kWh (${bestMatch.source}, confidence: ${bestMatch.confidence})`);
      fields.push({
        label: "Total Usage (kWh)",
        value: bestMatch.value,
        confidence: bestMatch.confidence,
        editable: true,
        key: "usage",
        category: "basic"
      });
    } else if (allUsageMatches.length > 0) {
      // If no realistic quarterly usage found, take the highest value but mark as low confidence
      const fallbackMatch = allUsageMatches.sort((a, b) => b.value - a.value)[0];
      console.log(`⚠️ Found low usage: ${fallbackMatch.value} kWh (${fallbackMatch.source}) - may need manual adjustment`);
      fields.push({
        label: "Total Usage (kWh)",
        value: fallbackMatch.value,
        confidence: 0.30, // Low confidence for unrealistic values
        editable: true,
        key: "usage",
        category: "basic"
      });
    }

    // Total Bill Amount - Enhanced with realistic filtering
    const allBillMatches = [
      // High priority: Explicit bill/total patterns
      ...Array.from(text.matchAll(/(?:total|amount|due|payable|bill|new\s+charges|balance|amount\s+due)[\s\w]*?\$?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi)).map(m => ({ value: parseFloat(m[1].replace(/,/g, '')), confidence: 0.90, source: 'explicit' })),
      ...Array.from(text.matchAll(/\$(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)[\s\w]*?(?:total|amount|due|payable|bill|charges)/gi)).map(m => ({ value: parseFloat(m[1].replace(/,/g, '')), confidence: 0.90, source: 'explicit' })),
      
      // Medium priority: General dollar amounts
      ...Array.from(text.matchAll(/\$(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi)).map(m => ({ value: parseFloat(m[1].replace(/,/g, '')), confidence: 0.60, source: 'generic' }))
    ];

    // Filter for realistic quarterly bill amounts ($50-$3000) and sort by confidence
    const validBills = allBillMatches
      .filter(match => match.value >= 50 && match.value <= 3000) // Realistic quarterly bill range
      .sort((a, b) => {
        if (a.confidence !== b.confidence) return b.confidence - a.confidence;
        // For same confidence, prefer values in the $200-$1500 range (most common)
        const aScore = (a.value >= 200 && a.value <= 1500) ? 1 : 0;
        const bScore = (b.value >= 200 && b.value <= 1500) ? 1 : 0;
        if (aScore !== bScore) return bScore - aScore;
        return b.value - a.value;
      });

    if (validBills.length > 0) {
      const bestBill = validBills[0];
      console.log(`✅ Found bill amount: $${bestBill.value} (${bestBill.source}, confidence: ${bestBill.confidence})`);
      fields.push({
        label: "Bill Amount ($)",
        value: bestBill.value,
        confidence: bestBill.confidence,
        editable: true,
        key: "billAmount",
        category: "basic"
      });
    }

    // Daily Supply Charge - Enhanced with realistic filtering
    const allSupplyMatches = [
      // High priority: Explicit supply charge patterns
      ...Array.from(text.matchAll(/(?:supply\s+charge|daily\s+supply|service\s+fee)[\s:]*(\d{1,3}(?:\.\d{1,2})?)\s*c(?:ents)?/gi)).map(m => ({ value: parseFloat(m[1]), confidence: 0.90, source: 'explicit' })),
      ...Array.from(text.matchAll(/(\d{1,3}(?:\.\d{1,2})?)\s*c(?:ents)?[\s\w]*?(?:supply|daily|per\s+day)/gi)).map(m => ({ value: parseFloat(m[1]), confidence: 0.85, source: 'contextual' })),
      
      // Medium priority: c/day patterns
      ...Array.from(text.matchAll(/(\d{1,3}(?:\.\d{1,2})?)\s*c\/day/gi)).map(m => ({ value: parseFloat(m[1]), confidence: 0.80, source: 'cperday' }))
    ];

    // Filter for realistic daily supply charges (5-150 cents) and sort by confidence
    const validSupply = allSupplyMatches
      .filter(match => match.value >= 5 && match.value <= 150) // Realistic daily supply range
      .sort((a, b) => {
        if (a.confidence !== b.confidence) return b.confidence - a.confidence;
        // For same confidence, prefer values in the 15-50 range (most common)
        const aScore = (a.value >= 15 && a.value <= 50) ? 1 : 0;
        const bScore = (b.value >= 15 && b.value <= 50) ? 1 : 0;
        if (aScore !== bScore) return bScore - aScore;
        return a.value - b.value; // Prefer lower supply charges
      });

    if (validSupply.length > 0) {
      const bestSupply = validSupply[0];
      console.log(`✅ Found daily supply: ${bestSupply.value} c/day (${bestSupply.source}, confidence: ${bestSupply.confidence})`);
      fields.push({
        label: "Daily Supply (c/day)",
        value: bestSupply.value,
        confidence: bestSupply.confidence,
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
      // Address extraction patterns
      const addressMatches = text.match(/(?:site\s+address|installation\s+address|property\s+address|address)[:\s]*([A-Za-z0-9\s,.-]+)(?:\d{4})/i) ||
                            text.match(/(\d+\s+[A-Za-z\s,.-]+)(?:\s+\d{4})/i);
      if (addressMatches) {
        const address = addressMatches[1].trim();
        if (address.length > 10 && address.split(' ').length >= 3) { // Basic validation
          fields.push({
            label: "Installation Address",
            value: address,
            confidence: 0.85,
            editable: true,
            key: "address",
            category: "site"
          });
        }
      }

      // Postcode extraction
      const postcodeMatches = text.match(/\b(\d{4})\b/g);
      if (postcodeMatches) {
        // Filter for valid Australian postcodes (1000-9999)
        const validPostcodes = postcodeMatches.filter(pc => {
          const num = parseInt(pc);
          return num >= 1000 && num <= 9999;
        });
        if (validPostcodes.length > 0) {
          fields.push({
            label: "Postcode",
            value: validPostcodes[0],
            confidence: 0.90,
            editable: true,
            key: "postcode",
            category: "site"
          });
        }
      }

      // Roof tilt extraction
      const tiltMatches = text.match(/(?:roof\s+)?tilt[:\s]*(\d{1,2}(?:\.\d)?)\s*°?/i) ||
                         text.match(/(\d{1,2}(?:\.\d)?)\s*°?\s*tilt/i);
      if (tiltMatches) {
        const tilt = parseFloat(tiltMatches[1]);
        if (tilt >= 0 && tilt <= 60) { // Realistic tilt range
          fields.push({
            label: "Roof Tilt (°)",
            value: tilt,
            confidence: 0.80,
            editable: true,
            key: "roofTilt",
            category: "site"
          });
        }
      }

      // Roof azimuth extraction
      const azimuthMatches = text.match(/(?:roof\s+)?azimuth[:\s]*(\d{1,3}(?:\.\d)?)\s*°?/i) ||
                            text.match(/(\d{1,3}(?:\.\d)?)\s*°?\s*azimuth/i) ||
                            text.match(/facing[:\s]*(north|south|east|west|n|s|e|w)/i);
      if (azimuthMatches) {
        let azimuth = 0;
        if (azimuthMatches[1].match(/north|n/i)) azimuth = 0;
        else if (azimuthMatches[1].match(/east|e/i)) azimuth = 90;
        else if (azimuthMatches[1].match(/south|s/i)) azimuth = 180;
        else if (azimuthMatches[1].match(/west|w/i)) azimuth = 270;
        else azimuth = parseFloat(azimuthMatches[1]);
        
        if (azimuth >= 0 && azimuth <= 360) {
          fields.push({
            label: "Roof Azimuth (°)",
            value: azimuth,
            confidence: 0.80,
            editable: true,
            key: "roofAzimuth",
            category: "site"
          });
        }
      }

      // Shading factor extraction
      const shadingMatches = text.match(/shading[:\s]*(\d{1,2}(?:\.\d)?)\s*%?/i);
      if (shadingMatches) {
        const shading = parseFloat(shadingMatches[1]);
        if (shading >= 0 && shading <= 100) {
          fields.push({
            label: "Shading (%)",
            value: shading,
            confidence: 0.75,
            editable: true,
            key: "shadingFactor",
            category: "site"
          });
        }
      }

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
          if (field.key === 'retailer' || field.key === 'plan' || field.key === 'address' || field.key === 'postcode') {
            (billData as any)[field.key] = field.value as string;
          } else {
            (billData as any)[field.key] = field.value as number;
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
        if (field.key === 'retailer' || field.key === 'plan' || field.key === 'address' || field.key === 'postcode') {
          (billData as any)[field.key] = field.value as string;
        } else {
          (billData as any)[field.key] = field.value as number;
        }
      });
      onExtraction(billData);
      
      return updated;
    });
  };

  const fieldsByCategory = {
    basic: extractedFields.filter(f => f.category === 'basic'),
    tou: extractedFields.filter(f => f.category === 'tou'),
    system: extractedFields.filter(f => f.category === 'system'),
    site: extractedFields.filter(f => f.category === 'site')
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
              <TabsList className="grid w-full grid-cols-4 bg-white/10 border border-white/20">
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
                <TabsTrigger value="site" className="data-[state=active]:bg-white/20 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Site Data
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
              
              <TabsContent value="site" className="space-y-4 mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {fieldsByCategory.site.map((field, index) => (
                    <FieldDisplay key={index} field={field} onEdit={(value) => handleFieldEdit(extractedFields.indexOf(field), value)} />
                  ))}
                </div>
                {fieldsByCategory.site.length > 0 && (
                  <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Home className="w-5 h-5 text-green-500" />
                      <h4 className="font-semibold">Site Information Detected</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Site details will be used for accurate shading analysis and energy modeling.
                    </p>
                  </div>
                )}
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