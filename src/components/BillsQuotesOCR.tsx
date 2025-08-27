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

interface ExtractedField {
  label: string;
  value: string | number;
  confidence: number;
  editable: boolean;
}

export const BillsQuotesOCR: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedField[]>([]);
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    // Simulate OCR processing
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      // Mock extracted data
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
    }, 2000);
  }, []);

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
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-medium mb-2">No Quote Data</h3>
                <p className="text-muted-foreground">
                  Upload a solar quote or proposal to extract system details
                </p>
              </div>
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