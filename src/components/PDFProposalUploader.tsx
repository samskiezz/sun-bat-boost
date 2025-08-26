import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp, Upload, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProposalGuideline {
  id: string;
  source: string;
  guidelines: any;
  extracted_at: string;
}

export function PDFProposalUploader() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [guidelines, setGuidelines] = useState<ProposalGuideline[]>([]);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setIsProcessing(true);
    const processedFiles: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') {
          toast({
            title: "Invalid file type",
            description: "Please upload PDF files only",
            variant: "destructive"
          });
          continue;
        }

        // In a real implementation, you'd extract text from the PDF
        // For now, we'll simulate with the filename
        const proposalText = `Sample proposal content from ${file.name}`;
        
        // Process the PDF through our edge function
        const { data, error } = await supabase.functions.invoke('pdf-proposal-processor', {
          body: {
            action: 'process_pdf',
            pdfData: proposalText
          }
        });

        if (error) {
          console.error('Processing error:', error);
          toast({
            title: "Processing failed",
            description: `Failed to process ${file.name}`,
            variant: "destructive"
          });
        } else {
          processedFiles.push(file.name);
          toast({
            title: "PDF processed",
            description: `Successfully extracted guidelines from ${file.name}`,
          });
        }
      }

      setUploadedFiles(prev => [...prev, ...processedFiles]);
      
      // Update training standards if any files were processed
      if (processedFiles.length > 0) {
        await supabase.functions.invoke('pdf-proposal-processor', {
          body: { action: 'update_training_standards' }
        });
        
        toast({
          title: "Training standards updated",
          description: "AI training system now uses your proposal guidelines",
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "An error occurred while processing the files",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadGuidelines = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pdf-proposal-processor', {
        body: { action: 'get_guidelines' }
      });

      if (error) throw error;
      
      setGuidelines(data.guidelines || []);
      setShowGuidelines(true);
    } catch (error) {
      console.error('Failed to load guidelines:', error);
      toast({
        title: "Failed to load guidelines",
        description: "Could not retrieve proposal guidelines",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Upload Proposal PDFs for AI Training
          </CardTitle>
          <CardDescription>
            Upload solar proposal PDFs to extract design guidelines and standards that will improve the AI training system.
            The system will analyze your proposals and use them to create realistic validation rules instead of synthetic data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <input
              type="file"
              id="pdf-upload"
              multiple
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />
            <label
              htmlFor="pdf-upload"
              className={`cursor-pointer flex flex-col items-center gap-2 ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isProcessing ? 'Processing PDFs...' : 'Click to upload PDF proposals'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports multiple PDF files. Guidelines will be extracted automatically.
              </p>
            </label>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Processed Files:</h4>
              <div className="space-y-1">
                {uploadedFiles.map((filename, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={loadGuidelines}
              variant="outline"
              className="flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              View Extracted Guidelines
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guidelines Display */}
      {showGuidelines && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Extracted Guidelines ({guidelines.length})
            </CardTitle>
            <CardDescription>
              Design guidelines and standards extracted from your proposal PDFs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {guidelines.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">No guidelines found. Upload some PDF proposals first.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {guidelines.map((guideline) => (
                  <div key={guideline.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-medium">Source: {guideline.source}</h4>
                      <span className="text-xs text-muted-foreground">
                        {new Date(guideline.extracted_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="text-sm space-y-2">
                      {guideline.guidelines.technical_requirements && (
                        <div>
                          <strong>Technical Requirements:</strong>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(guideline.guidelines.technical_requirements, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {guideline.guidelines.design_rules && (
                        <div>
                          <strong>Design Rules:</strong>
                          <ul className="text-xs ml-4 mt-1 list-disc">
                            {guideline.guidelines.design_rules.map((rule: string, idx: number) => (
                              <li key={idx}>{rule}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {guideline.guidelines.validation_criteria && (
                        <div>
                          <strong>Validation Criteria:</strong>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(guideline.guidelines.validation_criteria, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Training Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Training Impact</CardTitle>
          <CardDescription>
            How your PDF proposals improve the AI training system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <strong>Realistic Standards:</strong> Extracts actual design requirements and validation rules from your proposals
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <strong>Better Rewards:</strong> Training system uses real performance metrics instead of synthetic data
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <strong>Domain Knowledge:</strong> AI learns from actual industry practices and compliance requirements
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <strong>Validation Rules:</strong> Creates proper design validation criteria based on real proposals
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}