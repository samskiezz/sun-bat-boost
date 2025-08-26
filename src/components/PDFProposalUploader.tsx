import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UploadedGuideline {
  id: string;
  source: string;
  extracted_at: string;
  guidelines: any;
}

const PDFProposalUploader: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [guidelines, setGuidelines] = useState<UploadedGuideline[]>([]);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF file",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Convert PDF to text (simplified - in real implementation would use PDF.js)
      const reader = new FileReader();
      reader.onload = async (e) => {
        const pdfText = e.target?.result as string;
        
        setProgress(30);
        
        // Process with edge function
        const { data, error } = await supabase.functions.invoke('pdf-proposal-processor', {
          body: {
            action: 'process_pdf',
            pdfData: pdfText
          }
        });

        setProgress(70);

        if (error) {
          throw error;
        }

        if (!data.success) {
          throw new Error(data.error || 'Processing failed');
        }

        setProgress(100);
        
        toast({
          title: "PDF Processed Successfully",
          description: `Extracted guidelines from ${file.name}`,
        });

        // Refresh guidelines list
        await loadGuidelines();
        
      };
      
      reader.readAsText(file); // Simplified - real implementation would extract text from PDF
      
    } catch (error) {
      console.error('PDF processing error:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process PDF",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const loadGuidelines = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pdf-proposal-processor', {
        body: { action: 'get_guidelines' }
      });

      if (error) throw error;
      
      setGuidelines(data.guidelines || []);
    } catch (error) {
      console.error('Failed to load guidelines:', error);
    }
  };

  const updateTrainingStandards = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('pdf-proposal-processor', {
        body: { action: 'update_training_standards' }
      });

      if (error) throw error;

      toast({
        title: "Training Standards Updated",
        description: "AI training system now uses your proposal guidelines",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update training standards",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    loadGuidelines();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          PDF Proposal Guidelines Uploader
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload real solar proposal PDFs to extract design guidelines and improve AI training accuracy.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
          <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          
          {isProcessing ? (
            <div className="space-y-3">
              <p className="text-sm">Processing PDF proposal...</p>
              <Progress value={progress} className="w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Drop a PDF proposal here or click to browse
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose PDF File
                </label>
              </Button>
            </div>
          )}
        </div>

        {/* Guidelines Summary */}
        {guidelines.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Extracted Guidelines ({guidelines.length})</h3>
              <Button 
                onClick={updateTrainingStandards}
                disabled={isProcessing}
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Update Training Standards
              </Button>
            </div>
            
            <div className="grid gap-2">
              {guidelines.slice(0, 5).map((guideline) => (
                <div key={guideline.id} className="flex items-center gap-2 p-2 border rounded text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{guideline.source}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(guideline.extracted_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
              
              {guidelines.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  ... and {guidelines.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium">How this improves training:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Extracts real design standards from your proposals</li>
                <li>Creates validation rules based on actual requirements</li>
                <li>Fixes the "self-rewarding" problem by using real criteria</li>
                <li>Improves OCR accuracy with real document patterns</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFProposalUploader;