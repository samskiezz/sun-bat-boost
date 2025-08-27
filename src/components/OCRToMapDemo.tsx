import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, MapPin, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import OCRScanner from './OCRScanner';
import ComprehensiveShadeAnalyzer from './ComprehensiveShadeAnalyzer';

interface DemoState {
  step: 'upload' | 'processing' | 'mapping';
  extractedAddress?: string;
  extractedPostcode?: string;
  billData?: any;
}

export default function OCRToMapDemo() {
  const [state, setState] = useState<DemoState>({ step: 'upload' });
  const { toast } = useToast();

  const handleAddressExtracted = (address: string, postcode?: string) => {
    setState(prev => ({ 
      ...prev, 
      extractedAddress: address, 
      extractedPostcode: postcode,
      billData: {
        address,
        postcode,
        retailer: 'AGL', // Example data
      }
    }));

    toast({
      title: "Address Found!",
      description: `Extracted: ${address}${postcode ? ` (${postcode})` : ''}`,
    });

    // Auto-advance to mapping step
    setTimeout(() => {
      setState(prev => ({ ...prev, step: 'mapping' }));
    }, 1500);
  };

  const handleDataExtracted = (data: any) => {
    setState(prev => ({ ...prev, step: 'processing' }));
    
    // Simulate processing time
    setTimeout(() => {
      if (state.extractedAddress) {
        setState(prev => ({ ...prev, step: 'mapping' }));
      }
    }, 2000);
  };

  const renderUploadStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Upload Your Electricity Bill
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your electricity bill and watch as we automatically extract your service address 
            and populate it into the site analysis tool.
          </p>
          <OCRScanner 
            onDataExtracted={handleDataExtracted}
            onAddressExtracted={handleAddressExtracted}
          />
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderProcessingStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600 animate-pulse" />
            Processing Your Bill
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-yellow-300 border-t-yellow-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Analyzing document and extracting address...</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderMappingStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Address Extracted Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">{state.extractedAddress}</p>
                {state.extractedPostcode && (
                  <Badge variant="outline" className="mt-1">
                    {state.extractedPostcode}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Auto-populating site analyzer</span>
              <ArrowRight className="w-4 h-4" />
              <span>Map loading...</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Site Analysis with Auto-Populated Address
        </h3>
        
        <ComprehensiveShadeAnalyzer
          billData={state.billData}
          onFinalDataUpdate={(data) => {
            console.log('Final site data:', data);
            toast({
              title: "Site Analysis Complete",
              description: "Shading analysis completed with OCR-extracted address data.",
            });
          }}
        />
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">OCR to Map Integration Demo</h2>
        <p className="text-muted-foreground">
          See how we automatically extract addresses from bills and populate site analysis
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[
          { key: 'upload', label: 'Upload Bill', icon: FileText },
          { key: 'processing', label: 'Extract Data', icon: Zap },
          { key: 'mapping', label: 'Site Analysis', icon: MapPin }
        ].map(({ key, label, icon: Icon }, index) => {
          const isActive = state.step === key;
          const isCompleted = ['upload', 'processing'].indexOf(state.step) > ['upload', 'processing'].indexOf(key);
          
          return (
            <React.Fragment key={key}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                isActive ? 'bg-primary text-primary-foreground' : 
                isCompleted ? 'bg-green-100 text-green-800' : 
                'bg-muted text-muted-foreground'
              }`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              {index < 2 && (
                <ArrowRight className={`w-4 h-4 transition-colors ${
                  isCompleted ? 'text-green-600' : 'text-muted-foreground'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      {state.step === 'upload' && renderUploadStep()}
      {state.step === 'processing' && renderProcessingStep()}
      {state.step === 'mapping' && renderMappingStep()}

      {/* Reset Button */}
      {state.step === 'mapping' && (
        <div className="text-center pt-6">
          <Button 
            variant="outline" 
            onClick={() => setState({ step: 'upload' })}
          >
            Try Another Bill
          </Button>
        </div>
      )}
    </div>
  );
}