import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Camera, 
  FileText, 
  MapPin, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Scan,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Tesseract from 'tesseract.js';

interface AddressOCRScannerProps {
  onAddressDetected: (address: string) => void;
  className?: string;
}

export const AddressOCRScanner: React.FC<AddressOCRScannerProps> = ({
  onAddressDetected,
  className = ''
}) => {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [detectedAddresses, setDetectedAddresses] = useState<string[]>([]);
  const [ocrProgress, setOcrProgress] = useState(0);

  // Australian address patterns
  const ADDRESS_PATTERNS = [
    // Full address with postcode
    /(\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Way|Crescent|Cres|Circuit|Cct|Close|Cl|Parade|Pde|Terrace|Tce|Boulevard|Blvd)[A-Za-z\s,]*[A-Z]{2,3}\s+\d{4})/gi,
    // Street address without state/postcode
    /(\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Way|Crescent|Cres|Circuit|Cct|Close|Cl|Parade|Pde|Terrace|Tce|Boulevard|Blvd))/gi,
    // Unit/apartment addresses
    /(?:Unit|Apt|U)\s*\d+[\/\-\s]*(\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Way))/gi,
    // PO Box addresses
    /(P\.?O\.?\s*Box\s+\d+[A-Za-z\s,]*[A-Z]{2,3}\s+\d{4})/gi
  ];

  const extractAddresses = useCallback((text: string): string[] => {
    const addresses: string[] = [];
    
    ADDRESS_PATTERNS.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.trim().replace(/\s+/g, ' ');
          if (cleaned.length > 10 && !addresses.includes(cleaned)) {
            addresses.push(cleaned);
          }
        });
      }
    });

    // Also look for postcodes with surrounding text
    const postcodePattern = /([A-Za-z\s,]+[A-Z]{2,3}\s+(\d{4}))/g;
    let postcodeMatch;
    while ((postcodeMatch = postcodePattern.exec(text)) !== null) {
      const fullMatch = postcodeMatch[0].trim();
      if (fullMatch.length > 15 && !addresses.some(addr => addr.includes(fullMatch))) {
        addresses.push(fullMatch);
      }
    }

    return addresses.slice(0, 5); // Limit to 5 results
  }, []);

  const processOCR = useCallback(async (imageFile: File) => {
    setIsScanning(true);
    setOcrProgress(0);
    setDetectedAddresses([]);

    try {
      const result = await Tesseract.recognize(imageFile, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      const extractedText = result.data.text;
      console.log('OCR Text:', extractedText);

      const addresses = extractAddresses(extractedText);
      
      if (addresses.length > 0) {
        setDetectedAddresses(addresses);
        toast({
          title: "Addresses Detected! 🎯",
          description: `Found ${addresses.length} potential address${addresses.length > 1 ? 'es' : ''}`
        });
      } else {
        toast({
          title: "No Addresses Found",
          description: "Try uploading a clearer image with visible address text",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('OCR Error:', error);
      toast({
        title: "OCR Processing Failed",
        description: "Please try again with a clearer image",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
      setOcrProgress(0);
    }
  }, [extractAddresses, toast]);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }

    await processOCR(file);
  }, [processOCR, toast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const selectAddress = useCallback((address: string) => {
    onAddressDetected(address);
    setDetectedAddresses([]);
    toast({
      title: "Address Selected",
      description: address
    });
  }, [onAddressDetected, toast]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* OCR Upload Area */}
      <Card className="relative overflow-hidden">
        <div
          className={`p-6 border-2 border-dashed transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <div className="mb-4">
              {isScanning ? (
                <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
              ) : (
                <div className="flex justify-center gap-2">
                  <Scan className="w-8 h-8 text-primary" />
                  <Camera className="w-8 h-8 text-secondary" />
                  <FileText className="w-8 h-8 text-accent" />
                </div>
              )}
            </div>
            
            <h3 className="text-lg font-semibold mb-2">
              {isScanning ? 'Scanning Document...' : 'Auto-Detect Address from Document'}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-4">
              {isScanning 
                ? `Processing image... ${ocrProgress}%`
                : 'Upload electricity bill, rental agreement, or any document with your address'
              }
            </p>

            {isScanning ? (
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="ocr-upload"
                  disabled={isScanning}
                />
                
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={() => document.getElementById('ocr-upload')?.click()}
                    disabled={isScanning}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      // Camera capture would go here in a full implementation
                      toast({
                        title: "Camera Feature",
                        description: "Camera capture coming soon! Please upload an image for now.",
                      });
                    }}
                    variant="outline"
                    disabled={isScanning}
                    className="gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Take Photo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Detected Addresses */}
      <AnimatePresence>
        {detectedAddresses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <h4 className="font-medium">Detected Addresses</h4>
                <Badge variant="secondary">{detectedAddresses.length} found</Badge>
              </div>
              
              <div className="space-y-2">
                {detectedAddresses.map((address, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-sm">{address}</span>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => selectAddress(address)}
                      className="gap-1"
                    >
                      Select
                    </Button>
                  </motion.div>
                ))}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetectedAddresses([])}
                className="mt-2 gap-1"
              >
                <X className="w-3 h-3" />
                Clear Results
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddressOCRScanner;