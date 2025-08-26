import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, FolderOpen, Zap, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UploadedGuideline {
  id: string;
  source: string;
  extracted_at: string;
  guidelines: any;
}

interface ProcessingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  uploadedPath?: string;
}

const PDFProposalUploader: React.FC = () => {
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  const [guidelines, setGuidelines] = useState<UploadedGuideline[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Real-time updates for guidelines
  useEffect(() => {
    loadGuidelines();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('proposal-guidelines-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proposal_guidelines'
        },
        () => {
          loadGuidelines();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const validateFiles = (files: FileList | File[]): File[] => {
    const validFiles: File[] = [];
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a PDF file`,
          variant: "destructive"
        });
        continue;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "File too large",
          description: `${file.name} exceeds 50MB limit`,
          variant: "destructive"
        });
        continue;
      }
      
      validFiles.push(file);
    }
    
    return validFiles;
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    
    // Initialize processing files state
    const initialProcessingFiles: ProcessingFile[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));
    
    setProcessingFiles(initialProcessingFiles);
    
    // Process files in batches of 5
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      const batchPromises = batch.map((file, batchIndex) => 
        processFile(file, files.indexOf(file))
      );
      
      try {
        await Promise.all(batchPromises);
      } catch (error) {
        console.error('Batch processing error:', error);
      }
    }
    
    setIsProcessing(false);
    
    const completedCount = processingFiles.filter(f => f.status === 'completed').length;
    toast({
      title: "Bulk Processing Complete",
      description: `Successfully processed ${completedCount} of ${files.length} PDF proposals`,
    });
  };

  const processFile = async (file: File, index: number) => {
    try {
      // Update status to uploading
      setProcessingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'uploading', progress: 10 } : f
      ));

      // Upload to storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdf-proposals')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update progress
      setProcessingFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'processing', 
          progress: 40,
          uploadedPath: uploadData.path
        } : f
      ));

      // Get signed URL for processing
      const { data: urlData } = await supabase.storage
        .from('pdf-proposals')
        .createSignedUrl(uploadData.path, 3600);

      if (!urlData?.signedUrl) {
        throw new Error('Failed to get signed URL');
      }

      // Process with edge function
      const { data, error } = await supabase.functions.invoke('pdf-proposal-processor', {
        body: {
          action: 'process_pdf_from_storage',
          filePath: uploadData.path,
          fileName: file.name,
          signedUrl: urlData.signedUrl
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Processing failed');
      }

      // Update to completed
      setProcessingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'completed', progress: 100 } : f
      ));

    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      
      setProcessingFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Processing failed'
        } : f
      ));
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        processFiles(validFiles);
      }
    }
    // Reset input
    event.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        processFiles(validFiles);
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const removeFile = (index: number) => {
    setProcessingFiles(prev => prev.filter((_, i) => i !== index));
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

  const getStatusIcon = (status: ProcessingFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
      case 'uploading':
        return <Zap className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bulk PDF Proposal Uploader
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload multiple solar proposal PDFs at once (up to 50+). Drag and drop or click to select files.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Bulk Upload Zone */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : isProcessing 
                ? 'border-gray-300 bg-gray-50' 
                : 'border-muted hover:border-primary/50 hover:bg-muted/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isProcessing ? (
            <div className="space-y-4">
              <Zap className="h-12 w-12 mx-auto text-blue-500 animate-pulse" />
              <div>
                <p className="font-medium">Processing {processingFiles.length} PDF proposals...</p>
                <p className="text-sm text-muted-foreground">
                  Completed: {processingFiles.filter(f => f.status === 'completed').length} | 
                  Failed: {processingFiles.filter(f => f.status === 'error').length}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="flex items-center gap-4">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <FolderOpen className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Drop PDF proposals here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Select multiple files to upload in bulk. Supports up to 50MB per file.
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  id="bulk-pdf-upload"
                />
                <Button asChild variant="outline" size="lg">
                  <label htmlFor="bulk-pdf-upload" className="cursor-pointer">
                    <Upload className="h-5 w-5 mr-2" />
                    Select Multiple PDFs
                  </label>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Processing Files List */}
        {processingFiles.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Processing Queue ({processingFiles.length} files)</CardTitle>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto space-y-2">
              {processingFiles.map((fileInfo, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getStatusIcon(fileInfo.status)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{fileInfo.file.name}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={fileInfo.progress} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground min-w-fit">
                        {fileInfo.progress}%
                      </span>
                    </div>
                    {fileInfo.status === 'error' && fileInfo.error && (
                      <p className="text-xs text-red-500 mt-1">{fileInfo.error}</p>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    disabled={fileInfo.status === 'uploading' || fileInfo.status === 'processing'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Guidelines Summary */}
        {guidelines.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Extracted Guidelines ({guidelines.length} proposals processed)
              </h3>
              <Button 
                onClick={updateTrainingStandards}
                disabled={isProcessing}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply to Training System
              </Button>
            </div>
            
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {guidelines.map((guideline) => (
                <div key={guideline.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <FileText className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{guideline.source}</p>
                    <p className="text-xs text-muted-foreground">
                      Extracted {new Date(guideline.extracted_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900">Bulk Upload Benefits:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Process 50+ proposals simultaneously with parallel upload</li>
                <li>Automatic text extraction and guideline synthesis</li>
                <li>Real-time progress tracking for each file</li>
                <li>Integrates directly with multi-task AI training system</li>
                <li>Builds comprehensive training dataset from your real proposals</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFProposalUploader;