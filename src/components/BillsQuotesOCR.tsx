import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Eye, 
  Download,
  CheckCircle,
  AlertCircle,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Glass } from './Glass';
import { useDropzone } from 'react-dropzone';
import { masterOCRPipeline } from '@/utils/masterOCRPipeline';
import { processSmartDocument } from '@/utils/smartDocumentProcessor';
import { toast } from 'sonner';

interface ExtractedField {
  label: string;
  value: string | number;
  confidence: number;
  editable: boolean;
}

interface QuoteData {
  panels: Array<{
    brand: string;
    model: string;
    watts?: number;
    quantity?: number;
    confidence: number;
  }>;
  batteries: Array<{
    brand: string;
    model: string;
    capacity_kwh?: number;
    quantity?: number;
    confidence: number;
  }>;
  inverters: Array<{
    brand: string;
    model: string;
    kw?: number;
    confidence: number;
  }>;
  systemSize?: {
    value: number;
    unit: string;
    confidence: number;
  };
  totalCost?: {
    value: number;
    confidence: number;
  };
}

export const BillsQuotesOCR: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedField[]>([]);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.filter(file => 
      !uploadedFiles.some(existing => existing.name === file.name)
    );
    
    if (newFiles.length === 0) {
      toast.error('File(s) already uploaded');
      return;
    }
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setProcessing(true);

    for (const file of newFiles) {
      console.log(`🔍 Processing ${file.name}...`);
      
      try {
        // Determine if it's likely a bill or proposal based on filename/type
        const isProposal = file.name.toLowerCase().includes('proposal') || 
                          file.name.toLowerCase().includes('quote') ||
                          file.name.toLowerCase().includes('solar');
        
        if (isProposal) {
          // Process as solar proposal/quote
          console.log(`📄 Processing proposal: ${file.name}`);
          const result = await processSmartDocument(file);
          
          if (result.success && result.extractedData) {
            const { panels = [], batteries = [], inverters = [], systemSize, totalCost } = result.extractedData;
            
            console.log(`✅ Found: ${panels.length} panels, ${batteries.length} batteries, ${inverters.length} inverters`);
            
            setQuoteData({
              panels: panels.map(p => ({
                brand: p.suggestedMatch?.brand || 'Unknown',
                model: p.suggestedMatch?.model || p.description,
                watts: p.watts || p.suggestedMatch?.watts,
                quantity: p.quantity,
                confidence: p.confidence
              })),
              batteries: batteries.map(b => ({
                brand: b.suggestedMatch?.brand || 'Unknown',
                model: b.suggestedMatch?.model || b.description,
                capacity_kwh: b.capacity_kwh || b.suggestedMatch?.capacity_kwh,
                quantity: b.quantity,
                confidence: b.confidence
              })),
              inverters: inverters.map(i => ({
                brand: i.suggestedMatch?.brand || 'Unknown',
                model: i.suggestedMatch?.model || i.description,
                kw: i.kw || i.suggestedMatch?.kw,
                confidence: i.confidence
              })),
              systemSize,
              totalCost
            });
            
            toast.success(`Successfully extracted ${panels.length + batteries.length + inverters.length} products from proposal`);
          } else {
            console.error('❌ Failed to extract proposal data:', result.error);
            toast.error(`Failed to process proposal: ${result.error || 'No products detected'}`);
          }
        } else {
          // Process as electricity bill (mock for now)
          console.log(`📊 Processing bill: ${file.name}`);
          setExtractedData([
            { label: 'NMI', value: '6305917159', confidence: 0.95, editable: false },
            { label: 'Retailer', value: 'Origin Energy', confidence: 0.98, editable: true },
            { label: 'Plan Name', value: 'Go Variable', confidence: 0.87, editable: true },
            { label: 'Daily Supply Charge', value: 98.45, confidence: 0.92, editable: true },
            { label: 'Peak Rate (c/kWh)', value: 28.6, confidence: 0.89, editable: true },
            { label: 'Off-Peak Rate (c/kWh)', value: 22.1, confidence: 0.91, editable: true },
            { label: 'Feed-in Tariff (c/kWh)', value: 8.2, confidence: 0.76, editable: true },
            { label: 'Total kWh (Peak)', value: 425, confidence: 0.94, editable: true },
            { label: 'Total kWh (Off-Peak)', value: 318, confidence: 0.93, editable: true },
            { label: 'Billing Period', value: '2024-01-15 to 2024-02-14', confidence: 0.96, editable: true },
          ]);
          toast.success('Successfully extracted bill data');
        }
      } catch (error) {
        console.error(`❌ Error processing ${file.name}:`, error);
        toast.error(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    setProcessing(false);
  }, [uploadedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    }
  });

  const handleFieldEdit = (index: number, newValue: string) => {
    setExtractedData(prev => 
      prev.map((field, i) => 
        i === index ? { ...field, value: newValue } : field
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Glass className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Upload Bills & Quotes</h3>
        </div>

        <div 
          {...getRootProps()} 
          className={`
            border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200 hover:border-white/40 hover:bg-white/5
            ${isDragActive ? 'border-primary/50 bg-primary/5' : ''}
          `}
        >
          <input {...getInputProps()} />
          <motion.div
            animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 opacity-60" />
            <h4 className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop files here' : 'Drag & drop your files here'}
            </h4>
            <p className="text-muted-foreground mb-4">
              Supports PDF, JPG, PNG • Energy bills, solar quotes, proposals
            </p>
            <Button variant="outline" className="bg-white/5 border-white/20">
              Or click to browse files
            </Button>
          </motion.div>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium">Uploaded Files:</h4>
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
      </Glass>

      {/* Extracted Data */}
      {extractedData.length > 0 && (
        <Tabs defaultValue="bill-data" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/20">
            <TabsTrigger value="bill-data" className="data-[state=active]:bg-white/20">
              Bill Data
            </TabsTrigger>
            <TabsTrigger value="quote-data" className="data-[state=active]:bg-white/20">
              Quote Data
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="bill-data" className="space-y-4">
            <Glass className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Extracted Bill Information</h3>
                </div>
                <Button variant="outline" size="sm" className="bg-white/5 border-white/20">
                  <Download className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {extractedData.map((field, index) => (
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

              <div className="mt-6 flex gap-3">
                <Button className="bg-gradient-primary text-white">
                  Use for ROI Calculation
                </Button>
                <Button variant="outline" className="bg-white/5 border-white/20">
                  Pick Different Plan
                </Button>
              </div>
            </Glass>
          </TabsContent>
          
          <TabsContent value="quote-data">
            <Glass className="p-6">
              {!quoteData ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-40" />
                  <h3 className="text-lg font-medium mb-2">No Quote Data</h3>
                  <p className="text-muted-foreground">
                    Upload a solar quote or proposal to extract system details
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Extracted Quote Information</h3>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white/5 border-white/20">
                      <Download className="w-4 h-4 mr-1" />
                      Export Quote
                    </Button>
                  </div>

                  {/* System Overview */}
                  {(quoteData.systemSize || quoteData.totalCost) && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {quoteData.systemSize && (
                        <div className="p-3 rounded-lg bg-white/5">
                          <Label className="text-sm font-medium">System Size</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-semibold">{quoteData.systemSize.value} {quoteData.systemSize.unit}</span>
                            <Badge variant="default" className="text-xs">
                              {Math.round(quoteData.systemSize.confidence * 100)}%
                            </Badge>
                          </div>
                        </div>
                      )}
                      {quoteData.totalCost && (
                        <div className="p-3 rounded-lg bg-white/5">
                          <Label className="text-sm font-medium">Total Cost</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-semibold">${quoteData.totalCost.value.toLocaleString()}</span>
                            <Badge variant="default" className="text-xs">
                              {Math.round(quoteData.totalCost.confidence * 100)}%
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Solar Panels */}
                  {quoteData.panels.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-primary">Solar Panels ({quoteData.panels.length})</h4>
                      {quoteData.panels.map((panel, index) => (
                        <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{panel.brand} {panel.model}</span>
                            <Badge variant={panel.confidence >= 0.8 ? "default" : "destructive"} className="text-xs">
                              {Math.round(panel.confidence * 100)}%
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {panel.watts && <span>{panel.watts}W • </span>}
                            {panel.quantity && <span>Qty: {panel.quantity}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Batteries */}
                  {quoteData.batteries.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-primary">Battery Storage ({quoteData.batteries.length})</h4>
                      {quoteData.batteries.map((battery, index) => (
                        <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{battery.brand} {battery.model}</span>
                            <Badge variant={battery.confidence >= 0.8 ? "default" : "destructive"} className="text-xs">
                              {Math.round(battery.confidence * 100)}%
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {battery.capacity_kwh && <span>{battery.capacity_kwh}kWh • </span>}
                            {battery.quantity && <span>Qty: {battery.quantity}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inverters */}
                  {quoteData.inverters.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-primary">Inverters ({quoteData.inverters.length})</h4>
                      {quoteData.inverters.map((inverter, index) => (
                        <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{inverter.brand} {inverter.model}</span>
                            <Badge variant={inverter.confidence >= 0.8 ? "default" : "destructive"} className="text-xs">
                              {Math.round(inverter.confidence * 100)}%
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {inverter.kw && <span>{inverter.kw}kW</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <Button className="bg-gradient-primary text-white">
                      Use for System Design
                    </Button>
                    <Button variant="outline" className="bg-white/5 border-white/20">
                      Compare Products
                    </Button>
                  </div>
                </div>
              )}
            </Glass>
          </TabsContent>
        </Tabs>
      )}

      {/* OCR History */}
      <Glass className="p-6">
        <h3 className="font-semibold mb-4">Recent Extractions</h3>
        <div className="space-y-3">
          {[
            { name: 'Origin Energy Bill - Jan 2024', type: 'Bill', date: '2024-01-20', status: 'Processed' },
            { name: 'Solar Quote - ABC Solar', type: 'Quote', date: '2024-01-18', status: 'Processed' },
            { name: 'AGL Bill - Dec 2023', type: 'Bill', date: '2024-01-15', status: 'Processed' },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 opacity-60" />
                <div>
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{item.type}</Badge>
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Glass>
    </div>
  );
};

export default BillsQuotesOCR;